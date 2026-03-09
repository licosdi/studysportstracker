// Logbook Application
class LogbookApp {
  constructor() {
    this.currentUser = null;
    this.currentView = 'dashboard';
    this.studyCategories = [];
    this.footballCategories = [];

    // Per-area stats state
    this.studyStatsMode = 'weekly';
    this.studyStatsDate = new Date();
    this.footballStatsMode = 'daily';
    this.footballStatsDate = new Date();

    // Timer state
    this.timers = {
      study: {
        duration: 45,
        remaining: 45 * 60,
        breakRemaining: 5 * 60,
        isRunning: false,
        isPaused: false,
        isBreak: false,
        interval: null,
        categoryId: null
      },
    };

    this.init();
  }

  async init() {
    try {
      this.setupEventListeners();
      await this.checkAuth();
    } catch (error) {
      console.error('Init error:', error);
      this.showAuthView();
    }
  }

  // ==================== UTILITIES ====================

  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  formatDate(date) {
    return new Date(date).toISOString().split('T')[0];
  }

  formatDateTime(dateTime) {
    const d = new Date(dateTime);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  formatWeekDisplay(weekStart) {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  // ==================== AUTH ====================

  async checkAuth() {
    if (api.isAuthenticated()) {
      try {
        const { user } = await api.getCurrentUser();
        this.currentUser = user;
        this.showMainApp();
        await this.loadInitialData();
      } catch (e) {
        api.logout();
        this.showAuthView();
      }
    } else {
      this.showAuthView();
    }
  }

  showAuthView() {
    document.getElementById('auth-view').style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';
  }

  showMainApp() {
    document.getElementById('auth-view').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';

    // Update all user name elements
    const name = this.currentUser.name;
    const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

    // Sidebar
    const sidebarName = document.getElementById('sidebar-user-name');
    const sidebarAvatar = document.getElementById('sidebar-user-avatar');
    if (sidebarName) sidebarName.textContent = name;
    if (sidebarAvatar) sidebarAvatar.textContent = initials;

    // Mobile
    const mobileUserName = document.getElementById('mobile-user-name');
    if (mobileUserName) mobileUserName.textContent = name.split(' ')[0];

    // Mobile profile
    const mobileProfileAvatar = document.getElementById('mobile-profile-avatar');
    const mobileProfileName = document.getElementById('mobile-profile-name');
    if (mobileProfileAvatar) mobileProfileAvatar.textContent = initials;
    if (mobileProfileName) mobileProfileName.textContent = name;

    // Desktop profile
    const profileAvatar = document.getElementById('profile-avatar-initials');
    const profileName = document.getElementById('profile-display-name');
    if (profileAvatar) profileAvatar.textContent = initials;
    if (profileName) profileName.textContent = name;

    // Settings
    const settingsName = document.getElementById('settings-name');
    const settingsEmail = document.getElementById('settings-email');
    if (settingsName) settingsName.value = name;
    if (settingsEmail) settingsEmail.value = this.currentUser.email;

    // Mobile settings
    const mobileSettingsName = document.getElementById('mobile-settings-name');
    const mobileSettingsEmail = document.getElementById('mobile-settings-email');
    if (mobileSettingsName) mobileSettingsName.value = name;
    if (mobileSettingsEmail) mobileSettingsEmail.value = this.currentUser.email;

    // Mobile greeting
    const greetingEl = document.getElementById('mobile-greeting-time');
    if (greetingEl) {
      const hour = new Date().getHours();
      greetingEl.textContent = hour < 12 ? 'Good morning,' : hour < 17 ? 'Good afternoon,' : 'Good evening,';
    }

    // Setup platform-specific navigation
    this.setupPlatformNav();
  }

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const { user } = await api.login(email, password);
      this.currentUser = user;
      this.showMainApp();
      await this.loadInitialData();
    } catch (error) {
      console.error('Login error:', error.message);
    }
  }

  async handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    try {
      const { user } = await api.register(name, email, password);
      this.currentUser = user;
      this.showMainApp();
      await this.loadInitialData();
    } catch (error) {
      console.error('Signup error:', error.message);
    }
  }

  handleLogout() {
    api.logout();
    this.currentUser = null;
    this.showAuthView();
  }

  // ==================== DATA LOADING ====================

  async loadInitialData() {
    await this.checkAndResetTimetable();
    await this.loadCategories();
    await this.loadDashboard();
    await this.loadMobileDashboard();
    this.loadMobileSessions('study');
  }

  async checkAndResetTimetable() {
    const currentWeek = this.formatDate(this.getWeekStart(new Date()));
    const lastSeenWeek = localStorage.getItem('timetable_week');
    if (lastSeenWeek !== currentWeek) {
      try {
        await api.resetTimetable();
        localStorage.setItem('timetable_week', currentWeek);
      } catch (error) {
        console.error('Failed to reset timetable:', error);
      }
    }
  }

  async loadCategories() {
    try {
      const [studyRes, footballRes] = await Promise.all([
        api.getStudyCategories(),
        api.getFootballCategories()
      ]);
      this.studyCategories = studyRes.categories;
      this.footballCategories = footballRes.categories;
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }

  async loadDashboard() {
    try {
      const data = await api.getDashboard();
      document.getElementById('dashboard-date').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
      });

      document.getElementById('today-study-time').textContent = this.formatDuration(data.today.study.minutes);
      document.getElementById('today-study-sessions').textContent = data.today.study.sessions;
      document.getElementById('today-football-time').textContent = this.formatDuration(data.today.football.minutes);
      document.getElementById('today-football-sessions').textContent = data.today.football.sessions;
      document.getElementById('week-study-time').textContent = this.formatDuration(data.week.study.minutes);
      document.getElementById('week-study-sessions').textContent = data.week.study.sessions;
      document.getElementById('week-football-time').textContent = this.formatDuration(data.week.football.minutes);
      document.getElementById('week-football-sessions').textContent = data.week.football.sessions;

      // Today's schedule from weekly plan
      const pendingPlansEl = document.getElementById('pending-plans-list');
      if (data.today.schedule && data.today.schedule.length > 0) {
        pendingPlansEl.innerHTML = data.today.schedule.map(s => `
          <div class="list-item ${s.isCompleted ? 'completed' : ''}">
            <span class="category-badge" style="background: ${s.categoryColor}">${s.categoryName}</span>
            <span class="list-item-title" style="${s.isCompleted ? 'text-decoration: line-through; opacity: 0.6' : ''}">${s.title}</span>
            <span class="list-item-meta">${s.durationMinutes}m</span>
            ${s.isCompleted ? '<span class="from-plan-badge">done</span>' : ''}
          </div>
        `).join('');
      } else {
        pendingPlansEl.innerHTML = '<p class="empty-state">No sessions scheduled for today</p>';
      }

      // Recent logs
      const recentLogsEl = document.getElementById('recent-logs-list');
      if (data.recentLogs.length > 0) {
        recentLogsEl.innerHTML = data.recentLogs.map(l => `
          <div class="list-item">
            <span class="category-badge" style="background: ${l.categoryColor}">${l.categoryName}</span>
            <span class="list-item-title">${l.title}</span>
            <span class="list-item-meta">${this.formatDuration(l.durationMinutes)}</span>
          </div>
        `).join('');
      } else {
        recentLogsEl.innerHTML = '<p class="empty-state">No recent activity</p>';
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  }

  // ==================== NAVIGATION ====================

  setupEventListeners() {
    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`${tab.dataset.tab}-form`).classList.add('active');
      });
    });

    // Auth forms
    document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
    document.getElementById('signup-form').addEventListener('submit', (e) => this.handleSignup(e));
    document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());

    // Desktop navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        if (link.id === 'ai-panel-toggle-btn') {
          this.toggleAIPanel();
          return;
        }
        if (link.dataset.view) {
          this.navigateTo(link.dataset.view);
        }
      });
    });

    // Weekly Plan buttons
    document.getElementById('add-study-weekly-plan-btn').addEventListener('click', () => this.openWeeklyPlanModal('study'));
    document.getElementById('add-football-weekly-plan-btn').addEventListener('click', () => this.openWeeklyPlanModal('football'));

    // Study stats
    document.querySelectorAll('[data-stats-area="study"]').forEach(btn => {
      btn.addEventListener('click', () => this.setStudyStatsPeriod(btn.dataset.statsPeriod));
    });
    document.getElementById('study-stats-prev').addEventListener('click', () => this.changeStudyStatsPeriod(-1));
    document.getElementById('study-stats-next').addEventListener('click', () => this.changeStudyStatsPeriod(1));

    // Football stats
    document.querySelectorAll('[data-stats-area="football"]').forEach(btn => {
      btn.addEventListener('click', () => this.setFootballStatsPeriod(btn.dataset.statsPeriod));
    });
    document.getElementById('football-stats-prev').addEventListener('click', () => this.changeFootballStatsPeriod(-1));
    document.getElementById('football-stats-next').addEventListener('click', () => this.changeFootballStatsPeriod(1));

    // Settings tabs
    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`${tab.dataset.tab}-settings`).classList.add('active');
      });
    });

    // Settings actions
    document.getElementById('add-study-category-btn').addEventListener('click', () => this.openCategoryModal('study'));
    document.getElementById('add-football-category-btn').addEventListener('click', () => this.openCategoryModal('football'));
    document.getElementById('add-study-template-btn')?.addEventListener('click', () => this.openTemplateModal('study'));
    document.getElementById('add-football-template-btn')?.addEventListener('click', () => this.openTemplateModal('football'));

    // Save profile (desktop settings)
    document.getElementById('save-profile-btn')?.addEventListener('click', () => this.saveProfile());

    // Modal close
    document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal-overlay')) this.closeModal();
    });

    // Timer event listeners
    this.setupTimerListeners();
  }

  setupPlatformNav() {
    // ---- Sidebar collapse (desktop) ----
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    if (sidebarToggle && sidebar) {
      // Remove previous listener by cloning
      const newToggle = sidebarToggle.cloneNode(true);
      sidebarToggle.parentNode.replaceChild(newToggle, sidebarToggle);
      newToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        if (mainContent) mainContent.classList.toggle('sidebar-collapsed');
        newToggle.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
      });
    }

    // ---- Desktop AI panel ----
    const aiPanelClose = document.getElementById('ai-panel-close');
    if (aiPanelClose) {
      const newClose = aiPanelClose.cloneNode(true);
      aiPanelClose.parentNode.replaceChild(newClose, aiPanelClose);
      newClose.addEventListener('click', () => this.closeAIPanel());
    }

    // ---- Mobile bottom nav ----
    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const mobileView = btn.dataset.mobileView;
        if (mobileView) this.switchMobileView(mobileView);
      });
    });

    // Today's Schedule "Plan →" button in mobile dashboard
    const mobilePlanBtn = document.querySelector('.card-header [data-mobile-view="mobile-sessions"]');
    if (mobilePlanBtn) {
      mobilePlanBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchMobileView('mobile-sessions');
      });
    }

    // ---- iOS AI FAB + Sheet ----
    const aiFab = document.getElementById('ai-fab');
    const aiSheet = document.getElementById('ai-sheet');
    const sheetOverlay = document.getElementById('sheet-overlay');
    const aiSheetClose = document.getElementById('ai-sheet-close');

    if (aiFab && aiSheet) {
      aiFab.addEventListener('click', () => this.openAISheet());
    }
    if (aiSheetClose) {
      aiSheetClose.addEventListener('click', () => this.closeAISheet());
    }
    if (sheetOverlay) {
      sheetOverlay.addEventListener('click', () => this.closeAISheet());
    }

    // ---- Extra logout handlers ----
    document.getElementById('logout-btn-profile')?.addEventListener('click', () => this.handleLogout());
    document.getElementById('logout-btn-mobile')?.addEventListener('click', () => this.handleLogout());

    // ---- Mobile add session button ----
    document.getElementById('mobile-add-session-btn')?.addEventListener('click', () => this.openQuickLog());

    // ---- Mobile save profile ----
    document.getElementById('mobile-save-profile-btn')?.addEventListener('click', () => this.saveMobileProfile());
  }

  switchMobileView(viewId) {
    // Update bottom nav active state
    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mobileView === viewId);
    });

    // Show/hide mobile views
    document.querySelectorAll('.mobile-view').forEach(view => {
      if (view.id === `${viewId}-view`) {
        view.style.display = '';
        view.classList.add('active');
      } else {
        view.style.display = 'none';
        view.classList.remove('active');
      }
    });

    // Load data for view
    switch (viewId) {
      case 'mobile-dashboard': this.loadMobileDashboard(); break;
      case 'mobile-sessions': this.loadMobileSessions('study'); break;
      case 'mobile-progress': this.loadMobileProgress(); break;
    }
  }

  switchMobileSessionTab(area) {
    const studyTab = document.getElementById('mobile-study-tab');
    const footballTab = document.getElementById('mobile-football-tab');
    const studySessions = document.getElementById('mobile-study-sessions');
    const footballSessions = document.getElementById('mobile-football-sessions');

    if (area === 'study') {
      studyTab?.classList.add('active');
      footballTab?.classList.remove('active');
      if (studyTab) studyTab.style.background = 'var(--surface)';
      if (footballTab) footballTab.style.background = 'transparent';
      if (studySessions) studySessions.style.display = '';
      if (footballSessions) footballSessions.style.display = 'none';
    } else {
      footballTab?.classList.add('active');
      studyTab?.classList.remove('active');
      if (footballTab) footballTab.style.background = 'var(--surface)';
      if (studyTab) studyTab.style.background = 'transparent';
      if (footballSessions) footballSessions.style.display = '';
      if (studySessions) studySessions.style.display = 'none';
      this.loadMobileSessions('football');
    }
  }

  async loadMobileDashboard() {
    try {
      const data = await api.getDashboard();

      // Progress ring — use today's total minutes as proxy for "points"
      const todayMinutes = (data.today.study.minutes || 0) + (data.today.football.minutes || 0);
      const goalMinutes = 90; // 90-min daily goal
      const pct = Math.min(todayMinutes / goalMinutes, 1);
      const circumference = 2 * Math.PI * 52; // r=52 from HTML
      const ringFill = document.getElementById('mobile-ring-fill');
      const ringValue = document.getElementById('mobile-ring-value');
      const ringLabel = document.getElementById('mobile-ring-label');
      if (ringFill) ringFill.style.strokeDashoffset = circumference * (1 - pct);
      if (ringValue) ringValue.textContent = todayMinutes;
      if (ringLabel) ringLabel.textContent = 'min today';

      // Weekly progress bar
      const weekTotal = (data.week.study.sessions || 0) + (data.week.football.sessions || 0);
      const weekGoal = 10;
      const weekPct = Math.min(weekTotal / weekGoal * 100, 100);
      const weekBar = document.getElementById('mobile-weekly-bar');
      const weekLabel = document.getElementById('mobile-weekly-label');
      if (weekBar) weekBar.style.width = `${weekPct}%`;
      if (weekLabel) weekLabel.textContent = `${weekTotal} / ${weekGoal} sessions (${Math.round(weekPct)}%)`;

      // Today study/football
      const todayStudyEl = document.getElementById('mobile-today-study');
      const todayFootballEl = document.getElementById('mobile-today-football');
      if (todayStudyEl) todayStudyEl.textContent = this.formatDuration(data.today.study.minutes);
      if (todayFootballEl) todayFootballEl.textContent = this.formatDuration(data.today.football.minutes);

      // Today's schedule
      const pendingEl = document.getElementById('mobile-pending-plans');
      if (pendingEl) {
        if (data.today.schedule && data.today.schedule.length > 0) {
          pendingEl.innerHTML = data.today.schedule.map(s => `
            <div class="list-item ${s.isCompleted ? 'completed' : ''}">
              <span class="category-badge" style="background: ${s.categoryColor}">${s.categoryName}</span>
              <span class="list-item-title" style="${s.isCompleted ? 'text-decoration:line-through;opacity:0.6' : ''}">${s.title}</span>
              <span class="list-item-meta">${s.durationMinutes}m</span>
            </div>
          `).join('');
        } else {
          pendingEl.innerHTML = '<p class="empty-state">No sessions scheduled for today</p>';
        }
      }

      // Recent logs
      const recentEl = document.getElementById('mobile-recent-logs');
      if (recentEl) {
        if (data.recentLogs && data.recentLogs.length > 0) {
          recentEl.innerHTML = data.recentLogs.slice(0, 5).map(l => `
            <div class="list-item">
              <span class="category-badge" style="background: ${l.categoryColor}">${l.categoryName}</span>
              <span class="list-item-title">${l.title}</span>
              <span class="list-item-meta">${this.formatDuration(l.durationMinutes)}</span>
            </div>
          `).join('');
        } else {
          recentEl.innerHTML = '<p class="empty-state">No recent activity</p>';
        }
      }
    } catch (error) {
      console.error('Failed to load mobile dashboard:', error);
    }
  }

  async loadMobileSessions(area) {
    const containerId = area === 'study' ? 'mobile-study-sessions' : 'mobile-football-sessions';
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const weekStart = this.formatDate(this.getWeekStart(new Date()));
      const { items } = await api.getWeeklyPlanStatus(weekStart, area);
      const categories = area === 'study' ? this.studyCategories : this.footballCategories;

      if (items && items.length > 0) {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        container.innerHTML = items.map(item => `
          <div class="session-library-item">
            <div class="session-lib-left">
              <span class="category-badge" style="background: ${item.categoryColor}">${item.categoryName}</span>
              <div style="margin-top:0.35rem;">
                <span style="font-size:0.8rem;color:var(--text-2);">${days[item.dayOfWeek]} · ${item.durationMinutes}m</span>
                ${item.startTime ? `<span style="font-size:0.75rem;color:var(--text-3);margin-left:0.4rem;">${item.startTime}</span>` : ''}
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem;">
              ${item.isCompleted ? '<span style="font-size:0.7rem;background:var(--success);color:#fff;padding:0.15rem 0.4rem;border-radius:999px;">done</span>' : ''}
              <label class="plan-checkbox">
                <input type="checkbox" ${item.isCompleted ? 'checked' : ''} data-weekly-id="${item.id}" data-area="${area}">
              </label>
            </div>
          </div>
        `).join('');

        container.querySelectorAll('input[data-weekly-id]').forEach(cb => {
          cb.addEventListener('change', () => {
            if (cb.checked) this.completeWeeklyPlan(cb.dataset.weeklyId, cb.dataset.area);
            else this.uncompleteWeeklyPlan(cb.dataset.weeklyId, cb.dataset.area);
          });
        });
      } else {
        container.innerHTML = '<p class="empty-state" style="padding:1.5rem 0;">No sessions in this week\'s plan</p>';
      }
    } catch (error) {
      console.error(`Failed to load mobile ${area} sessions:`, error);
      container.innerHTML = '<p class="empty-state" style="padding:1.5rem 0;">Failed to load sessions</p>';
    }
  }

  async loadMobileProgress() {
    try {
      const weekStart = this.getWeekStart(new Date());
      const data = await api.getWeeklyStats(this.formatDate(weekStart), 'study');

      // Weekly chart
      const chartEl = document.getElementById('mobile-weekly-chart');
      const labelsEl = document.getElementById('mobile-chart-labels');
      const dailyData = data.daily ? data.daily.filter(d => d.area === 'study') : [];

      if (chartEl && dailyData.length > 0) {
        const maxMin = Math.max(...dailyData.map(d => d.totalMinutes), 30);
        chartEl.innerHTML = dailyData.map(d => {
          const pct = Math.round(d.totalMinutes / maxMin * 100);
          return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:0.25rem;">
            <div style="width:100%;background:var(--primary);border-radius:4px 4px 0 0;height:${pct}%;min-height:${d.totalMinutes > 0 ? 4 : 0}px;"></div>
          </div>`;
        }).join('');
        if (labelsEl) {
          labelsEl.innerHTML = dailyData.map(d =>
            `<span>${new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</span>`
          ).join('');
        }
      } else if (chartEl) {
        chartEl.innerHTML = '<div style="width:100%;text-align:center;color:var(--text-3);font-size:0.875rem;">No data this week</div>';
      }

      // Weekly goal
      const [studyPlan, footballPlan] = await Promise.all([
        api.getWeeklyPlanStatus(this.formatDate(weekStart), 'study'),
        api.getWeeklyPlanStatus(this.formatDate(weekStart), 'football')
      ]);
      const allItems = [...(studyPlan.items || []), ...(footballPlan.items || [])];
      const total = allItems.length;
      const completed = allItems.filter(i => i.isCompleted).length;
      const pct = total > 0 ? Math.round(completed / total * 100) : 0;

      const goalBar = document.getElementById('mobile-goal-bar');
      const goalLabel = document.getElementById('mobile-goal-label');
      if (goalBar) goalBar.style.width = `${pct}%`;
      if (goalLabel) goalLabel.textContent = `${completed} / ${total} sessions (${pct}%)`;

    } catch (error) {
      console.error('Failed to load mobile progress:', error);
    }
  }

  // ---- AI Panel (Desktop) ----
  toggleAIPanel() {
    const panel = document.getElementById('ai-panel');
    const mainContent = document.getElementById('main-content');
    if (!panel) return;
    const isOpen = panel.classList.contains('open');
    if (isOpen) {
      this.closeAIPanel();
    } else {
      panel.classList.add('open');
      if (mainContent) mainContent.classList.add('ai-open');
    }
  }

  closeAIPanel() {
    const panel = document.getElementById('ai-panel');
    const mainContent = document.getElementById('main-content');
    if (panel) panel.classList.remove('open');
    if (mainContent) mainContent.classList.remove('ai-open');
  }

  // ---- AI Sheet (iOS) ----
  openAISheet() {
    const sheet = document.getElementById('ai-sheet');
    const overlay = document.getElementById('sheet-overlay');
    if (sheet) sheet.classList.add('open');
    if (overlay) overlay.classList.add('active');
  }

  closeAISheet() {
    const sheet = document.getElementById('ai-sheet');
    const overlay = document.getElementById('sheet-overlay');
    if (sheet) sheet.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
  }

  // ---- Quick Log (shared modal for both platforms) ----
  openQuickLog() {
    const studyCats = this.studyCategories.filter(c => c.isActive);
    const footballCats = this.footballCategories.filter(c => c.isActive);
    const allCats = [
      ...studyCats.map(c => ({ ...c, area: 'study' })),
      ...footballCats.map(c => ({ ...c, area: 'football' }))
    ];
    const now = new Date();
    const dateTimeStr = now.toISOString().slice(0, 16);

    this.openModal('Log Session', `
      <form id="quick-log-form">
        <div class="form-group">
          <label>Date & Time</label>
          <input type="datetime-local" id="qlog-datetime" class="form-input" value="${dateTimeStr}" required>
        </div>
        <div class="form-group">
          <label>Category</label>
          <select id="qlog-category" class="form-select" required>
            <optgroup label="Study">
              ${studyCats.map(c => `<option value="${c.id}" data-area="study">${c.name}</option>`).join('')}
            </optgroup>
            <optgroup label="Football">
              ${footballCats.map(c => `<option value="${c.id}" data-area="football">${c.name}</option>`).join('')}
            </optgroup>
          </select>
        </div>
        <div class="form-group">
          <label>Title</label>
          <input type="text" id="qlog-title" class="form-input" placeholder="What did you do?" required>
        </div>
        <div class="form-group">
          <label>Duration (minutes)</label>
          <input type="number" id="qlog-duration" class="form-input" value="45" min="1" max="480" required>
        </div>
        <div class="form-group">
          <label>Notes (optional)</label>
          <textarea id="qlog-notes" class="form-input" rows="2"></textarea>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Log Session</button>
      </form>
    `);

    document.getElementById('quick-log-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const categorySelect = document.getElementById('qlog-category');
        const selectedOption = categorySelect.options[categorySelect.selectedIndex];
        const area = selectedOption.dataset.area;
        await api.createLog({
          area,
          dateTime: new Date(document.getElementById('qlog-datetime').value).toISOString(),
          categoryId: parseInt(categorySelect.value),
          title: document.getElementById('qlog-title').value,
          durationMinutes: parseInt(document.getElementById('qlog-duration').value),
          notes: document.getElementById('qlog-notes').value || null
        });
        this.closeModal();
        this.loadDashboard();
        this.loadMobileDashboard();
      } catch (error) {
        console.error('Quick log error:', error);
      }
    });
  }

  // ---- Save Profile ----
  saveProfile() {
    const nameInput = document.getElementById('settings-name');
    if (!nameInput || !nameInput.value.trim()) return;
    const name = nameInput.value.trim();
    this.currentUser.name = name;
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const updates = {
      'sidebar-user-name': name,
      'sidebar-user-avatar': initials,
      'mobile-user-name': name.split(' ')[0],
      'mobile-profile-name': name,
      'mobile-profile-avatar': initials,
      'profile-avatar-initials': initials,
      'profile-display-name': name,
      'mobile-settings-name': name
    };
    Object.entries(updates).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === 'INPUT') el.value = val;
      else el.textContent = val;
    });
  }

  saveMobileProfile() {
    const nameInput = document.getElementById('mobile-settings-name');
    if (!nameInput) return;
    const desktopInput = document.getElementById('settings-name');
    if (desktopInput) desktopInput.value = nameInput.value;
    this.saveProfile();
  }

  setupTimerListeners() {
    // Study timer
    document.getElementById('study-start-btn')?.addEventListener('click', () => this.startTimer('study'));
    document.getElementById('study-pause-btn')?.addEventListener('click', () => this.pauseTimer('study'));
    document.getElementById('study-reset-btn')?.addEventListener('click', () => this.resetTimer('study'));
    document.getElementById('study-timer-duration')?.addEventListener('change', (e) => this.setTimerDuration('study', parseInt(e.target.value)));
    document.getElementById('study-start-break-btn')?.addEventListener('click', () => this.startBreak('study'));
    document.getElementById('study-skip-break-btn')?.addEventListener('click', () => this.skipBreak('study'));

  }

  navigateTo(view) {
    this.currentView = view;
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll(`[data-view="${view}"]`).forEach(el => el.classList.add('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const viewEl = document.getElementById(`${view}-view`);
    if (viewEl) viewEl.classList.add('active');

    // Load view data
    switch (view) {
      case 'dashboard': this.loadDashboard(); break;
      case 'study-timer': this.loadStudyTimer(); break;
      case 'study-weekly-plan': this.loadStudyWeeklyPlan(); break;
      case 'study-stats': this.loadStudyStats(); break;
      case 'football-weekly-plan': this.loadFootballWeeklyPlan(); break;
      case 'football-stats': this.loadFootballStats(); break;
      case 'settings': this.loadSettings(); break;
      case 'profile': this.loadProfile(); break;
    }
  }

  async loadProfile() {
    try {
      const data = await api.getDashboard();
      const weekMinutes = (data.week.study.minutes || 0) + (data.week.football.minutes || 0);
      const weekSessions = (data.week.study.sessions || 0) + (data.week.football.sessions || 0);

      const totalPoints = document.getElementById('profile-total-points');
      const longestStreak = document.getElementById('profile-longest-streak');
      const totalSessions = document.getElementById('profile-total-sessions');
      const mobileHours = document.getElementById('mobile-total-hours');
      const mobileStreak = document.getElementById('mobile-streak');

      if (totalPoints) totalPoints.textContent = `${Math.round(weekMinutes / 60)}h`;
      if (longestStreak) longestStreak.textContent = data.streak || 0;
      if (totalSessions) totalSessions.textContent = weekSessions;
      if (mobileHours) mobileHours.textContent = `${Math.round(weekMinutes / 60)}h`;
      if (mobileStreak) mobileStreak.textContent = data.streak || 0;
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  }

  // ==================== TIMER ====================

  loadStudyTimer() {
    this.populateTimerCategories('study');
    this.updateTimerDisplay('study');
  }


  populateTimerCategories(area) {
    const select = document.getElementById(`${area}-timer-category`);
    if (!select) return;

    const categories = area === 'study' ? this.studyCategories : this.footballCategories;
    const activeCategories = categories.filter(c => c.isActive);

    select.innerHTML = activeCategories.map(c =>
      `<option value="${c.id}">${c.name}</option>`
    ).join('');

    // Store selected category
    if (activeCategories.length > 0) {
      this.timers[area].categoryId = activeCategories[0].id;
    }

    select.addEventListener('change', (e) => {
      this.timers[area].categoryId = parseInt(e.target.value);
    });
  }

  setTimerDuration(area, minutes) {
    this.timers[area].duration = minutes;
    this.timers[area].remaining = minutes * 60;
    this.updateTimerDisplay(area);
    this.updateTimerProgress(area);
  }

  updateTimerDisplay(area) {
    const timer = this.timers[area];
    const display = document.getElementById(`${area}-timer-display`);
    if (!display) return;

    const minutes = Math.floor(timer.remaining / 60);
    const seconds = timer.remaining % 60;
    display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  updateTimerProgress(area) {
    const timer = this.timers[area];
    const progress = document.getElementById(`${area}-timer-progress`);
    if (!progress) return;

    const totalSeconds = timer.duration * 60;
    const circumference = 2 * Math.PI * 45;
    const offset = circumference * (1 - timer.remaining / totalSeconds);
    progress.style.strokeDashoffset = offset;
  }

  updateBreakDisplay(area) {
    const timer = this.timers[area];
    const display = document.getElementById(`${area}-break-display`);
    if (!display) return;

    const minutes = Math.floor(timer.breakRemaining / 60);
    const seconds = timer.breakRemaining % 60;
    display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  startTimer(area) {
    const timer = this.timers[area];
    const categorySelect = document.getElementById(`${area}-timer-category`);

    if (!categorySelect?.value) {
      return;
    }

    timer.categoryId = parseInt(categorySelect.value);
    timer.isRunning = true;
    timer.isPaused = false;

    // Request notification permission the first time the timer is started
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const categories = area === 'study' ? this.studyCategories : this.footballCategories;
    const category = categories.find(c => c.id === timer.categoryId);
    const label = document.getElementById(`${area}-timer-label`);
    if (label && category) {
      label.textContent = `Working: ${category.name}`;
    }

    document.getElementById(`${area}-start-btn`).disabled = true;
    document.getElementById(`${area}-pause-btn`).disabled = false;
    document.getElementById(`${area}-timer-category`).disabled = true;
    document.getElementById(`${area}-timer-duration`).disabled = true;

    timer.interval = setInterval(() => {
      if (timer.isBreak) {
        timer.breakRemaining--;
        this.updateBreakDisplay(area);
        if (timer.breakRemaining <= 0) {
          this.completeBreak(area);
        }
      } else {
        timer.remaining--;
        this.updateTimerDisplay(area);
        this.updateTimerProgress(area);
        if (timer.remaining <= 0) {
          this.completeSession(area);
        }
      }
    }, 1000);
  }

  pauseTimer(area) {
    const timer = this.timers[area];
    const pauseBtn = document.getElementById(`${area}-pause-btn`);

    if (timer.isPaused) {
      timer.isPaused = false;
      pauseBtn.textContent = 'Pause';
      this.startTimer(area);
    } else {
      timer.isPaused = true;
      pauseBtn.textContent = 'Resume';
      clearInterval(timer.interval);
    }
  }

  resetTimer(area) {
    const timer = this.timers[area];

    clearInterval(timer.interval);
    timer.isRunning = false;
    timer.isPaused = false;
    timer.isBreak = false;
    timer.remaining = timer.duration * 60;
    timer.breakRemaining = 5 * 60;

    document.getElementById(`${area}-start-btn`).disabled = false;
    document.getElementById(`${area}-pause-btn`).disabled = true;
    document.getElementById(`${area}-pause-btn`).textContent = 'Pause';
    document.getElementById(`${area}-timer-category`).disabled = false;
    document.getElementById(`${area}-timer-duration`).disabled = false;

    document.getElementById(`${area}-break-section`).style.display = 'none';

    const label = document.getElementById(`${area}-timer-label`);
    if (label) label.textContent = 'Ready to start';

    this.updateTimerDisplay(area);
    this.updateTimerProgress(area);
    this.updateBreakDisplay(area);
  }

  async completeSession(area) {
    const timer = this.timers[area];
    clearInterval(timer.interval);

    const categories = area === 'study' ? this.studyCategories : this.footballCategories;
    const category = categories.find(c => c.id === timer.categoryId);

    try {
      const logData = {
        area,
        dateTime: new Date().toISOString(),
        categoryId: timer.categoryId,
        title: `${category?.name || 'Session'} (Timer)`,
        durationMinutes: timer.duration,
        notes: 'Completed via Pomodoro timer'
      };

      await api.createLog(logData);

      // Session saved silently

      timer.isBreak = true;
      document.getElementById(`${area}-break-section`).style.display = 'block';
      document.getElementById(`${area}-start-btn`).disabled = true;
      document.getElementById(`${area}-pause-btn`).disabled = true;

      const label = document.getElementById(`${area}-timer-label`);
      if (label) label.textContent = 'Session complete!';

      // Fire macOS notification via service worker (or directly if SW unavailable)
      const notifTitle = 'Logbook';
      const notifBody = `${category?.name || area} session complete! Time for a break.`;
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'TIMER_COMPLETE',
          title: notifTitle,
          body: notifBody,
        });
      } else if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notifTitle, { body: notifBody, icon: '/assets/icons/icon-192.png' });
      }

    } catch (error) {
      console.error('Failed to log session:', error);
      console.error('Failed to save session:', error);
    }
  }

  startBreak(area) {
    const timer = this.timers[area];
    timer.interval = setInterval(() => {
      timer.breakRemaining--;
      this.updateBreakDisplay(area);
      if (timer.breakRemaining <= 0) {
        this.completeBreak(area);
      }
    }, 1000);

    document.getElementById(`${area}-start-break-btn`).disabled = true;
  }

  skipBreak(area) {
    this.completeBreak(area);
  }

  completeBreak(area) {
    const timer = this.timers[area];
    clearInterval(timer.interval);
    this.resetTimer(area);
  }

  // ==================== WEEKLY PLAN ====================

  async loadStudyWeeklyPlan() {
    const weekStart = this.formatDate(this.getWeekStart(new Date()));
    try {
      const { items } = await api.getWeeklyPlanStatus(weekStart, 'study');
      this.renderWeeklyPlanGrid('study-weekly-plan-grid', items, 'study');
      this.updateWeeklyProgress(items, 'study');
      this.renderTimetable('study', items);
    } catch (error) {
      console.error('Failed to load study weekly plan:', error);
    }
  }

  async loadFootballWeeklyPlan() {
    const weekStart = this.getWeekStart(new Date());
    const weekStartStr = this.formatDate(weekStart);
    // Show week range in header
    const weekLabel = document.getElementById('football-week-label');
    if (weekLabel) weekLabel.textContent = this.formatWeekDisplay(weekStart);
    try {
      const { items } = await api.getWeeklyPlanStatus(weekStartStr, 'football');
      this.renderWeeklyPlanGrid('football-weekly-plan-grid', items, 'football');
      this.updateWeeklyProgress(items, 'football');
      this.renderFootballScoring(items);
    } catch (error) {
      console.error('Failed to load football weekly plan:', error);
    }
  }

  renderFootballScoring(items) {
    const container = document.getElementById('football-scoring-container');
    if (container && typeof FootballScoring !== 'undefined') {
      FootballScoring.renderScoringDashboard(container, items);
    }
  }

  renderWeeklyPlanGrid(containerId, items, area) {
    const container = document.getElementById(containerId);
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const todayIndex = (new Date().getDay() + 6) % 7; // Monday=0

    let html = '';
    for (let i = 0; i < 7; i++) {
      const dayItems = items.filter(item => item.dayOfWeek === i);
      const isToday = i === todayIndex;

      html += `
        <div class="day-column ${isToday ? 'today' : ''}">
          <div class="day-header">
            <span class="day-name">${days[i]}</span>
          </div>
          <div class="day-items" data-day="${i}" data-area="${area}">
            ${dayItems.map(item => {
              const isCompleted = !!item.isCompleted;
              return `
                <div class="plan-item ${isCompleted ? 'completed' : ''}" data-id="${item.id}" draggable="true">
                  <span class="drag-handle" title="Drag to reorder">&#9776;</span>
                  <label class="plan-checkbox">
                    <input type="checkbox" ${isCompleted ? 'checked' : ''} data-weekly-id="${item.id}">
                  </label>
                  <div class="plan-content">
                    <span class="category-badge" style="background: ${item.categoryColor}">${item.categoryName}</span>
                    <div class="plan-item-meta">${item.durationMinutes}m</div>
                  </div>
                  <div class="plan-item-actions">
                    <button class="delete-btn" data-weekly-id="${item.id}" title="Remove">&#128465;</button>
                  </div>
                </div>
              `;
            }).join('') || ''}
          </div>
          <button class="add-day-item-btn" data-day="${i}" data-area="${area}">+ Add</button>
        </div>
      `;
    }
    container.innerHTML = html;

    // Checkbox listeners
    container.querySelectorAll('input[type="checkbox"][data-weekly-id]').forEach(cb => {
      cb.addEventListener('change', () => {
        const id = cb.dataset.weeklyId;
        if (cb.checked) this.completeWeeklyPlan(id, area);
        else this.uncompleteWeeklyPlan(id, area);
      });
    });

    // Delete listeners
    container.querySelectorAll('.delete-btn[data-weekly-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteWeeklyPlan(btn.dataset.weeklyId, area);
      });
    });

    // Add per-day listeners
    container.querySelectorAll('.add-day-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.openWeeklyPlanModal(btn.dataset.area, parseInt(btn.dataset.day));
      });
    });

    // Drag-and-drop reordering within each day column
    this.setupDragAndDrop(container, area);
  }

  setupDragAndDrop(container, area) {
    let draggedEl = null;
    let dragSourceDay = null;

    // Event delegation on the grid container — enables cross-day drag
    container.addEventListener('dragstart', (e) => {
      const item = e.target.closest('.plan-item');
      if (!item) return;
      draggedEl = item;
      dragSourceDay = parseInt(item.closest('.day-items').dataset.day);
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.dataset.id);
    });

    container.addEventListener('dragend', () => {
      if (draggedEl) draggedEl.classList.remove('dragging');
      container.querySelectorAll('.plan-item.drag-over').forEach(el => el.classList.remove('drag-over'));
      container.querySelectorAll('.day-items.drag-target').forEach(el => el.classList.remove('drag-target'));
      draggedEl = null;
      dragSourceDay = null;
    });

    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!draggedEl) return;
      container.querySelectorAll('.plan-item.drag-over').forEach(el => el.classList.remove('drag-over'));
      container.querySelectorAll('.day-items.drag-target').forEach(el => el.classList.remove('drag-target'));
      const targetItem = e.target.closest('.plan-item');
      const targetDayList = e.target.closest('.day-items');
      if (targetItem && targetItem !== draggedEl) {
        targetItem.classList.add('drag-over');
      } else if (targetDayList) {
        targetDayList.classList.add('drag-target');
      }
    });

    container.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!draggedEl) return;
      container.querySelectorAll('.plan-item.drag-over').forEach(el => el.classList.remove('drag-over'));
      container.querySelectorAll('.day-items.drag-target').forEach(el => el.classList.remove('drag-target'));

      const targetItem = e.target.closest('.plan-item');
      const targetDayList = e.target.closest('.day-items');
      if (!targetDayList) return;

      const targetDay = parseInt(targetDayList.dataset.day);

      if (targetItem && targetItem !== draggedEl) {
        // Insert before or after based on cursor Y midpoint
        const rect = targetItem.getBoundingClientRect();
        const before = e.clientY < (rect.top + rect.height / 2);
        targetDayList.insertBefore(draggedEl, before ? targetItem : targetItem.nextSibling);
      } else {
        // Dropped onto empty space — append to end of day
        targetDayList.appendChild(draggedEl);
      }

      // Build reorder payload for both affected days
      const reorderPayload = [...targetDayList.querySelectorAll('.plan-item')]
        .map((el, idx) => ({ id: parseInt(el.dataset.id), sortOrder: idx, dayOfWeek: targetDay }));

      if (dragSourceDay !== targetDay) {
        const sourceDayList = container.querySelector(`.day-items[data-day="${dragSourceDay}"]`);
        if (sourceDayList) {
          [...sourceDayList.querySelectorAll('.plan-item')]
            .forEach((el, idx) => reorderPayload.push({ id: parseInt(el.dataset.id), sortOrder: idx, dayOfWeek: dragSourceDay }));
        }
      }

      api.reorderWeeklyPlans(reorderPayload).catch(() => {
        if (area === 'study') this.loadStudyWeeklyPlan();
        else this.loadFootballWeeklyPlan();
      });
    });
  }

  updateWeeklyProgress(items, area) {
    const total = items.length;
    const completed = items.filter(item => item.isCompleted).length;
    const progressText = document.getElementById(`${area}-progress-text`);
    const progressBar = document.getElementById(`${area}-progress-bar`);
    if (progressText) progressText.textContent = `${completed} of ${total} completed`;
    if (progressBar) progressBar.style.width = total > 0 ? `${(completed / total * 100)}%` : '0%';
  }

  async completeWeeklyPlan(id, area) {
    try {
      await api.completeWeeklyPlan(id);
      if (area === 'study') this.loadStudyWeeklyPlan();
      else this.loadFootballWeeklyPlan();
    } catch (error) {
      console.error('Complete weekly plan error:', error);
      if (area === 'study') this.loadStudyWeeklyPlan();
      else this.loadFootballWeeklyPlan();
    }
  }

  async uncompleteWeeklyPlan(id, area) {
    try {
      await api.uncompleteWeeklyPlan(id);
    } catch (error) {
      // Ignore "Not completed this week" — just reload to sync correct state
    }
    if (area === 'study') this.loadStudyWeeklyPlan();
    else this.loadFootballWeeklyPlan();
  }

  async deleteWeeklyPlan(id, area) {
    try {
      await api.deleteWeeklyPlan(id);
      if (area === 'study') this.loadStudyWeeklyPlan();
      else this.loadFootballWeeklyPlan();
    } catch (error) {
      console.error('Delete weekly plan error:', error);
    }
  }

  // ==================== TIMETABLE ====================

  renderTimetable(area, items) {
    const container = document.getElementById(`${area}-timetable-grid`);
    const unscheduledContainer = document.getElementById(`${area}-unscheduled-items`);

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const todayIndex = (new Date().getDay() + 6) % 7;

    const startHour = 7;
    const endHour = 18;
    const totalSlots = (endHour - startHour) * 4; // 44 slots of 15min
    const slotHeight = 25;

    const scheduled = items.filter(item => item.startTime);
    const unscheduled = items.filter(item => item.isCompleted && !item.startTime);

    // Time column
    let html = '<div class="timetable-time-column">';
    for (let h = startHour; h < endHour; h++) {
      const ampm = h < 12 ? 'AM' : 'PM';
      const display = h <= 12 ? h : h - 12;
      html += `<div class="timetable-hour-label">${display}:00 ${ampm}</div>`;
    }
    html += '</div>';

    // Day columns
    for (let d = 0; d < 7; d++) {
      const isToday = d === todayIndex;
      html += `<div class="timetable-day-column ${isToday ? 'today' : ''}" data-day="${d}">`;
      html += `<div class="timetable-day-header">${days[d]}</div>`;
      html += `<div class="timetable-day-slots" data-day="${d}" style="height: ${totalSlots * slotHeight}px;">`;

      // 15-min slot drop zones
      for (let slot = 0; slot < totalSlots; slot++) {
        const minutes = slot * 15;
        const hour = startHour + Math.floor(minutes / 60);
        const min = minutes % 60;
        const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        const isHourBoundary = min === 0;
        html += `<div class="timetable-slot ${isHourBoundary ? 'hour-boundary' : ''}" data-time="${timeStr}" data-day="${d}"></div>`;
      }

      // Positioned blocks
      const dayItems = scheduled.filter(item => item.dayOfWeek === d);
      for (const item of dayItems) {
        const [h, m] = item.startTime.split(':').map(Number);
        const slotOffset = (h - startHour) * 4 + Math.floor(m / 15);
        const slotSpan = Math.ceil(item.durationMinutes / 15);

        html += `<div class="timetable-block ${item.isCompleted ? 'completed' : ''}"
                     draggable="true"
                     data-id="${item.id}"
                     data-area="${area}"
                     style="top: ${slotOffset * slotHeight}px; height: ${slotSpan * slotHeight - 2}px; background: ${item.categoryColor};">
                  <span class="timetable-block-title">${item.categoryName}</span>
                  <span class="timetable-block-time">${item.startTime}</span>
                  <span class="timetable-block-duration">${item.durationMinutes}m</span>
                </div>`;
      }

      html += '</div></div>';
    }

    container.innerHTML = html;

    // Auto-scroll to current hour
    const now = new Date();
    const scrollTo = Math.max(0, (now.getHours() - startHour) * 100 - 50);
    container.scrollTop = scrollTo;

    // Unscheduled items
    if (unscheduled.length > 0) {
      unscheduledContainer.innerHTML = `
        <h4>Unscheduled</h4>
        <div class="unscheduled-items-list">
          ${unscheduled.map(item => `
            <div class="timetable-block unscheduled"
                 draggable="true" data-id="${item.id}" data-area="${area}"
                 style="background: ${item.categoryColor};">
              <span class="timetable-block-title">${item.categoryName}</span>
              <span class="timetable-block-duration">${item.durationMinutes}m</span>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      unscheduledContainer.innerHTML = '';
    }

    this.setupTimetableDragDrop(area);
  }

  setupTimetableDragDrop(area) {
    const container = document.getElementById(`${area}-timetable-grid`);
    const unscheduledContainer = document.getElementById(`${area}-unscheduled-items`);

    const initDrag = (block) => {
      block.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({
          id: block.dataset.id,
          area: block.dataset.area
        }));
        block.classList.add('dragging');
      });
      block.addEventListener('dragend', () => {
        block.classList.remove('dragging');
        container.querySelectorAll('.timetable-slot.drag-over').forEach(s =>
          s.classList.remove('drag-over'));
      });
    };

    container.querySelectorAll('.timetable-block[draggable="true"]').forEach(initDrag);
    unscheduledContainer?.querySelectorAll('.timetable-block[draggable="true"]').forEach(initDrag);

    // Make slots droppable
    container.querySelectorAll('.timetable-slot').forEach(slot => {
      slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        slot.classList.add('drag-over');
      });
      slot.addEventListener('dragleave', () => {
        slot.classList.remove('drag-over');
      });
      slot.addEventListener('drop', async (e) => {
        e.preventDefault();
        slot.classList.remove('drag-over');

        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        const newDay = parseInt(slot.dataset.day);
        const newTime = slot.dataset.time;

        try {
          await api.updateWeeklyPlan(data.id, {
            dayOfWeek: newDay,
            startTime: newTime
          });
          if (data.area === 'study') this.loadStudyWeeklyPlan();
          else this.loadFootballWeeklyPlan();
        } catch (error) {
          console.error('Failed to move item:', error);
        }
      });
    });
  }

  // ==================== STATS ====================

  async loadStudyStats() {
    if (this.studyStatsMode === 'weekly') {
      const weekStart = this.getWeekStart(this.studyStatsDate);
      document.getElementById('study-stats-period-display').textContent = this.formatWeekDisplay(weekStart);
      try {
        const data = await api.getWeeklyStats(this.formatDate(weekStart), 'study');
        this.renderAreaStats('study', data);
      } catch (error) {
        console.error('Failed to load study stats:', error);
      }
    } else {
      const year = this.studyStatsDate.getFullYear();
      const month = this.studyStatsDate.getMonth() + 1;
      document.getElementById('study-stats-period-display').textContent =
        this.studyStatsDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      try {
        const data = await api.getMonthlyStats(year, month, 'study');
        this.renderAreaStats('study', data);
      } catch (error) {
        console.error('Failed to load study stats:', error);
      }
    }
  }


  renderAreaStats(area, data) {
    const areaData = data[area] || { totalMinutes: 0, totalSessions: 0, breakdown: [] };
    document.getElementById(`${area}-stats-time`).textContent = this.formatDuration(areaData.totalMinutes);
    document.getElementById(`${area}-stats-sessions`).textContent = areaData.totalSessions;

    const breakdownEl = document.getElementById(`${area}-stats-breakdown`);
    if (areaData.breakdown.length > 0) {
      breakdownEl.innerHTML = areaData.breakdown.map(cat => `
        <div class="breakdown-item">
          <div class="breakdown-label">
            <span class="breakdown-color" style="background: ${cat.categoryColor}"></span>
            ${cat.categoryName}
          </div>
          <div class="breakdown-value">${this.formatDuration(cat.totalMinutes)}</div>
          <div class="breakdown-bar">
            <div class="breakdown-bar-fill" style="width: ${(cat.totalMinutes / areaData.totalMinutes * 100) || 0}%; background: ${cat.categoryColor}"></div>
          </div>
        </div>
      `).join('');
    } else {
      breakdownEl.innerHTML = '<p class="empty-state">No data</p>';
    }

    // Daily chart
    const chartContainer = document.getElementById(`${area}-daily-chart`);
    const dailyData = data.daily ? data.daily.filter(d => d.area === area) : [];
    if (dailyData.length > 0) {
      const maxMinutes = Math.max(...dailyData.map(d => d.totalMinutes), 60);
      chartContainer.innerHTML = `
        <div class="bar-chart">
          ${dailyData.map(d => `
            <div class="bar-group">
              <div class="bar" style="height: ${(d.totalMinutes / maxMinutes * 100)}%; background: ${area === 'study' ? '#6366f1' : '#10b981'}"></div>
              <div class="bar-label">${new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      chartContainer.innerHTML = '<p class="empty-state">No data for this period</p>';
    }
  }

  setStudyStatsPeriod(mode) {
    this.studyStatsMode = mode;
    document.querySelectorAll('[data-stats-area="study"]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.statsPeriod === mode);
    });
    this.loadStudyStats();
  }

  changeStudyStatsPeriod(delta) {
    if (this.studyStatsMode === 'weekly') {
      this.studyStatsDate.setDate(this.studyStatsDate.getDate() + (delta * 7));
    } else {
      this.studyStatsDate.setMonth(this.studyStatsDate.getMonth() + delta);
    }
    this.loadStudyStats();
  }

  async loadFootballStats() {
    const display = document.getElementById('football-stats-period-display');
    const sessionsCard = document.getElementById('football-sessions-card');
    const chartTitle = document.getElementById('football-chart-title');

    try {
      if (this.footballStatsMode === 'daily') {
        const dateStr = this.formatDate(this.footballStatsDate);
        display.textContent = this.footballStatsDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        if (chartTitle) chartTitle.textContent = 'Session Log';
        if (sessionsCard) sessionsCard.style.display = '';
        const data = await api.getDailyStats(dateStr, 'football');
        this.renderFootballStatsDaily(data);
      } else if (this.footballStatsMode === 'weekly') {
        const weekStart = this.getWeekStart(this.footballStatsDate);
        display.textContent = this.formatWeekDisplay(weekStart);
        if (chartTitle) chartTitle.textContent = 'Daily Breakdown';
        if (sessionsCard) sessionsCard.style.display = 'none';
        const data = await api.getWeeklyStats(this.formatDate(weekStart), 'football');
        this.renderFootballStatsWeekly(data);
      } else {
        const year = this.footballStatsDate.getFullYear();
        const month = this.footballStatsDate.getMonth() + 1;
        display.textContent = this.footballStatsDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        if (chartTitle) chartTitle.textContent = 'Weekly Breakdown';
        if (sessionsCard) sessionsCard.style.display = 'none';
        const data = await api.getMonthlyStats(year, month, 'football');
        this.renderFootballStatsMonthly(data);
      }
    } catch (error) {
      console.error('Failed to load football stats:', error);
    }
  }

  renderFootballStatsDaily(data) {
    const football = data.football || { totalMinutes: 0, totalSessions: 0, breakdown: [] };
    this._renderFootballStatsSummary(football);

    // Chart: show individual log entries as bars
    const chartContainer = document.getElementById('football-daily-chart');
    const logs = data.logs || [];
    if (logs.length > 0) {
      const maxMinutes = Math.max(...logs.map(l => l.durationMinutes), 30);
      chartContainer.innerHTML = `
        <div class="bar-chart">
          ${logs.map(l => `
            <div class="bar-group">
              <div class="bar" style="height: ${(l.durationMinutes / maxMinutes * 100)}%; background: ${l.categoryColor || '#10b981'}" title="${l.categoryName}: ${l.durationMinutes}m"></div>
              <div class="bar-label">${l.categoryName ? l.categoryName.substring(0, 4) : ''}</div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      chartContainer.innerHTML = '<p class="empty-state">No sessions today</p>';
    }

    // Session list
    const sessionsList = document.getElementById('football-sessions-list');
    if (sessionsList) {
      if (logs.length > 0) {
        sessionsList.innerHTML = logs.map(l => `
          <div class="session-log-item">
            <span class="session-log-badge" style="background: ${l.categoryColor || '#10b981'}">${l.categoryName || ''}</span>
            <span class="session-log-duration">${l.durationMinutes}m</span>
            <span class="session-log-time">${new Date(l.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            ${l.intensity ? `<span class="session-log-intensity intensity-${l.intensity}">${l.intensity}</span>` : ''}
          </div>
        `).join('');
      } else {
        sessionsList.innerHTML = '<p class="empty-state">No sessions logged</p>';
      }
    }
  }

  renderFootballStatsWeekly(data) {
    const football = data.football || { totalMinutes: 0, totalSessions: 0, breakdown: [] };
    this._renderFootballStatsSummary(football);

    // Bar chart: stacked daily breakdown by category
    const chartContainer = document.getElementById('football-daily-chart');
    const dailyData = (data.daily || []).filter(d => d.area === 'football');
    const dailyByCategory = data.dailyByCategory || [];
    if (dailyData.length > 0) {
      const maxMinutes = Math.max(...dailyData.map(d => d.totalMinutes), 60);
      chartContainer.innerHTML = `
        <div class="bar-chart">
          ${dailyData.map(d => {
            const cats = dailyByCategory.filter(c => c.date === d.date);
            const segments = cats.map(c => `
              <div style="height: ${(c.totalMinutes / maxMinutes * 100)}%; background: ${c.categoryColor}; width: 100%;" title="${c.categoryName}: ${c.totalMinutes}m"></div>
            `).join('');
            return `
              <div class="bar-group">
                <div class="bar stacked" style="height: ${(d.totalMinutes / maxMinutes * 100)}%;">
                  ${segments}
                </div>
                <div class="bar-label">${new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else {
      chartContainer.innerHTML = '<p class="empty-state">No data for this week</p>';
    }
  }

  renderFootballStatsMonthly(data) {
    const football = data.football || { totalMinutes: 0, totalSessions: 0, breakdown: [] };
    this._renderFootballStatsSummary(football);

    // Bar chart: weekly breakdown within month
    const chartContainer = document.getElementById('football-daily-chart');
    const weeklyData = (data.weekly || []).filter(d => d.area === 'football');
    if (weeklyData.length > 0) {
      const maxMinutes = Math.max(...weeklyData.map(d => d.totalMinutes), 60);
      chartContainer.innerHTML = `
        <div class="bar-chart">
          ${weeklyData.map((d, i) => `
            <div class="bar-group">
              <div class="bar" style="height: ${(d.totalMinutes / maxMinutes * 100)}%; background: #10b981" title="Week ${d.weekNumber}: ${d.totalMinutes}m"></div>
              <div class="bar-label">Wk ${i + 1}</div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      chartContainer.innerHTML = '<p class="empty-state">No data for this month</p>';
    }
  }

  _renderFootballStatsSummary(football) {
    document.getElementById('football-stats-time').textContent = this.formatDuration(football.totalMinutes);
    document.getElementById('football-stats-sessions').textContent = football.totalSessions;
    const avg = football.totalSessions > 0 ? Math.round(football.totalMinutes / football.totalSessions) : 0;
    document.getElementById('football-stats-avg').textContent = avg > 0 ? `${avg}m` : '—';

    const breakdownEl = document.getElementById('football-stats-breakdown');
    if (football.breakdown && football.breakdown.length > 0) {
      breakdownEl.innerHTML = football.breakdown.map(cat => `
        <div class="breakdown-item">
          <div class="breakdown-label">
            <span class="breakdown-color" style="background: ${cat.categoryColor}"></span>
            ${cat.categoryName}
          </div>
          <div class="breakdown-value">${this.formatDuration(cat.totalMinutes)}</div>
          <div class="breakdown-bar">
            <div class="breakdown-bar-fill" style="width: ${(cat.totalMinutes / (football.totalMinutes || 1) * 100) || 0}%; background: ${cat.categoryColor}"></div>
          </div>
        </div>
      `).join('');
    } else {
      breakdownEl.innerHTML = '<p class="empty-state">No data</p>';
    }
  }

  setFootballStatsPeriod(mode) {
    this.footballStatsMode = mode;
    document.querySelectorAll('[data-stats-area="football"]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.statsPeriod === mode);
    });
    this.loadFootballStats();
  }

  changeFootballStatsPeriod(delta) {
    if (this.footballStatsMode === 'daily') {
      this.footballStatsDate.setDate(this.footballStatsDate.getDate() + delta);
    } else if (this.footballStatsMode === 'weekly') {
      this.footballStatsDate.setDate(this.footballStatsDate.getDate() + (delta * 7));
    } else {
      this.footballStatsDate.setMonth(this.footballStatsDate.getMonth() + delta);
    }
    this.loadFootballStats();
  }

  // ==================== SETTINGS ====================

  loadSettings() {
    this.renderStudyCategories();
    this.renderFootballCategories();
    this.loadAndRenderTemplates('study');
    this.loadAndRenderTemplates('football');
  }

  renderStudyCategories() {
    const container = document.getElementById('study-categories-list');
    container.innerHTML = this.studyCategories.map(cat => `
      <div class="category-item ${cat.isActive ? '' : 'inactive'}">
        <span class="category-color" style="background: ${cat.color}"></span>
        <span class="category-name">${cat.name}</span>
        <div class="category-actions">
          <button class="btn btn-ghost btn-sm toggle-btn" data-id="${cat.id}" data-active="${cat.isActive}">
            ${cat.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button class="btn btn-ghost btn-sm delete-btn" data-id="${cat.id}">Delete</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => this.toggleStudyCategory(btn.dataset.id, btn.dataset.active !== 'true'));
    });
    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => this.deleteStudyCategory(btn.dataset.id));
    });
  }

  renderFootballCategories() {
    const container = document.getElementById('football-categories-list');
    container.innerHTML = this.footballCategories.map(cat => `
      <div class="category-item ${cat.isActive ? '' : 'inactive'}">
        <span class="category-color" style="background: ${cat.color}"></span>
        <span class="category-name">${cat.name}</span>
        ${cat.type ? `<span class="category-type">${cat.type}</span>` : ''}
        <div class="category-actions">
          <button class="btn btn-ghost btn-sm toggle-btn" data-id="${cat.id}" data-active="${cat.isActive}">
            ${cat.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button class="btn btn-ghost btn-sm delete-btn" data-id="${cat.id}">Delete</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => this.toggleFootballCategory(btn.dataset.id, btn.dataset.active !== 'true'));
    });
    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => this.deleteFootballCategory(btn.dataset.id));
    });
  }

  async toggleStudyCategory(id, isActive) {
    try {
      await api.updateStudyCategory(id, { isActive });
      await this.loadCategories();
      this.renderStudyCategories();
    } catch (error) {
      console.error('Toggle study category error:', error);
    }
  }

  async toggleFootballCategory(id, isActive) {
    try {
      await api.updateFootballCategory(id, { isActive });
      await this.loadCategories();
      this.renderFootballCategories();
    } catch (error) {
      console.error('Toggle football category error:', error);
    }
  }

  async deleteStudyCategory(id) {
    try {
      await api.deleteStudyCategory(id);
      await this.loadCategories();
      this.renderStudyCategories();
    } catch (error) {
      console.error('Delete study category error:', error);
    }
  }

  async deleteFootballCategory(id) {
    try {
      await api.deleteFootballCategory(id);
      await this.loadCategories();
      this.renderFootballCategories();
    } catch (error) {
      console.error('Delete football category error:', error);
    }
  }

  // ==================== WEEKLY PLAN TEMPLATES ====================

  async loadAndRenderTemplates(area) {
    try {
      const { templates } = await api.getWeeklyPlanTemplates(area);
      this.renderTemplateList(area, templates);
    } catch (error) {
      console.error(`Failed to load ${area} templates:`, error);
    }
  }

  renderTemplateList(area, templates) {
    const container = document.getElementById(`${area}-templates-list`);
    if (!container) return;
    const today = new Date().toISOString().split('T')[0];

    if (templates.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted,#94a3b8);font-size:0.875rem;padding:0.5rem 0">No templates yet. All sessions use the default schedule.</p>';
      return;
    }

    container.innerHTML = templates.map(t => {
      const isActive = t.startDate <= today && (!t.endDate || t.endDate >= today);
      return `
        <div class="category-item" style="justify-content:space-between">
          <div style="display:flex;flex-direction:column;gap:0.2rem">
            <span style="font-weight:500">${t.name}${isActive ? ' <span style="background:var(--primary,#6366f1);color:#fff;font-size:0.7rem;padding:0.1rem 0.4rem;border-radius:9999px;font-weight:600">Active</span>' : ''}</span>
            <span style="font-size:0.8rem;color:var(--text-muted,#94a3b8)">${t.startDate} — ${t.endDate || 'ongoing'}</span>
          </div>
          <div class="category-actions">
            <button class="btn btn-ghost btn-sm" data-edit-template="${t.id}" data-area="${area}">Edit</button>
            <button class="btn btn-ghost btn-sm" data-delete-template="${t.id}" data-area="${area}">Delete</button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('[data-edit-template]').forEach(btn => {
      btn.addEventListener('click', () => {
        const template = templates.find(t => t.id === parseInt(btn.dataset.editTemplate));
        this.openTemplateModal(btn.dataset.area, template);
      });
    });
    container.querySelectorAll('[data-delete-template]').forEach(btn => {
      btn.addEventListener('click', () => this.deleteTemplate(btn.dataset.area, btn.dataset.deleteTemplate));
    });
  }

  openTemplateModal(area, existing = null) {
    const isEdit = !!existing;
    const title = isEdit ? 'Edit Template' : `New ${area === 'study' ? 'Study' : 'Football'} Template`;
    this.openModal(title, `
      <form id="template-form">
        <div class="form-group">
          <label>Template Name</label>
          <input type="text" id="template-name" class="form-input" placeholder="e.g. Pre-season block" value="${existing ? existing.name : ''}" required>
        </div>
        <div class="form-group">
          <label>Start Date</label>
          <input type="date" id="template-start-date" class="form-input" value="${existing ? existing.startDate : ''}" required>
        </div>
        <div class="form-group">
          <label>End Date <span style="color:var(--text-muted,#94a3b8);font-size:0.8rem">(optional — leave blank for open-ended)</span></label>
          <input type="date" id="template-end-date" class="form-input" value="${existing && existing.endDate ? existing.endDate : ''}">
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%">${isEdit ? 'Save Changes' : 'Create Template'}</button>
      </form>
    `);

    document.getElementById('template-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('template-name').value.trim();
      const startDate = document.getElementById('template-start-date').value;
      const endDate = document.getElementById('template-end-date').value || null;
      if (!name || !startDate) return;
      try {
        if (isEdit) {
          await api.updateWeeklyPlanTemplate(existing.id, { name, startDate, endDate });
        } else {
          await api.createWeeklyPlanTemplate({ name, area, startDate, endDate });
        }
        this.closeModal();
        this.loadAndRenderTemplates(area);
      } catch (error) {
        alert(error.message || 'Failed to save template');
      }
    });
  }

  async deleteTemplate(area, id) {
    if (!confirm('Delete this template?')) return;
    try {
      await api.deleteWeeklyPlanTemplate(id);
      this.loadAndRenderTemplates(area);
    } catch (error) {
      if (error.message && error.message.includes('active sessions')) {
        alert('This template has active sessions. Remove them from the planner first.');
      } else {
        alert(error.message || 'Failed to delete template');
      }
    }
  }

  // ==================== MODALS ====================

  openModal(title, content) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = content;
    document.getElementById('modal-overlay').style.display = 'flex';
  }

  closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
  }

  openWeeklyPlanModal(area, preselectedDay = null) {
    const categories = area === 'study' ? this.studyCategories.filter(c => c.isActive) : this.footballCategories.filter(c => c.isActive);
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const todayIndex = (new Date().getDay() + 6) % 7;
    const defaultDay = preselectedDay !== null ? preselectedDay : todayIndex;
    const multiDay = area === 'football';

    const daySelector = multiDay
      ? `<div class="form-group">
          <label>Days</label>
          <div class="day-checkboxes" style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
            ${days.map((d, i) => `
              <label style="display: flex; align-items: center; gap: 0.25rem; cursor: pointer;">
                <input type="checkbox" name="weekly-plan-days" value="${i}" ${i === defaultDay ? 'checked' : ''}>
                ${d.slice(0, 3)}
              </label>
            `).join('')}
          </div>
        </div>`
      : `<div class="form-group">
          <label>Day of Week</label>
          <select id="weekly-plan-day" class="form-select" required>
            ${days.map((d, i) => `<option value="${i}" ${i === defaultDay ? 'selected' : ''}>${d}</option>`).join('')}
          </select>
        </div>`;

    this.openModal(`Add to ${area === 'study' ? 'Study' : 'Football'} Weekly Plan`, `
      <form id="weekly-plan-form">
        ${daySelector}
        <div class="form-group">
          <label>Category</label>
          <select id="weekly-plan-category" class="form-select" required>
            ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Duration (minutes)</label>
          <input type="number" id="weekly-plan-duration" class="form-input" value="45" min="5" max="480" required>
        </div>
        <div class="form-group">
          <label>Start Time (optional)</label>
          <input type="time" id="weekly-plan-start-time" class="form-input" min="07:00" max="18:00" step="900">
        </div>
        <button type="submit" class="btn btn-primary btn-block">Add to Weekly Plan</button>
      </form>
    `);

    document.getElementById('weekly-plan-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const selectedCatId = parseInt(document.getElementById('weekly-plan-category').value);
        const selectedCat = categories.find(c => c.id === selectedCatId);
        const durationMinutes = parseInt(document.getElementById('weekly-plan-duration').value);
        const startTime = document.getElementById('weekly-plan-start-time').value || null;
        const title = selectedCat ? selectedCat.name : 'Session';

        let selectedDays;
        if (multiDay) {
          selectedDays = Array.from(document.querySelectorAll('input[name="weekly-plan-days"]:checked'))
            .map(cb => parseInt(cb.value));
          if (selectedDays.length === 0) {
            return;
          }
        } else {
          selectedDays = [parseInt(document.getElementById('weekly-plan-day').value)];
        }

        for (const dayOfWeek of selectedDays) {
          await api.createWeeklyPlan({
            area,
            dayOfWeek,
            categoryId: selectedCatId,
            title,
            durationMinutes,
            intensity: null,
            startTime
          });
        }

        this.closeModal();
        if (area === 'study') this.loadStudyWeeklyPlan();
        else this.loadFootballWeeklyPlan();
      } catch (error) {
        console.error('Add weekly plan error:', error);
      }
    });
  }

  openLogModal(area) {
    const categories = area === 'study' ? this.studyCategories.filter(c => c.isActive) : this.footballCategories.filter(c => c.isActive);
    const now = new Date();
    const dateTimeStr = now.toISOString().slice(0, 16);

    this.openModal(`Add ${area === 'study' ? 'Study' : 'Football'} Log`, `
      <form id="log-form">
        <div class="form-group">
          <label>Date & Time</label>
          <input type="datetime-local" id="log-datetime" class="form-input" value="${dateTimeStr}" required>
        </div>
        <div class="form-group">
          <label>Category</label>
          <select id="log-category" class="form-select" required>
            ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Title</label>
          <input type="text" id="log-title" class="form-input" placeholder="What did you do?" required>
        </div>
        <div class="form-group">
          <label>Duration (minutes)</label>
          <input type="number" id="log-duration" class="form-input" value="45" min="1" max="480" required>
        </div>
        <div class="form-group">
          <label>Notes (optional)</label>
          <textarea id="log-notes" class="form-input" rows="2"></textarea>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Add Log</button>
      </form>
    `);

    document.getElementById('log-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api.createLog({
          area,
          dateTime: new Date(document.getElementById('log-datetime').value).toISOString(),
          categoryId: parseInt(document.getElementById('log-category').value),
          title: document.getElementById('log-title').value,
          durationMinutes: parseInt(document.getElementById('log-duration').value),
          notes: document.getElementById('log-notes').value || null
        });
        this.closeModal();
        if (area === 'study') this.loadStudyWeeklyPlan();
        else this.loadFootballWeeklyPlan();
      } catch (error) {
        console.error('Add log error:', error);
      }
    });
  }

  openCategoryModal(area) {
    this.openModal(`Add ${area === 'study' ? 'Study' : 'Football'} Category`, `
      <form id="category-form">
        <div class="form-group">
          <label>Name</label>
          <input type="text" id="category-name" class="form-input" placeholder="Category name" required>
        </div>
        <div class="form-group">
          <label>Color</label>
          <input type="color" id="category-color" value="${area === 'study' ? '#6366f1' : '#10b981'}">
        </div>
        ${area === 'football' ? `
          <div class="form-group">
            <label>Type (optional)</label>
            <select id="category-type" class="form-select">
              <option value="">None</option>
              <option value="team">Team</option>
              <option value="strength">Strength</option>
              <option value="endurance">Endurance</option>
              <option value="ball">Ball Work</option>
              <option value="recovery">Recovery</option>
            </select>
          </div>
        ` : ''}
        <button type="submit" class="btn btn-primary btn-block">Add Category</button>
      </form>
    `);

    document.getElementById('category-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        if (area === 'study') {
          await api.createStudyCategory(
            document.getElementById('category-name').value,
            document.getElementById('category-color').value
          );
        } else {
          await api.createFootballCategory(
            document.getElementById('category-name').value,
            document.getElementById('category-type')?.value || null,
            document.getElementById('category-color').value
          );
        }
        this.closeModal();
        await this.loadCategories();
        if (area === 'study') this.renderStudyCategories();
        else this.renderFootballCategories();
      } catch (error) {
        console.error('Add category error:', error);
      }
    });
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  try {
    window.app = new LogbookApp();
  } catch (error) {
    console.error('App initialization error:', error);
    document.getElementById('auth-view').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
  }
});
