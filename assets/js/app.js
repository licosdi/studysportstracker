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
    this.footballStatsMode = 'weekly';
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
    document.getElementById('user-name').textContent = this.currentUser.name;
    document.getElementById('settings-name').value = this.currentUser.name;
    document.getElementById('settings-email').value = this.currentUser.email;
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
      alert(error.message);
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
      alert(error.message);
    }
  }

  handleLogout() {
    api.logout();
    this.currentUser = null;
    this.showAuthView();
  }

  // ==================== DATA LOADING ====================

  async loadInitialData() {
    await this.loadCategories();
    await this.loadDashboard();
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

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateTo(link.dataset.view);
      });
    });

    // Weekly Plan buttons
    document.getElementById('add-study-weekly-plan-btn').addEventListener('click', () => this.openWeeklyPlanModal('study'));
    document.getElementById('add-football-weekly-plan-btn').addEventListener('click', () => this.openWeeklyPlanModal('football'));

    // Inline log buttons
    document.getElementById('add-study-log-inline-btn').addEventListener('click', () => this.openLogModal('study'));
    document.getElementById('add-football-log-inline-btn').addEventListener('click', () => this.openLogModal('football'));

    // Embedded log filters
    document.getElementById('study-embedded-log-filter').addEventListener('change', () => this.loadStudyEmbeddedLogs());
    document.getElementById('football-embedded-log-filter').addEventListener('change', () => this.loadFootballEmbeddedLogs());

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

    // Modal close
    document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal-overlay')) this.closeModal();
    });

    // Timer event listeners
    this.setupTimerListeners();
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
    document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`${view}-view`).classList.add('active');

    // Load view data
    switch (view) {
      case 'dashboard': this.loadDashboard(); break;
      case 'study-timer': this.loadStudyTimer(); break;
      case 'study-weekly-plan': this.loadStudyWeeklyPlan(); break;
      case 'study-stats': this.loadStudyStats(); break;
      case 'football-weekly-plan': this.loadFootballWeeklyPlan(); break;
      case 'football-stats': this.loadFootballStats(); break;
      case 'settings': this.loadSettings(); break;
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
      alert('Please select a category first.');
      return;
    }

    timer.categoryId = parseInt(categorySelect.value);
    timer.isRunning = true;
    timer.isPaused = false;

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

      alert(`Great job! You completed ${timer.duration} minutes of ${category?.name || area}!`);

      timer.isBreak = true;
      document.getElementById(`${area}-break-section`).style.display = 'block';
      document.getElementById(`${area}-start-btn`).disabled = true;
      document.getElementById(`${area}-pause-btn`).disabled = true;

      const label = document.getElementById(`${area}-timer-label`);
      if (label) label.textContent = 'Session complete!';

    } catch (error) {
      console.error('Failed to log session:', error);
      alert('Session completed but failed to save. Please log manually.');
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
    alert('Break complete! Ready for the next session.');
  }

  // ==================== WEEKLY PLAN ====================

  async loadStudyWeeklyPlan() {
    const weekStart = this.formatDate(this.getWeekStart(new Date()));
    try {
      const { items } = await api.getWeeklyPlanStatus(weekStart, 'study');
      this.renderWeeklyPlanGrid('study-weekly-plan-grid', items, 'study');
      this.updateWeeklyProgress(items, 'study');
      this.loadStudyEmbeddedLogs();
    } catch (error) {
      console.error('Failed to load study weekly plan:', error);
    }
  }

  async loadFootballWeeklyPlan() {
    const weekStart = this.formatDate(this.getWeekStart(new Date()));
    try {
      const { items } = await api.getWeeklyPlanStatus(weekStart, 'football');
      this.renderWeeklyPlanGrid('football-weekly-plan-grid', items, 'football');
      this.updateWeeklyProgress(items, 'football');
      this.loadFootballEmbeddedLogs();
    } catch (error) {
      console.error('Failed to load football weekly plan:', error);
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
          <div class="day-items">
            ${dayItems.map(item => {
              const isCompleted = !!item.isCompleted;
              return `
                <div class="plan-item ${isCompleted ? 'completed' : ''}" data-id="${item.id}">
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
      alert(error.message);
      if (area === 'study') this.loadStudyWeeklyPlan();
      else this.loadFootballWeeklyPlan();
    }
  }

  async uncompleteWeeklyPlan(id, area) {
    try {
      await api.uncompleteWeeklyPlan(id);
      if (area === 'study') this.loadStudyWeeklyPlan();
      else this.loadFootballWeeklyPlan();
    } catch (error) {
      alert(error.message);
      if (area === 'study') this.loadStudyWeeklyPlan();
      else this.loadFootballWeeklyPlan();
    }
  }

  async deleteWeeklyPlan(id, area) {
    if (!confirm('Remove this item from your weekly plan?')) return;
    try {
      await api.deleteWeeklyPlan(id);
      if (area === 'study') this.loadStudyWeeklyPlan();
      else this.loadFootballWeeklyPlan();
    } catch (error) {
      alert(error.message);
    }
  }

  // ==================== EMBEDDED LOGS ====================

  async loadStudyEmbeddedLogs() {
    const filter = document.getElementById('study-embedded-log-filter').value;
    const params = { area: 'study' };

    const today = new Date();
    if (filter === 'week') {
      const weekStart = this.getWeekStart(today);
      params.startDate = this.formatDate(weekStart);
    } else if (filter === 'month') {
      params.startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    }

    try {
      const { entries } = await api.getLogs(params);
      this.renderLogList('study-embedded-log-list', entries, 'study');
    } catch (error) {
      console.error('Failed to load study logs:', error);
    }
  }

  async loadFootballEmbeddedLogs() {
    const filter = document.getElementById('football-embedded-log-filter').value;
    const params = { area: 'football' };

    const today = new Date();
    if (filter === 'week') {
      const weekStart = this.getWeekStart(today);
      params.startDate = this.formatDate(weekStart);
    } else if (filter === 'month') {
      params.startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    }

    try {
      const { entries } = await api.getLogs(params);
      this.renderLogList('football-embedded-log-list', entries, 'football');
    } catch (error) {
      console.error('Failed to load football logs:', error);
    }
  }

  renderLogList(containerId, entries, area) {
    const container = document.getElementById(containerId);
    if (entries.length === 0) {
      container.innerHTML = `<p class="empty-state">No ${area} logs yet</p>`;
      return;
    }

    container.innerHTML = entries.map(entry => `
      <div class="log-item" data-id="${entry.id}">
        <div class="log-item-main">
          <span class="category-badge" style="background: ${entry.categoryColor}">${entry.categoryName}</span>
          <span class="log-item-title">${entry.title}</span>
        </div>
        <div class="log-item-meta">
          <span class="log-item-duration">${this.formatDuration(entry.durationMinutes)}</span>
          <span class="log-item-date">${this.formatDateTime(entry.dateTime)}</span>
          ${entry.weeklyPlanItemId ? '<span class="from-plan-badge">from plan</span>' : ''}
          ${entry.planItemId ? '<span class="from-plan-badge">from plan</span>' : ''}
        </div>
        ${entry.notes ? `<div class="log-item-notes">${entry.notes}</div>` : ''}
        <div class="log-item-actions">
          <button class="delete-btn" data-id="${entry.id}">Delete</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.log-item-actions .delete-btn').forEach(btn => {
      btn.addEventListener('click', () => this.deleteLog(btn.dataset.id, area));
    });
  }

  async deleteLog(id, area) {
    if (!confirm('Delete this log entry?')) return;
    try {
      await api.deleteLog(id);
      if (area === 'study') this.loadStudyEmbeddedLogs();
      else this.loadFootballEmbeddedLogs();
    } catch (error) {
      alert(error.message);
    }
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
    if (this.footballStatsMode === 'weekly') {
      const weekStart = this.getWeekStart(this.footballStatsDate);
      document.getElementById('football-stats-period-display').textContent = this.formatWeekDisplay(weekStart);
      try {
        const data = await api.getWeeklyStats(this.formatDate(weekStart), 'football');
        this.renderAreaStats('football', data);
      } catch (error) {
        console.error('Failed to load football stats:', error);
      }
    } else {
      const year = this.footballStatsDate.getFullYear();
      const month = this.footballStatsDate.getMonth() + 1;
      document.getElementById('football-stats-period-display').textContent =
        this.footballStatsDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      try {
        const data = await api.getMonthlyStats(year, month, 'football');
        this.renderAreaStats('football', data);
      } catch (error) {
        console.error('Failed to load football stats:', error);
      }
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
    if (this.footballStatsMode === 'weekly') {
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
      alert(error.message);
    }
  }

  async toggleFootballCategory(id, isActive) {
    try {
      await api.updateFootballCategory(id, { isActive });
      await this.loadCategories();
      this.renderFootballCategories();
    } catch (error) {
      alert(error.message);
    }
  }

  async deleteStudyCategory(id) {
    if (!confirm('Delete this category?')) return;
    try {
      await api.deleteStudyCategory(id);
      await this.loadCategories();
      this.renderStudyCategories();
    } catch (error) {
      alert(error.message);
    }
  }

  async deleteFootballCategory(id) {
    if (!confirm('Delete this category?')) return;
    try {
      await api.deleteFootballCategory(id);
      await this.loadCategories();
      this.renderFootballCategories();
    } catch (error) {
      alert(error.message);
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

    this.openModal(`Add to ${area === 'study' ? 'Study' : 'Football'} Weekly Plan`, `
      <form id="weekly-plan-form">
        <div class="form-group">
          <label>Day of Week</label>
          <select id="weekly-plan-day" class="form-select" required>
            ${days.map((d, i) => `<option value="${i}" ${i === defaultDay ? 'selected' : ''}>${d}</option>`).join('')}
          </select>
        </div>
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
        <button type="submit" class="btn btn-primary btn-block">Add to Weekly Plan</button>
      </form>
    `);

    document.getElementById('weekly-plan-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const selectedCatId = parseInt(document.getElementById('weekly-plan-category').value);
        const selectedCat = categories.find(c => c.id === selectedCatId);
        await api.createWeeklyPlan({
          area,
          dayOfWeek: parseInt(document.getElementById('weekly-plan-day').value),
          categoryId: selectedCatId,
          title: selectedCat ? selectedCat.name : 'Session',
          durationMinutes: parseInt(document.getElementById('weekly-plan-duration').value),
          intensity: null
        });
        this.closeModal();
        if (area === 'study') this.loadStudyWeeklyPlan();
        else this.loadFootballWeeklyPlan();
      } catch (error) {
        alert(error.message);
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
        if (area === 'study') this.loadStudyEmbeddedLogs();
        else this.loadFootballEmbeddedLogs();
      } catch (error) {
        alert(error.message);
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
        alert(error.message);
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
