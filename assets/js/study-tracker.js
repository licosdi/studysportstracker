// Study Tracker Application
class StudyTracker {
    constructor() {
        this.sessions = this.loadSessions();
        this.currentTimer = null;
        this.timerInterval = null;
        // Timer state for IGCSE
        this.igcseTimeRemaining = 45 * 60;
        this.igcseBreakTimeRemaining = 5 * 60;
        this.igcseIsRunning = false;
        this.igcseIsPaused = false;
        this.igcseIsBreak = false;
        this.igcseCurrentSubject = '';
        this.igcseTimerDuration = 45;
        this.igcseTimerInterval = null;

        // Timer state for General Learning
        this.generalTimeRemaining = 45 * 60;
        this.generalBreakTimeRemaining = 5 * 60;
        this.generalIsRunning = false;
        this.generalIsPaused = false;
        this.generalIsBreak = false;
        this.generalCurrentSubject = '';
        this.generalTimerDuration = 45;
        this.generalTimerInterval = null;

        this.currentTimerCategory = 'igcse'; // Which timer is active
        this.currentCategory = 'igcse'; // 'igcse' or 'general'
        this.currentViewMode = 'table'; // 'table', 'cards', 'bars', 'pie'
        this.igcseSubjects = ['Math', 'English', 'Physics', 'Psychology', 'Business', 'Geography'];
        this.currentUser = null;
        this.notionIntegration = null;
        this.customIgcsePresets = this.loadCustomPresets('igcse');
        this.customGeneralPresets = this.loadCustomPresets('general');
        this.plannerTasks = this.loadPlannerTasks();
        this.currentWeekStart = this.getWeekStart(new Date());
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuth();
        this.updateManualSubjectDropdown(); // Initialize dropdown
        this.updateTimerSubjectDropdowns(); // Initialize timer dropdowns
        this.renderDashboard();
        this.updateSummary();
        this.populateSubjectFilter();
        this.initializeTimerCircle('igcse');
        this.initializeTimerCircle('general');
        this.updateTimerDisplay('igcse');
        this.updateTimerDisplay('general');
        
        // Initialize Notion integration after DOM is ready
        if (typeof NotionIntegration !== 'undefined') {
            this.notionIntegration = new NotionIntegration(this);
        }
    }

    // Local Storage Management
    loadSessions() {
        const stored = localStorage.getItem('studySessions');
        return stored ? JSON.parse(stored) : [];
    }

    saveSessions() {
        localStorage.setItem('studySessions', JSON.stringify(this.sessions));
    }

    loadCustomPresets(category) {
        const stored = localStorage.getItem(`customPresets_${category}`);
        return stored ? JSON.parse(stored) : [];
    }

    saveCustomPresets(category, presets) {
        localStorage.setItem(`customPresets_${category}`, JSON.stringify(presets));
    }

    loadPlannerTasks() {
        const stored = localStorage.getItem('plannerTasks');
        return stored ? JSON.parse(stored) : [];
    }

    savePlannerTasks() {
        localStorage.setItem('plannerTasks', JSON.stringify(this.plannerTasks));
    }

    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
        return new Date(d.setDate(diff));
    }

    formatWeekDate(date) {
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    addCustomPreset(subject, category) {
        if (category === 'igcse') {
            if (!this.customIgcsePresets.includes(subject)) {
                this.customIgcsePresets.push(subject);
                this.saveCustomPresets('igcse', this.customIgcsePresets);
            }
        } else {
            if (!this.customGeneralPresets.includes(subject)) {
                this.customGeneralPresets.push(subject);
                this.saveCustomPresets('general', this.customGeneralPresets);
            }
        }
        this.updateManualSubjectDropdown();
        this.updateTimerSubjectDropdowns();
    }

    // Navigation
    setupEventListeners() {
        // Navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });


        // Dashboard filters
        document.getElementById('subject-filter').addEventListener('change', () => this.renderDashboard());
        document.getElementById('date-range-filter').addEventListener('change', () => this.renderDashboard());
        document.getElementById('clear-filters').addEventListener('click', () => this.clearFilters());

        // Manual log form
        document.getElementById('manual-log-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.logManualSession();
        });

        document.getElementById('manual-subject').addEventListener('change', (e) => {
            if (e.target.value === 'Other') {
                document.getElementById('manual-custom-subject').style.display = 'block';
            } else {
                document.getElementById('manual-custom-subject').style.display = 'none';
            }
        });

        // Dashboard category tabs
        document.querySelectorAll('.dashboard-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                this.switchCategory(category);
            });
        });

        // View mode buttons
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const viewMode = e.target.closest('.view-mode-btn').dataset.view;
                this.switchViewMode(viewMode);
            });
        });

        // Set default datetime to now
        this.setDefaultDateTime();

        // Account/Auth event listeners
        this.setupAuthListeners();

        // Planner event listeners
        this.setupPlannerListeners();
    }

    setupAuthListeners() {
        // Auth tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const authType = e.target.dataset.auth;
                this.switchAuthTab(authType);
            });
        });

        // Login form
        document.getElementById('login-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Signup form
        document.getElementById('signup-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.signup();
        });

        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            this.logout();
        });
    }

    checkAuth() {
        const user = localStorage.getItem('currentUser');
        if (user) {
            this.currentUser = JSON.parse(user);
            this.showUserDashboard();
        } else {
            this.showAuthSection();
        }
    }

    switchAuthTab(authType) {
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.auth === authType);
        });
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.toggle('active', form.id === `${authType}-form`);
        });
    }

    login() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        // localStorage mode - simple validation
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.email === email);

        if (user && user.password === password) {
            this.currentUser = { name: user.name, email: user.email };
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            this.showUserDashboard();
        } else {
            alert('Invalid credentials. Please sign up to create an account.');
        }
    }

    signup() {
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;

        if (password.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }

        const users = JSON.parse(localStorage.getItem('users') || '[]');

        if (users.find(u => u.email === email)) {
            alert('Email already registered. Please login instead.');
            return;
        }

        users.push({ name, email, password });
        localStorage.setItem('users', JSON.stringify(users));

        this.currentUser = { name, email };
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        this.showUserDashboard();
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.showAuthSection();
        this.switchView('dashboard');
    }

    showUserDashboard() {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('user-dashboard').style.display = 'block';
        document.getElementById('user-name').textContent = this.currentUser.name;
        document.getElementById('account-icon').textContent = '✅';
    }

    showAuthSection() {
        document.getElementById('auth-section').style.display = 'block';
        document.getElementById('user-dashboard').style.display = 'none';
        document.getElementById('account-icon').textContent = '👤';
    }

    switchView(viewName) {
        // Update navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });

        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.toggle('active', view.id === `${viewName}-view`);
        });

        // Set default datetime when switching to dashboard
        if (viewName === 'dashboard') {
            this.setDefaultDateTime();
            this.populateSubjectFilter();
        }

        // Initialize planner when switching to planner view
        if (viewName === 'planner') {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                this.renderPlanner();
                this.initDragAndDrop();
            }, 100);
        }
    }

    setDefaultDateTime() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        
        const manualDateInput = document.getElementById('manual-date');
        if (manualDateInput) {
            manualDateInput.value = `${year}-${month}-${day}`;
        }
    }

    switchCategory(category) {
        this.currentCategory = category;
        
        // Update tab buttons
        document.querySelectorAll('.dashboard-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === category);
        });
        
        // Update manual log subject dropdown
        this.updateManualSubjectDropdown();
        
        // Re-render dashboard
        this.renderDashboard();
        this.updateSummary();
    }

    updateManualSubjectDropdown() {
        const dropdown = document.getElementById('manual-subject');
        if (!dropdown) return;

        const currentValue = dropdown.value;
        dropdown.innerHTML = '<option value="">Choose a subject...</option>';

        if (this.currentCategory === 'igcse') {
            // IGCSE Prep: Show only IGCSE subjects + custom IGCSE presets
            this.igcseSubjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject;
                option.textContent = subject;
                dropdown.appendChild(option);
            });
            this.customIgcsePresets.forEach(subject => {
                if (!this.igcseSubjects.includes(subject)) {
                    const option = document.createElement('option');
                    option.value = subject;
                    option.textContent = subject;
                    dropdown.appendChild(option);
                }
            });
        } else {
            // General Learning: Show only custom general presets
            this.customGeneralPresets.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject;
                option.textContent = subject;
                dropdown.appendChild(option);
            });
        }

        // Add "Other" option
        const otherOption = document.createElement('option');
        otherOption.value = 'Other';
        otherOption.textContent = 'Other (one-time or new preset)';
        dropdown.appendChild(otherOption);

        // Restore selection if still valid
        if (currentValue && Array.from(dropdown.options).some(opt => opt.value === currentValue)) {
            dropdown.value = currentValue;
        }
    }

    switchViewMode(viewMode) {
        this.currentViewMode = viewMode;
        
        // Update view mode buttons
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewMode);
        });
        
        // Show/hide view containers
        document.querySelectorAll('.view-mode').forEach(view => {
            view.classList.toggle('active', view.id === `${viewMode}-view`);
        });
        
        // Re-render current view
        this.renderDashboard();
    }

    getFilteredSessions() {
        const subjectFilter = document.getElementById('subject-filter').value;
        const dateRangeFilter = document.getElementById('date-range-filter').value;
        
        // Filter by category - include custom presets
        let filteredSessions = this.sessions.filter(s => {
            if (this.currentCategory === 'igcse') {
                // IGCSE: include default IGCSE subjects + custom IGCSE presets
                return this.igcseSubjects.includes(s.subject) || 
                       this.customIgcsePresets.includes(s.subject);
            } else {
                // General: exclude IGCSE subjects and custom IGCSE presets
                return !this.igcseSubjects.includes(s.subject) && 
                       !this.customIgcsePresets.includes(s.subject);
            }
        });
        
        // Filter by subject
        if (subjectFilter) {
            filteredSessions = filteredSessions.filter(s => s.subject === subjectFilter);
        }
        
        // Filter by date range
        if (dateRangeFilter !== 'all') {
            const now = new Date();
            filteredSessions = filteredSessions.filter(s => {
                const sessionDate = new Date(s.date);
                if (dateRangeFilter === 'week') {
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return sessionDate >= weekAgo;
                } else if (dateRangeFilter === 'month') {
                    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    return sessionDate >= monthAgo;
                }
                return true;
            });
        }
        
        return filteredSessions;
    }

    logManualSession() {
        const subjectSelect = document.getElementById('manual-subject');
        const customSubject = document.getElementById('manual-custom-subject');
        const duration = parseInt(document.getElementById('manual-duration').value);
        const dateInput = document.getElementById('manual-date').value;

        let subject = subjectSelect.value;
        let isCustomSubject = false;
        
        if (subject === 'Other') {
            subject = customSubject.value.trim();
            isCustomSubject = true;
        }

        if (!subject) {
            alert('Please select or enter a subject.');
            return;
        }

        if (!duration || duration <= 0) {
            alert('Please enter a valid duration.');
            return;
        }

        if (!dateInput) {
            alert('Please select a date.');
            return;
        }

        // If it's a custom subject, ask if they want to save it as preset
        if (isCustomSubject) {
            const saveAsPreset = confirm(
                `Do you want to save "${subject}" as a preset for future use?\n\n` +
                `Click "OK" to add it to your ${this.currentCategory === 'igcse' ? 'IGCSE Prep' : 'General Learning'} dropdown.\n` +
                `Click "Cancel" to use it as a one-time subject only.`
            );
            
            if (saveAsPreset) {
                this.addCustomPreset(subject, this.currentCategory);
                this.updateManualSubjectDropdown();
            }
        }

        // Use date only (set to current time for the date)
        const dateTime = new Date(dateInput);
        // Set to current time of day
        const now = new Date();
        dateTime.setHours(now.getHours(), now.getMinutes(), 0, 0);

        // Create session object
        const session = {
            id: Date.now(),
            date: dateTime.toISOString(),
            subject: subject,
            duration: duration
        };

        // Add to sessions array
        this.sessions.push(session);
        this.sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
        this.saveSessions();

        // Sync to Notion if enabled
        if (this.notionIntegration) {
            this.notionIntegration.onTimerComplete(session);
        }

        // Reset form
        subjectSelect.value = '';
        customSubject.value = '';
        customSubject.style.display = 'none';
        document.getElementById('manual-duration').value = '45';
        this.setDefaultDateTime();
        
        // Update subject filter
        this.populateSubjectFilter();

        // Update dashboard
        this.renderDashboard();
        this.updateSummary();
        this.populateSubjectFilter();

        // Show success message
        alert(`Session logged successfully! ${duration} minutes of ${subject}.`);
    }

    // Timer Functions (category-aware)
    startTimer(category) {
        const prefix = category === 'igcse' ? 'igcse' : 'general';
        const subjectSelect = document.getElementById(`${prefix}-subject-select`);
        const customSubject = document.getElementById(`${prefix}-custom-subject`);
        
        let subject = category === 'igcse' ? this.igcseCurrentSubject : this.generalCurrentSubject;
        if (!subject) {
            if (subjectSelect.value === 'Other') {
                subject = customSubject.value.trim();
            } else {
                subject = subjectSelect.value;
            }
        }

        if (!subject) {
            alert('Please select or enter a subject before starting the timer.');
            return;
        }

        if (category === 'igcse') {
            this.igcseCurrentSubject = subject;
            this.igcseIsRunning = true;
            this.igcseIsPaused = false;
            this.igcseIsBreak = false;

            document.getElementById('igcse-start-btn').disabled = true;
            document.getElementById('igcse-pause-btn').disabled = false;
            subjectSelect.disabled = true;
            customSubject.disabled = true;
            document.getElementById('igcse-timer-duration').disabled = true;
            document.getElementById('igcse-timer-label').textContent = `Studying: ${subject}`;

            this.igcseTimerInterval = setInterval(() => {
                if (this.igcseIsBreak) {
                    this.igcseBreakTimeRemaining--;
                    this.updateBreakDisplay('igcse');
                    if (this.igcseBreakTimeRemaining <= 0) {
                        this.completeBreak('igcse');
                    }
                } else {
                    this.igcseTimeRemaining--;
                    this.updateTimerDisplay('igcse');
                    if (this.igcseTimeRemaining <= 0) {
                        this.completeSession('igcse');
                    }
                }
            }, 1000);
        } else {
            this.generalCurrentSubject = subject;
            this.generalIsRunning = true;
            this.generalIsPaused = false;
            this.generalIsBreak = false;

            document.getElementById('general-start-btn').disabled = true;
            document.getElementById('general-pause-btn').disabled = false;
            subjectSelect.disabled = true;
            customSubject.disabled = true;
            document.getElementById('general-timer-duration').disabled = true;
            document.getElementById('general-timer-label').textContent = `Studying: ${subject}`;

            this.generalTimerInterval = setInterval(() => {
                if (this.generalIsBreak) {
                    this.generalBreakTimeRemaining--;
                    this.updateBreakDisplay('general');
                    if (this.generalBreakTimeRemaining <= 0) {
                        this.completeBreak('general');
                    }
                } else {
                    this.generalTimeRemaining--;
                    this.updateTimerDisplay('general');
                    if (this.generalTimeRemaining <= 0) {
                        this.completeSession('general');
                    }
                }
            }, 1000);
        }
    }

    pauseTimer(category) {
        const prefix = category === 'igcse' ? 'igcse' : 'general';
        const pauseBtn = document.getElementById(`${prefix}-pause-btn`);
        
        if (category === 'igcse') {
            this.igcseIsPaused = !this.igcseIsPaused;
            pauseBtn.textContent = this.igcseIsPaused ? 'Resume' : 'Pause';
            if (this.igcseIsPaused) {
                clearInterval(this.igcseTimerInterval);
            } else {
                this.startTimer('igcse');
            }
        } else {
            this.generalIsPaused = !this.generalIsPaused;
            pauseBtn.textContent = this.generalIsPaused ? 'Resume' : 'Pause';
            if (this.generalIsPaused) {
                clearInterval(this.generalTimerInterval);
            } else {
                this.startTimer('general');
            }
        }
    }

    resetTimer(category) {
        const prefix = category === 'igcse' ? 'igcse' : 'general';
        
        if (category === 'igcse') {
            clearInterval(this.igcseTimerInterval);
            this.igcseIsRunning = false;
            this.igcseIsPaused = false;
            this.igcseIsBreak = false;
            this.igcseTimeRemaining = this.igcseTimerDuration * 60;
            this.igcseBreakTimeRemaining = 5 * 60;

            document.getElementById('igcse-start-btn').disabled = false;
            document.getElementById('igcse-pause-btn').disabled = true;
            document.getElementById('igcse-pause-btn').textContent = 'Pause';
            document.getElementById('igcse-subject-select').disabled = false;
            document.getElementById('igcse-custom-subject').disabled = false;
            document.getElementById('igcse-timer-duration').disabled = false;
            document.getElementById('igcse-start-break-btn').disabled = true;
            document.getElementById('igcse-skip-break-btn').disabled = true;
            document.getElementById('igcse-timer-label').textContent = 'Ready to start';

            this.initializeTimerCircle('igcse');
            this.updateTimerDisplay('igcse');
            this.updateBreakDisplay('igcse');
        } else {
            clearInterval(this.generalTimerInterval);
            this.generalIsRunning = false;
            this.generalIsPaused = false;
            this.generalIsBreak = false;
            this.generalTimeRemaining = this.generalTimerDuration * 60;
            this.generalBreakTimeRemaining = 5 * 60;

            document.getElementById('general-start-btn').disabled = false;
            document.getElementById('general-pause-btn').disabled = true;
            document.getElementById('general-pause-btn').textContent = 'Pause';
            document.getElementById('general-subject-select').disabled = false;
            document.getElementById('general-custom-subject').disabled = false;
            document.getElementById('general-timer-duration').disabled = false;
            document.getElementById('general-start-break-btn').disabled = true;
            document.getElementById('general-skip-break-btn').disabled = true;
            document.getElementById('general-timer-label').textContent = 'Ready to start';

            this.initializeTimerCircle('general');
            this.updateTimerDisplay('general');
            this.updateBreakDisplay('general');
        }
    }

    completeSession(category) {
        const prefix = category === 'igcse' ? 'igcse' : 'general';
        const timerDuration = category === 'igcse' ? this.igcseTimerDuration : this.generalTimerDuration;
        const currentSubject = category === 'igcse' ? this.igcseCurrentSubject : this.generalCurrentSubject;
        
        if (category === 'igcse') {
            clearInterval(this.igcseTimerInterval);
        } else {
            clearInterval(this.generalTimerInterval);
        }
        
        // Log the session
        const session = {
            id: Date.now(),
            date: new Date().toISOString(),
            subject: currentSubject,
            duration: timerDuration
        };
        
        this.sessions.push(session);
        this.sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
        this.saveSessions();
        
        // Ask if custom subject should be saved as preset
        const isIgcseSubject = this.igcseSubjects.includes(currentSubject) || this.customIgcsePresets.includes(currentSubject);
        if (!isIgcseSubject && category === 'igcse') {
            const saveAsPreset = confirm(`Do you want to save "${currentSubject}" as an IGCSE preset?`);
            if (saveAsPreset) {
                this.addCustomPreset(currentSubject, 'igcse');
                this.updateTimerSubjectDropdowns();
            }
        } else if (category === 'general' && !this.customGeneralPresets.includes(currentSubject)) {
            const saveAsPreset = confirm(`Do you want to save "${currentSubject}" as a General Learning preset?`);
            if (saveAsPreset) {
                this.addCustomPreset(currentSubject, 'general');
                this.updateTimerSubjectDropdowns();
            }
        }
        
        alert(`Great job! You've completed ${timerDuration} minutes of ${currentSubject}. Session logged!`);
        
        // Enable break timer
        document.getElementById(`${prefix}-start-break-btn`).disabled = false;
        document.getElementById(`${prefix}-skip-break-btn`).disabled = false;
        document.getElementById(`${prefix}-timer-label`).textContent = 'Session complete! Take a break?';
        
        // Reset timer state
        if (category === 'igcse') {
            this.igcseIsRunning = false;
            this.igcseIsPaused = false;
        } else {
            this.generalIsRunning = false;
            this.generalIsPaused = false;
        }
        
        document.getElementById(`${prefix}-start-btn`).disabled = false;
        document.getElementById(`${prefix}-pause-btn`).disabled = true;
        
        // Sync to Notion if enabled
        if (this.notionIntegration) {
            this.notionIntegration.onTimerComplete(session);
        }
        
        // Update dashboard if on dashboard view
        if (document.getElementById('dashboard-view').classList.contains('active')) {
            this.renderDashboard();
            this.updateSummary();
            this.populateSubjectFilter();
        }
    }

    startBreak(category) {
        const prefix = category === 'igcse' ? 'igcse' : 'general';
        
        if (category === 'igcse') {
            this.igcseIsBreak = true;
            this.igcseIsRunning = true;
            this.igcseBreakTimeRemaining = 5 * 60;
            
            document.getElementById('igcse-start-break-btn').disabled = true;
            document.getElementById('igcse-skip-break-btn').disabled = true;
            document.getElementById('igcse-timer-label').textContent = 'Break time!';
            
            this.igcseTimerInterval = setInterval(() => {
                this.igcseBreakTimeRemaining--;
                this.updateBreakDisplay('igcse');
                if (this.igcseBreakTimeRemaining <= 0) {
                    this.completeBreak('igcse');
                }
            }, 1000);
        } else {
            this.generalIsBreak = true;
            this.generalIsRunning = true;
            this.generalBreakTimeRemaining = 5 * 60;
            
            document.getElementById('general-start-break-btn').disabled = true;
            document.getElementById('general-skip-break-btn').disabled = true;
            document.getElementById('general-timer-label').textContent = 'Break time!';
            
            this.generalTimerInterval = setInterval(() => {
                this.generalBreakTimeRemaining--;
                this.updateBreakDisplay('general');
                if (this.generalBreakTimeRemaining <= 0) {
                    this.completeBreak('general');
                }
            }, 1000);
        }
    }

    skipBreak(category) {
        const prefix = category === 'igcse' ? 'igcse' : 'general';
        const timerDuration = category === 'igcse' ? this.igcseTimerDuration : this.generalTimerDuration;
        
        if (category === 'igcse') {
            this.igcseIsBreak = false;
            clearInterval(this.igcseTimerInterval);
            this.igcseTimeRemaining = timerDuration * 60;
            document.getElementById('igcse-start-break-btn').disabled = true;
            document.getElementById('igcse-skip-break-btn').disabled = true;
            document.getElementById('igcse-timer-label').textContent = 'Ready to start';
            this.initializeTimerCircle('igcse');
            this.updateTimerDisplay('igcse');
        } else {
            this.generalIsBreak = false;
            clearInterval(this.generalTimerInterval);
            this.generalTimeRemaining = timerDuration * 60;
            document.getElementById('general-start-break-btn').disabled = true;
            document.getElementById('general-skip-break-btn').disabled = true;
            document.getElementById('general-timer-label').textContent = 'Ready to start';
            this.initializeTimerCircle('general');
            this.updateTimerDisplay('general');
        }
    }

    completeBreak(category) {
        const prefix = category === 'igcse' ? 'igcse' : 'general';
        const timerDuration = category === 'igcse' ? this.igcseTimerDuration : this.generalTimerDuration;
        
        if (category === 'igcse') {
            clearInterval(this.igcseTimerInterval);
        } else {
            clearInterval(this.generalTimerInterval);
        }
        
        alert('Break time is over! Ready for another session?');
        this.resetTimer(category);
        
        if (category === 'igcse') {
            this.igcseTimeRemaining = timerDuration * 60;
            this.updateTimerDisplay('igcse');
        } else {
            this.generalTimeRemaining = timerDuration * 60;
            this.updateTimerDisplay('general');
        }
    }

    updateTimerDisplay(category) {
        const prefix = category === 'igcse' ? 'igcse' : 'general';
        const timeRemaining = category === 'igcse' ? this.igcseTimeRemaining : this.generalTimeRemaining;
        const timerDuration = category === 'igcse' ? this.igcseTimerDuration : this.generalTimerDuration;
        
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.querySelector(`.timer-display-${category}`).textContent = display;
        
        // Update progress circle
        const total = timerDuration * 60;
        const progress = 1 - (timeRemaining / total);
        const circumference = 2 * Math.PI * 90;
        const offset = circumference * (1 - progress);
        
        const progressCircle = document.querySelector(`.timer-progress-${category}`);
        if (progressCircle) {
            progressCircle.style.strokeDashoffset = offset;
        }
    }

    updateBreakDisplay(category) {
        const prefix = category === 'igcse' ? 'igcse' : 'general';
        const breakTimeRemaining = category === 'igcse' ? this.igcseBreakTimeRemaining : this.generalBreakTimeRemaining;
        
        const minutes = Math.floor(breakTimeRemaining / 60);
        const seconds = breakTimeRemaining % 60;
        const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.querySelector(`.break-display-${category}`).textContent = display;
    }

    // Dashboard Functions
    renderDashboard() {
        const filteredSessions = this.getFilteredSessions();
        
        // Render based on current view mode
        switch(this.currentViewMode) {
            case 'table':
                this.renderTableView(filteredSessions);
                break;
            case 'cards':
                this.renderCardsView(filteredSessions);
                break;
            case 'bars':
                this.renderBarChart(filteredSessions);
                break;
            case 'pie':
                this.renderPieChart(filteredSessions);
                break;
        }
    }

    renderTableView(filteredSessions) {
        const tbody = document.getElementById('sessions-table-body');
        tbody.innerHTML = '';
        
        if (filteredSessions.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No study sessions match your filters.</td></tr>';
            return;
        }
        
        filteredSessions.forEach(session => {
            const row = document.createElement('tr');
            const date = new Date(session.date);
            const dateStr = date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const hours = Math.floor(session.duration / 60);
            const minutes = session.duration % 60;
            const durationStr = hours > 0 
                ? `${hours}h ${minutes}m` 
                : `${minutes}m`;
            
            row.innerHTML = `
                <td>${dateStr}</td>
                <td><span class="subject-badge">${session.subject}</span></td>
                <td>${durationStr}</td>
                <td>
                    <button class="btn-delete" data-id="${session.id}">Delete</button>
                </td>
            `;
            
            row.querySelector('.btn-delete').addEventListener('click', () => {
                if (confirm('Are you sure you want to delete this session?')) {
                    this.deleteSession(session.id);
                }
            });
            
            tbody.appendChild(row);
        });
    }

    renderCardsView(filteredSessions) {
        const container = document.getElementById('sessions-cards-body');
        container.innerHTML = '';
        
        if (filteredSessions.length === 0) {
            container.innerHTML = '<div class="empty-state">No study sessions match your filters.</div>';
            return;
        }
        
        filteredSessions.forEach(session => {
            const card = document.createElement('div');
            card.className = 'session-card';
            const date = new Date(session.date);
            const dateStr = date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const hours = Math.floor(session.duration / 60);
            const minutes = session.duration % 60;
            const durationStr = hours > 0 
                ? `${hours}h ${minutes}m` 
                : `${minutes}m`;
            
            card.innerHTML = `
                <div class="session-card-header">
                    <span class="subject-badge">${session.subject}</span>
                    <button class="btn-delete-small" data-id="${session.id}">×</button>
                </div>
                <div class="session-card-body">
                    <div class="session-card-date">${dateStr}</div>
                    <div class="session-card-duration">${durationStr}</div>
                </div>
            `;
            
            card.querySelector('.btn-delete-small').addEventListener('click', () => {
                if (confirm('Are you sure you want to delete this session?')) {
                    this.deleteSession(session.id);
                }
            });
            
            container.appendChild(card);
        });
    }

    renderBarChart(filteredSessions) {
        const canvas = document.getElementById('bar-chart');
        const emptyDiv = document.getElementById('bar-chart-empty');
        
        if (filteredSessions.length === 0) {
            canvas.style.display = 'none';
            emptyDiv.style.display = 'block';
            return;
        }
        
        // Set canvas size
        const container = canvas.parentElement;
        const containerWidth = container.clientWidth - 64; // padding
        const containerHeight = 400;
        canvas.width = containerWidth;
        canvas.height = containerHeight;
        canvas.style.display = 'block';
        emptyDiv.style.display = 'none';
        
        // Group by subject
        const subjectData = {};
        filteredSessions.forEach(session => {
            if (!subjectData[session.subject]) {
                subjectData[session.subject] = 0;
            }
            subjectData[session.subject] += session.duration;
        });
        
        const subjects = Object.keys(subjectData).sort();
        const durations = subjects.map(s => subjectData[s]);
        const maxDuration = Math.max(...durations, 1);
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const padding = 60;
        const barWidth = Math.max(40, (width - 2 * padding) / subjects.length);
        const maxBarHeight = height - 2 * padding;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw bars
        subjects.forEach((subject, index) => {
            const barHeight = (durations[index] / maxDuration) * maxBarHeight;
            const x = padding + index * (barWidth + 10);
            const y = height - padding - barHeight;
            
            ctx.fillStyle = this.getSubjectColor(subject);
            ctx.fillRect(x, y, barWidth, barHeight);
            
            // Label
            ctx.fillStyle = '#1e293b';
            ctx.font = '12px Inter';
            ctx.textAlign = 'center';
            ctx.save();
            ctx.translate(x + barWidth / 2, height - padding + 20);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText(subject, 0, 0);
            ctx.restore();
            
            // Value on top
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 11px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(this.formatDuration(durations[index]), x + barWidth / 2, y - 5);
        });
    }

    renderPieChart(filteredSessions) {
        const canvas = document.getElementById('pie-chart');
        const emptyDiv = document.getElementById('pie-chart-empty');
        
        if (filteredSessions.length === 0) {
            canvas.style.display = 'none';
            emptyDiv.style.display = 'block';
            return;
        }
        
        // Set canvas size (square)
        const container = canvas.parentElement;
        const containerSize = Math.min(container.clientWidth - 64, 500);
        canvas.width = containerSize;
        canvas.height = containerSize;
        canvas.style.display = 'block';
        emptyDiv.style.display = 'none';
        
        // Group by subject
        const subjectData = {};
        filteredSessions.forEach(session => {
            if (!subjectData[session.subject]) {
                subjectData[session.subject] = 0;
            }
            subjectData[session.subject] += session.duration;
        });
        
        const subjects = Object.keys(subjectData);
        const durations = subjects.map(s => subjectData[s]);
        const total = durations.reduce((a, b) => a + b, 0);
        
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 60;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        let currentAngle = -Math.PI / 2;
        
        subjects.forEach((subject, index) => {
            const sliceAngle = (durations[index] / total) * 2 * Math.PI;
            
            // Draw slice
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = this.getSubjectColor(subject);
            ctx.fill();
            
            // Draw border
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw label
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius * 0.65);
            const labelY = centerY + Math.sin(labelAngle) * (radius * 0.65);
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 13px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(subject, labelX, labelY);
            
            // Draw percentage
            const percent = ((durations[index] / total) * 100).toFixed(0);
            ctx.font = '11px Inter';
            ctx.fillText(`${percent}%`, labelX, labelY + 15);
            
            currentAngle += sliceAngle;
        });
    }

    getSubjectColor(subject) {
        const colors = [
            '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4',
            '#ec4899', '#14b8a6', '#f97316', '#84cc16'
        ];
        const index = subject.charCodeAt(0) % colors.length;
        return colors[index];
    }

    deleteSession(id) {
        this.sessions = this.sessions.filter(s => s.id !== id);
        this.saveSessions();
        this.renderDashboard();
        this.updateSummary();
        this.populateSubjectFilter();
    }

    updateSummary() {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        // Filter by category - include custom presets
        let categorySessions = this.sessions.filter(s => {
            if (this.currentCategory === 'igcse') {
                return this.igcseSubjects.includes(s.subject) || 
                       this.customIgcsePresets.includes(s.subject);
            } else {
                return !this.igcseSubjects.includes(s.subject) && 
                       !this.customIgcsePresets.includes(s.subject);
            }
        });
        
        const weeklySessions = categorySessions.filter(s => new Date(s.date) >= weekAgo);
        const monthlySessions = categorySessions.filter(s => new Date(s.date) >= monthAgo);
        
        const weeklyTotal = weeklySessions.reduce((sum, s) => sum + s.duration, 0);
        const monthlyTotal = monthlySessions.reduce((sum, s) => sum + s.duration, 0);
        
        document.getElementById('weekly-total').textContent = this.formatDuration(weeklyTotal);
        document.getElementById('monthly-total').textContent = this.formatDuration(monthlyTotal);
        document.getElementById('total-sessions').textContent = categorySessions.length;
    }

    formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }

    populateSubjectFilter() {
        const filter = document.getElementById('subject-filter');
        const currentValue = filter.value;
        
        // Get unique subjects filtered by category - include custom presets
        let categorySessions = this.sessions.filter(s => {
            if (this.currentCategory === 'igcse') {
                return this.igcseSubjects.includes(s.subject) || 
                       this.customIgcsePresets.includes(s.subject);
            } else {
                return !this.igcseSubjects.includes(s.subject) && 
                       !this.customIgcsePresets.includes(s.subject);
            }
        });
        
        const subjects = [...new Set(categorySessions.map(s => s.subject))].sort();
        
        // Clear and repopulate
        filter.innerHTML = '<option value="">All Subjects</option>';
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            filter.appendChild(option);
        });
        
        // Restore selection
        filter.value = currentValue;
    }

    clearFilters() {
        document.getElementById('subject-filter').value = '';
        document.getElementById('date-range-filter').value = 'all';
        this.renderDashboard();
    }

    // Planner Functions
    setupPlannerListeners() {
        // Add task button
        document.getElementById('add-task-btn')?.addEventListener('click', () => {
            this.openTaskModal();
        });

        // Close modal
        document.getElementById('close-modal-btn')?.addEventListener('click', () => {
            this.closeTaskModal();
        });
        document.getElementById('cancel-task-btn')?.addEventListener('click', () => {
            this.closeTaskModal();
        });

        // Task form submit
        document.getElementById('task-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });

        // Week navigation
        document.getElementById('prev-week-btn')?.addEventListener('click', () => {
            this.currentWeekStart = new Date(this.currentWeekStart);
            this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
            this.renderPlanner();
        });
        document.getElementById('next-week-btn')?.addEventListener('click', () => {
            this.currentWeekStart = new Date(this.currentWeekStart);
            this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
            this.renderPlanner();
        });

        // Clear week
        document.getElementById('clear-week-btn')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all tasks for this week?')) {
                this.clearCurrentWeek();
            }
        });

        // Task subject dropdown
        document.getElementById('task-subject')?.addEventListener('change', (e) => {
            if (e.target.value === 'Other') {
                document.getElementById('task-custom-subject').style.display = 'block';
            } else {
                document.getElementById('task-custom-subject').style.display = 'none';
            }
        });

        // Update subject dropdown when category changes
        document.getElementById('task-category')?.addEventListener('change', () => {
            this.populateTaskSubjectDropdown();
        });
    }

    openTaskModal() {
        const modal = document.getElementById('task-modal');
        modal.style.display = 'flex';
        this.populateTaskSubjectDropdown();
    }

    closeTaskModal() {
        const modal = document.getElementById('task-modal');
        modal.style.display = 'none';
        document.getElementById('task-form').reset();
        document.getElementById('task-custom-subject').style.display = 'none';
    }

    populateTaskSubjectDropdown() {
        const dropdown = document.getElementById('task-subject');
        const category = document.getElementById('task-category')?.value || 'igcse';
        
        if (!dropdown) return;
        
        dropdown.innerHTML = '<option value="">Choose a subject...</option>';
        
        if (category === 'igcse') {
            this.igcseSubjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject;
                option.textContent = subject;
                dropdown.appendChild(option);
            });
            this.customIgcsePresets.forEach(subject => {
                if (!this.igcseSubjects.includes(subject)) {
                    const option = document.createElement('option');
                    option.value = subject;
                    option.textContent = subject;
                    dropdown.appendChild(option);
                }
            });
        } else {
            this.customGeneralPresets.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject;
                option.textContent = subject;
                dropdown.appendChild(option);
            });
        }
        
        const otherOption = document.createElement('option');
        otherOption.value = 'Other';
        otherOption.textContent = 'Other';
        dropdown.appendChild(otherOption);
    }

    addTask() {
        const subjectSelect = document.getElementById('task-subject');
        const customSubject = document.getElementById('task-custom-subject');
        const duration = parseInt(document.getElementById('task-duration').value);
        const day = document.getElementById('task-day').value;
        const category = document.getElementById('task-category').value;

        let subject = subjectSelect.value;
        if (subject === 'Other') {
            subject = customSubject.value.trim();
        }

        if (!subject) {
            alert('Please select or enter a subject.');
            return;
        }

        const task = {
            id: Date.now(),
            subject: subject,
            duration: duration,
            day: day,
            category: category,
            completed: false,
            weekStart: this.currentWeekStart.toISOString()
        };

        this.plannerTasks.push(task);
        this.savePlannerTasks();
        this.renderPlanner();
        this.closeTaskModal();
    }

    renderPlanner() {
        // Update week display
        const weekEnd = new Date(this.currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 4); // Friday
        const weekDisplay = document.getElementById('current-week-display');
        if (weekDisplay) {
            weekDisplay.textContent = `Week of ${this.formatWeekDate(this.currentWeekStart)}`;
        }

        // Update day dates
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        days.forEach((day, index) => {
            const date = new Date(this.currentWeekStart);
            date.setDate(date.getDate() + index);
            const dateElement = document.getElementById(`${day}-date`);
            if (dateElement) {
                dateElement.textContent = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
        });

        // Filter tasks for current week
        const weekTasks = this.plannerTasks.filter(task => {
            const taskWeekStart = new Date(task.weekStart);
            return taskWeekStart.getTime() === this.currentWeekStart.getTime();
        });

        // Render tasks for each day
        days.forEach(day => {
            const dayTasks = weekTasks.filter(task => task.day === day);
            const container = document.getElementById(`${day}-tasks`);
            if (!container) return;
            
            container.innerHTML = '';

            if (dayTasks.length === 0) {
                container.innerHTML = '<div class="empty-day-message">No tasks planned</div>';
            } else {
                dayTasks.forEach(task => {
                    const taskElement = this.createTaskElement(task);
                    container.appendChild(taskElement);
                });
            }
        });

        // Initialize drag and drop after rendering
        setTimeout(() => {
            this.initDragAndDrop();
        }, 100);
    }

    createTaskElement(task) {
        const taskDiv = document.createElement('div');
        taskDiv.className = `task-box ${task.category === 'igcse' ? 'task-igcse' : 'task-general'}`;
        taskDiv.draggable = true;
        taskDiv.dataset.taskId = task.id;
        if (task.completed) {
            taskDiv.classList.add('task-completed');
        }

        const hours = Math.floor(task.duration / 60);
        const minutes = task.duration % 60;
        const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        taskDiv.innerHTML = `
            <div class="task-checkbox">
                <input type="checkbox" ${task.completed ? 'checked' : ''} data-task-id="${task.id}">
            </div>
            <div class="task-content">
                <div class="task-subject">${task.subject}</div>
                <div class="task-duration">${durationStr}</div>
            </div>
            <button class="task-delete" data-task-id="${task.id}">×</button>
        `;

        // Checkbox handler
        const checkbox = taskDiv.querySelector('input[type="checkbox"]');
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                this.toggleTaskComplete(task.id, e.target.checked);
            });
        }

        // Delete handler
        const deleteBtn = taskDiv.querySelector('.task-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (confirm('Delete this task?')) {
                    this.deleteTask(task.id);
                }
            });
        }

        // Drag handlers
        taskDiv.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', task.id.toString());
            taskDiv.classList.add('dragging');
        });

        taskDiv.addEventListener('dragend', () => {
            taskDiv.classList.remove('dragging');
        });

        return taskDiv;
    }

    toggleTaskComplete(taskId, completed) {
        const task = this.plannerTasks.find(t => t.id === taskId);
        if (task) {
            task.completed = completed;
            this.savePlannerTasks();
            this.renderPlanner();

            // When task is checked off, log it as a session
            if (completed) {
                this.logTaskAsSession(task);
            }
        }
    }

    logTaskAsSession(task) {
        // Calculate the date for this task's day
        const taskWeekStart = new Date(task.weekStart);
        const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].indexOf(task.day);
        const taskDate = new Date(taskWeekStart);
        taskDate.setDate(taskDate.getDate() + dayIndex);
        
        // Set to current time of day
        const now = new Date();
        taskDate.setHours(now.getHours(), now.getMinutes(), 0, 0);

        // Check if session already exists for this task (to avoid duplicates)
        const existingSession = this.sessions.find(s => 
            s.subject === task.subject &&
            s.duration === task.duration &&
            new Date(s.date).toDateString() === taskDate.toDateString() &&
            s.plannerTaskId === task.id
        );

        if (existingSession) {
            // Session already logged for this task
            return;
        }

        // Create session object
        const session = {
            id: Date.now(),
            date: taskDate.toISOString(),
            subject: task.subject,
            duration: task.duration,
            plannerTaskId: task.id // Track which planner task created this
        };

        // Add to sessions array
        this.sessions.push(session);
        this.sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
        this.saveSessions();

        // Sync to Notion if enabled
        if (this.notionIntegration) {
            this.notionIntegration.onSessionCreated(session);
        }

        // Update dashboard if it's currently visible
        if (document.getElementById('dashboard-view')?.classList.contains('active')) {
            this.renderDashboard();
            this.updateSummary();
            this.populateSubjectFilter();
        }

        // Show confirmation
        const hours = Math.floor(task.duration / 60);
        const minutes = task.duration % 60;
        const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        console.log(`✅ Logged: ${durationStr} of ${task.subject} on ${taskDate.toLocaleDateString()}`);
    }

    deleteTask(taskId) {
        this.plannerTasks = this.plannerTasks.filter(t => t.id !== taskId);
        this.savePlannerTasks();
        this.renderPlanner();
    }

    clearCurrentWeek() {
        this.plannerTasks = this.plannerTasks.filter(task => {
            const taskWeekStart = new Date(task.weekStart);
            return taskWeekStart.getTime() !== this.currentWeekStart.getTime();
        });
        this.savePlannerTasks();
        this.renderPlanner();
    }

    // Initialize drag and drop for tasks
    initDragAndDrop() {
        const dayContainers = document.querySelectorAll('.day-tasks');
        
        dayContainers.forEach(container => {
            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                container.classList.add('drag-over');
            });

            container.addEventListener('dragleave', () => {
                container.classList.remove('drag-over');
            });

            container.addEventListener('drop', (e) => {
                e.preventDefault();
                container.classList.remove('drag-over');
                
                const taskId = parseInt(e.dataTransfer.getData('text/plain'));
                const newDay = container.dataset.day;
                this.moveTask(taskId, newDay);
            });
        });
    }

    moveTask(taskId, newDay) {
        const task = this.plannerTasks.find(t => t.id === taskId);
        if (task) {
            task.day = newDay;
            this.savePlannerTasks();
            this.renderPlanner();
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new StudyTracker();
});

