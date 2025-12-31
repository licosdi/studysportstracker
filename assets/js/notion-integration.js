// Notion Integration for Study Tracker - Backend API Version
class NotionIntegration {
    constructor(studyTracker) {
        this.studyTracker = studyTracker;
        this.notionToken = null;
        this.databaseId = null;
        this.isConnected = false;
        this.autoSync = true;
        this.syncOnTimerComplete = true;

        this.init();
    }

    async init() {
        await this.loadConfig();
        this.setupEventListeners();
        this.updateUI();
    }

    async loadConfig() {
        try {
            const config = await api.getNotionConfigFull();
            if (config) {
                this.notionToken = config.token;
                this.databaseId = config.database_id;
                this.autoSync = config.auto_sync !== 0;
                this.syncOnTimerComplete = config.sync_on_timer_complete !== 0;
                this.isConnected = !!(this.notionToken && this.databaseId);
            }
        } catch (error) {
            console.error('Error loading Notion config:', error);
            this.isConnected = false;
        }
    }

    async saveConfig() {
        try {
            await api.saveNotionConfig({
                token: this.notionToken,
                databaseId: this.databaseId,
                autoSync: this.autoSync,
                syncOnTimerComplete: this.syncOnTimerComplete
            });
        } catch (error) {
            console.error('Error saving Notion config:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Connect button
        document.getElementById('connect-notion-btn')?.addEventListener('click', () => {
            document.querySelector('.notion-setup').style.display =
                document.querySelector('.notion-setup').style.display === 'none' ? 'block' : 'block';
        });

        // Save configuration
        document.getElementById('save-notion-config')?.addEventListener('click', () => {
            this.connect();
        });

        // Disconnect
        document.getElementById('disconnect-notion-btn')?.addEventListener('click', () => {
            this.disconnect();
        });

        // Sync now
        document.getElementById('sync-now-btn')?.addEventListener('click', () => {
            this.syncAllSessions();
        });

        // Settings checkboxes
        document.getElementById('auto-sync')?.addEventListener('change', (e) => {
            this.autoSync = e.target.checked;
            this.saveConfig();
        });

        document.getElementById('sync-on-timer-complete')?.addEventListener('change', (e) => {
            this.syncOnTimerComplete = e.target.checked;
            this.saveConfig();
        });
    }

    async connect() {
        const token = document.getElementById('notion-token').value.trim();
        const databaseId = document.getElementById('notion-database-id').value.trim();

        if (!token || !token.startsWith('secret_')) {
            this.showSyncStatus('error', 'Invalid Notion token. Must start with "secret_"');
            return;
        }

        if (!databaseId || databaseId.length < 20) {
            this.showSyncStatus('error', 'Invalid Database ID. Check your Notion database URL.');
            return;
        }

        this.notionToken = token;
        this.databaseId = databaseId;
        this.isConnected = true;

        try {
            await this.saveConfig();
            this.updateUI();
            this.showSyncStatus('success', 'Notion connected successfully!');

            // Test connection
            this.testConnection();
        } catch (error) {
            this.showSyncStatus('error', 'Failed to save Notion configuration.');
            this.isConnected = false;
        }
    }

    async disconnect() {
        if (confirm('Are you sure you want to disconnect from Notion?')) {
            try {
                await api.deleteNotionConfig();
                this.notionToken = null;
                this.databaseId = null;
                this.isConnected = false;
                this.updateUI();
                this.showSyncStatus('info', 'Disconnected from Notion');
            } catch (error) {
                this.showSyncStatus('error', 'Failed to disconnect from Notion.');
            }
        }
    }

    updateUI() {
        const connectedDiv = document.getElementById('notion-connected');
        const disconnectedDiv = document.getElementById('notion-disconnected');

        if (this.isConnected) {
            connectedDiv.style.display = 'block';
            disconnectedDiv.style.display = 'none';
            document.getElementById('notion-token').value = this.notionToken || '';
            document.getElementById('notion-database-id').value = this.databaseId || '';
        } else {
            connectedDiv.style.display = 'none';
            disconnectedDiv.style.display = 'block';
        }

        // Update settings checkboxes
        const autoSyncCheckbox = document.getElementById('auto-sync');
        const syncOnTimerCheckbox = document.getElementById('sync-on-timer-complete');
        if (autoSyncCheckbox) autoSyncCheckbox.checked = this.autoSync;
        if (syncOnTimerCheckbox) syncOnTimerCheckbox.checked = this.syncOnTimerComplete;
    }

    async testConnection() {
        try {
            const response = await fetch(`https://api.notion.com/v1/databases/${this.databaseId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.notionToken}`,
                    'Notion-Version': '2022-06-28'
                }
            });

            if (response.ok) {
                const data = await response.json();
                document.getElementById('notion-database-name').textContent =
                    `Database: ${data.title?.[0]?.plain_text || 'Study Sessions'}`;
                this.showSyncStatus('success', 'Connection verified!');
            } else {
                throw new Error('Connection failed');
            }
        } catch (error) {
            this.showSyncStatus('error', 'Failed to connect. Check your token and database ID.');
        }
    }

    async syncSession(session) {
        if (!this.isConnected || !this.autoSync) return;

        try {
            // Determine category
            const igcseSubjects = ['Math', 'English', 'Physics', 'Psychology', 'Business', 'Geography'];
            const category = session.category === 'igcse' || igcseSubjects.includes(session.subject)
                ? 'IGCSE Prep'
                : 'General Learning';

            const response = await fetch('https://api.notion.com/v1/pages', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.notionToken}`,
                    'Content-Type': 'application/json',
                    'Notion-Version': '2022-06-28'
                },
                body: JSON.stringify({
                    parent: { database_id: this.databaseId },
                    properties: {
                        'Date': {
                            date: {
                                start: new Date(session.date).toISOString().split('T')[0]
                            }
                        },
                        'Subject': {
                            title: [
                                {
                                    text: {
                                        content: session.subject
                                    }
                                }
                            ]
                        },
                        'Duration': {
                            number: session.duration
                        },
                        'Category': {
                            select: {
                                name: category
                            }
                        }
                    }
                })
            });

            if (response.ok) {
                return true;
            } else {
                const error = await response.json();
                console.error('Notion sync error:', error);
                return false;
            }
        } catch (error) {
            console.error('Failed to sync to Notion:', error);
            return false;
        }
    }

    async syncAllSessions() {
        if (!this.isConnected) {
            this.showSyncStatus('error', 'Not connected to Notion');
            return;
        }

        this.showSyncStatus('info', 'Syncing sessions to Notion...');

        const sessions = this.studyTracker.sessions;
        let successCount = 0;
        let failCount = 0;

        for (const session of sessions) {
            const success = await this.syncSession(session);
            if (success) {
                successCount++;
            } else {
                failCount++;
            }
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (failCount === 0) {
            this.showSyncStatus('success', `Successfully synced ${successCount} sessions to Notion!`);
        } else {
            this.showSyncStatus('error', `Synced ${successCount} sessions, ${failCount} failed.`);
        }
    }

    showSyncStatus(type, message) {
        const statusDiv = document.getElementById('sync-status');
        const messageP = document.getElementById('sync-message');

        if (!statusDiv || !messageP) return;

        statusDiv.style.display = 'block';
        statusDiv.className = `sync-status sync-${type}`;
        messageP.textContent = message;

        // Auto-hide after 5 seconds
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }

    // Called when a new session is created
    onSessionCreated(session) {
        if (this.isConnected && this.autoSync) {
            this.syncSession(session);
        }
    }

    // Called when timer completes
    onTimerComplete(session) {
        if (this.isConnected && this.syncOnTimerComplete) {
            this.syncSession(session);
        }
    }
}
