// Logbook Application
class LogbookApp {
  constructor() {
    this.currentUser = null;
    this.currentView = 'dashboard';
    this.studyCategories = [];
    this.footballCategories = [];
    this.studyPlanWeekStart = this.getWeekStart(new Date());
    this.footballPlanWeekStart = this.getWeekStart(new Date());
    this.analyticsMode = 'weekly';
    this.analyticsDate = new Date();

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
      football: {
        duration: 45,
        remaining: 45 * 60,
        breakRemaining: 5 * 60,
        isRunning: false,
        isPaused: false,
        isBreak: false,
        interval: null,
        categoryId: null,
        intensity: 'medium'
      }
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

      // Pending plans
      const pendingPlansEl = document.getElementById('pending-plans-list');
      if (data.today.pendingPlans > 0) {
        const plans = await api.getPlans({ startDate: data.today.date, endDate: data.today.date });
        const pending = plans.items.filter(p => p.status === 'planned');
        pendingPlansEl.innerHTML = pending.map(p => `
          <div class="list-item">
            <span class="category-badge" style="background: ${p.categoryColor}">${p.categoryName}</span>
            <span class="list-item-title">${p.title}</span>
            <span class="list-item-meta">${p.durationMinutes}m</span>
          </div>
        `).join('');
      } else {
        pendingPlansEl.innerHTML = '<p class="empty-state">No pending plans for today</p>';
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

    // Study Plan
    document.getElementById('study-plan-prev-week').addEventListener('click', () => this.changeStudyPlanWeek(-1));
    document.getElementById('study-plan-next-week').addEventListener('click', () => this.changeStudyPlanWeek(1));
    document.getElementById('add-study-plan-btn').addEventListener('click', () => this.openPlanModal('study'));

    // Football Plan
    document.getElementById('football-plan-prev-week').addEventListener('click', () => this.changeFootballPlanWeek(-1));
    document.getElementById('football-plan-next-week').addEventListener('click', () => this.changeFootballPlanWeek(1));
    document.getElementById('add-football-plan-btn').addEventListener('click', () => this.openPlanModal('football'));

    // Log buttons
    document.getElementById('add-study-log-btn').addEventListener('click', () => this.openLogModal('study'));
    document.getElementById('add-football-log-btn').addEventListener('click', () => this.openLogModal('football'));

    // Log filters
    document.getElementById('study-log-filter').addEventListener('change', () => this.loadStudyLogs());
    document.getElementById('study-log-category-filter').addEventListener('change', () => this.loadStudyLogs());
    document.getElementById('football-log-filter').addEventListener('change', () => this.loadFootballLogs());
    document.getElementById('football-log-category-filter').addEventListener('change', () => this.loadFootballLogs());

    // Analytics
    document.querySelectorAll('[data-period]').forEach(btn => {
      btn.addEventListener('click', () => this.setAnalyticsPeriod(btn.dataset.period));
    });
    document.getElementById('analytics-prev').addEventListener('click', () => this.changeAnalyticsPeriod(-1));
    document.getElementById('analytics-next').addEventListener('click', () => this.changeAnalyticsPeriod(1));

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

    // Football timer
    document.getElementById('football-start-btn')?.addEventListener('click', () => this.startTimer('football'));
    document.getElementById('football-pause-btn')?.addEventListener('click', () => this.pauseTimer('football'));
    document.getElementById('football-reset-btn')?.addEventListener('click', () => this.resetTimer('football'));
    document.getElementById('football-timer-duration')?.addEventListener('change', (e) => this.setTimerDuration('football', parseInt(e.target.value)));
    document.getElementById('football-start-break-btn')?.addEventListener('click', () => this.startBreak('football'));
    document.getElementById('football-skip-break-btn')?.addEventListener('click', () => this.skipBreak('football'));
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
      case 'study-plan': this.loadStudyPlan(); break;
      case 'study-log': this.loadStudyLogs(); break;
      case 'football-timer': this.loadFootballTimer(); break;
      case 'football-plan': this.loadFootballPlan(); break;
      case 'football-log': this.loadFootballLogs(); break;
      case 'analytics': this.loadAnalytics(); break;
      case 'settings': this.loadSettings(); break;
    }
  }

  // ==================== TIMER ====================

  loadStudyTimer() {
    this.populateTimerCategories('study');
    this.updateTimerDisplay('study');
  }

  loadFootballTimer() {
    this.populateTimerCategories('football');
    this.updateTimerDisplay('football');
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
    const circumference = 2 * Math.PI * 45; // r=45 from SVG
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

    // Get category name for label
    const categories = area === 'study' ? this.studyCategories : this.footballCategories;
    const category = categories.find(c => c.id === timer.categoryId);
    const label = document.getElementById(`${area}-timer-label`);
    if (label && category) {
      label.textContent = `Working: ${category.name}`;
    }

    // Disable controls
    document.getElementById(`${area}-start-btn`).disabled = true;
    document.getElementById(`${area}-pause-btn`).disabled = false;
    document.getElementById(`${area}-timer-category`).disabled = true;
    document.getElementById(`${area}-timer-duration`).disabled = true;

    // Start interval
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
      // Resume
      timer.isPaused = false;
      pauseBtn.textContent = 'Pause';
      this.startTimer(area);
    } else {
      // Pause
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

    // Re-enable controls
    document.getElementById(`${area}-start-btn`).disabled = false;
    document.getElementById(`${area}-pause-btn`).disabled = true;
    document.getElementById(`${area}-pause-btn`).textContent = 'Pause';
    document.getElementById(`${area}-timer-category`).disabled = false;
    document.getElementById(`${area}-timer-duration`).disabled = false;

    // Hide break section
    document.getElementById(`${area}-break-section`).style.display = 'none';

    // Update displays
    const label = document.getElementById(`${area}-timer-label`);
    if (label) label.textContent = 'Ready to start';

    this.updateTimerDisplay(area);
    this.updateTimerProgress(area);
    this.updateBreakDisplay(area);
  }

  async completeSession(area) {
    const timer = this.timers[area];
    clearInterval(timer.interval);

    // Get category info
    const categories = area === 'study' ? this.studyCategories : this.footballCategories;
    const category = categories.find(c => c.id === timer.categoryId);

    try {
      // Log the session
      const logData = {
        area,
        dateTime: new Date().toISOString(),
        categoryId: timer.categoryId,
        title: `${category?.name || 'Session'} (Timer)`,
        durationMinutes: timer.duration,
        notes: 'Completed via Pomodoro timer'
      };

      if (area === 'football') {
        logData.intensity = document.getElementById('football-timer-intensity')?.value || 'medium';
      }

      await api.createLog(logData);

      alert(`Great job! You completed ${timer.duration} minutes of ${category?.name || area}!`);

      // Show break section
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

    // Reset for next session
    this.resetTimer(area);
    alert('Break complete! Ready for the next session.');
  }

  // ==================== STUDY PLAN ====================

  async loadStudyPlan() {
    const weekStart = this.formatDate(this.studyPlanWeekStart);
    document.getElementById('study-plan-week-display').textContent = this.formatWeekDisplay(this.studyPlanWeekStart);

    try {
      const { items } = await api.getWeekPlans(weekStart, 'study');
      this.renderWeekGrid('study-plan-grid', this.studyPlanWeekStart, items);
    } catch (error) {
      console.error('Failed to load study plan:', error);
    }
  }

  changeStudyPlanWeek(delta) {
    this.studyPlanWeekStart.setDate(this.studyPlanWeekStart.getDate() + (delta * 7));
    this.loadStudyPlan();
  }

  // ==================== FOOTBALL PLAN ====================

  async loadFootballPlan() {
    const weekStart = this.formatDate(this.footballPlanWeekStart);
    document.getElementById('football-plan-week-display').textContent = this.formatWeekDisplay(this.footballPlanWeekStart);

    try {
      const { items } = await api.getWeekPlans(weekStart, 'football');
      this.renderWeekGrid('football-plan-grid', this.footballPlanWeekStart, items);
    } catch (error) {
      console.error('Failed to load football plan:', error);
    }
  }

  changeFootballPlanWeek(delta) {
    this.footballPlanWeekStart.setDate(this.footballPlanWeekStart.getDate() + (delta * 7));
    this.loadFootballPlan();
  }

  // ==================== WEEK GRID ====================

  renderWeekGrid(containerId, weekStart, items) {
    const container = document.getElementById(containerId);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const area = containerId.includes('study') ? 'study' : 'football';

    let html = '';
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateStr = this.formatDate(date);
      const dayItems = items.filter(item => item.date === dateStr);
      const isToday = dateStr === this.formatDate(new Date());

      html += `
        <div class="day-column ${isToday ? 'today' : ''}">
          <div class="day-header">
            <span class="day-name">${days[i]}</span>
            <span class="day-date">${date.getDate()}</span>
          </div>
          <div class="day-items">
            ${dayItems.map(item => this.renderPlanItem(item)).join('')}
          </div>
          <button class="add-day-item-btn" data-date="${dateStr}" data-area="${area}">+ Add</button>
        </div>
      `;
    }
    container.innerHTML = html;

    // Add event listeners
    container.querySelectorAll('.add-day-item-btn').forEach(btn => {
      btn.addEventListener('click', () => this.openPlanModal(btn.dataset.area, btn.dataset.date));
    });

    container.querySelectorAll('.plan-item').forEach(el => {
      const id = el.dataset.id;
      el.querySelector('.complete-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.completePlan(id, area);
      });
      el.querySelector('.skip-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.skipPlan(id, area);
      });
      el.querySelector('.delete-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deletePlan(id, area);
      });
    });
  }

  renderPlanItem(item) {
    const statusClass = item.status === 'completed' ? 'completed' : item.status === 'skipped' ? 'skipped' : '';
    return `
      <div class="plan-item ${statusClass}" data-id="${item.id}">
        <div class="plan-item-header">
          <span class="category-badge" style="background: ${item.categoryColor}">${item.categoryName}</span>
          ${item.intensity ? `<span class="intensity-badge ${item.intensity}">${item.intensity}</span>` : ''}
        </div>
        <div class="plan-item-title">${item.title}</div>
        <div class="plan-item-meta">${item.durationMinutes}m</div>
        ${item.status === 'planned' ? `
          <div class="plan-item-actions">
            <button class="complete-btn" title="Complete">&#10003;</button>
            <button class="skip-btn" title="Skip">&#10005;</button>
            <button class="delete-btn" title="Delete">&#128465;</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  async completePlan(id, area) {
    try {
      await api.completePlan(id);
      if (area === 'study') this.loadStudyPlan();
      else this.loadFootballPlan();
    } catch (error) {
      alert(error.message);
    }
  }

  async skipPlan(id, area) {
    try {
      await api.skipPlan(id);
      if (area === 'study') this.loadStudyPlan();
      else this.loadFootballPlan();
    } catch (error) {
      alert(error.message);
    }
  }

  async deletePlan(id, area) {
    if (!confirm('Delete this plan item?')) return;
    try {
      await api.deletePlan(id);
      if (area === 'study') this.loadStudyPlan();
      else this.loadFootballPlan();
    } catch (error) {
      alert(error.message);
    }
  }

  // ==================== LOGS ====================

  async loadStudyLogs() {
    const filter = document.getElementById('study-log-filter').value;
    const categoryId = document.getElementById('study-log-category-filter').value;

    // Populate category filter
    const catFilter = document.getElementById('study-log-category-filter');
    const currentVal = catFilter.value;
    catFilter.innerHTML = '<option value="">All Categories</option>' +
      this.studyCategories.filter(c => c.isActive).map(c =>
        `<option value="${c.id}">${c.name}</option>`
      ).join('');
    catFilter.value = currentVal;

    const params = { area: 'study' };
    if (categoryId) params.categoryId = categoryId;

    const today = new Date();
    if (filter === 'week') {
      const weekStart = this.getWeekStart(today);
      params.startDate = this.formatDate(weekStart);
    } else if (filter === 'month') {
      params.startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    }

    try {
      const { entries } = await api.getLogs(params);
      this.renderLogList('study-log-list', entries, 'study');
    } catch (error) {
      console.error('Failed to load study logs:', error);
    }
  }

  async loadFootballLogs() {
    const filter = document.getElementById('football-log-filter').value;
    const categoryId = document.getElementById('football-log-category-filter').value;

    // Populate category filter
    const catFilter = document.getElementById('football-log-category-filter');
    const currentVal = catFilter.value;
    catFilter.innerHTML = '<option value="">All Categories</option>' +
      this.footballCategories.filter(c => c.isActive).map(c =>
        `<option value="${c.id}">${c.name}</option>`
      ).join('');
    catFilter.value = currentVal;

    const params = { area: 'football' };
    if (categoryId) params.categoryId = categoryId;

    const today = new Date();
    if (filter === 'week') {
      const weekStart = this.getWeekStart(today);
      params.startDate = this.formatDate(weekStart);
    } else if (filter === 'month') {
      params.startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    }

    try {
      const { entries } = await api.getLogs(params);
      this.renderLogList('football-log-list', entries, 'football');
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
          ${entry.intensity ? `<span class="intensity-badge ${entry.intensity}">${entry.intensity}</span>` : ''}
        </div>
        <div class="log-item-meta">
          <span class="log-item-duration">${this.formatDuration(entry.durationMinutes)}</span>
          <span class="log-item-date">${this.formatDateTime(entry.dateTime)}</span>
          ${entry.planItemId ? '<span class="from-plan-badge">from plan</span>' : ''}
        </div>
        ${entry.notes ? `<div class="log-item-notes">${entry.notes}</div>` : ''}
        <div class="log-item-actions">
          <button class="edit-btn" data-id="${entry.id}">Edit</button>
          <button class="delete-btn" data-id="${entry.id}">Delete</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => this.deleteLog(btn.dataset.id, area));
    });
  }

  async deleteLog(id, area) {
    if (!confirm('Delete this log entry?')) return;
    try {
      await api.deleteLog(id);
      if (area === 'study') this.loadStudyLogs();
      else this.loadFootballLogs();
    } catch (error) {
      alert(error.message);
    }
  }

  // ==================== ANALYTICS ====================

  async loadAnalytics() {
    if (this.analyticsMode === 'weekly') {
      await this.loadWeeklyAnalytics();
    } else {
      await this.loadMonthlyAnalytics();
    }
  }

  setAnalyticsPeriod(mode) {
    this.analyticsMode = mode;
    document.querySelectorAll('[data-period]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.period === mode);
    });
    this.loadAnalytics();
  }

  changeAnalyticsPeriod(delta) {
    if (this.analyticsMode === 'weekly') {
      this.analyticsDate.setDate(this.analyticsDate.getDate() + (delta * 7));
    } else {
      this.analyticsDate.setMonth(this.analyticsDate.getMonth() + delta);
    }
    this.loadAnalytics();
  }

  async loadWeeklyAnalytics() {
    const weekStart = this.getWeekStart(this.analyticsDate);
    document.getElementById('analytics-period-display').textContent = this.formatWeekDisplay(weekStart);

    try {
      const data = await api.getWeeklyStats(this.formatDate(weekStart));
      this.renderAnalyticsData(data);
    } catch (error) {
      console.error('Failed to load weekly analytics:', error);
    }
  }

  async loadMonthlyAnalytics() {
    const year = this.analyticsDate.getFullYear();
    const month = this.analyticsDate.getMonth() + 1;
    document.getElementById('analytics-period-display').textContent =
      this.analyticsDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    try {
      const data = await api.getMonthlyStats(year, month);
      this.renderAnalyticsData(data);
    } catch (error) {
      console.error('Failed to load monthly analytics:', error);
    }
  }

  renderAnalyticsData(data) {
    document.getElementById('analytics-study-time').textContent = this.formatDuration(data.study.totalMinutes);
    document.getElementById('analytics-study-sessions').textContent = data.study.totalSessions;
    document.getElementById('analytics-football-time').textContent = this.formatDuration(data.football.totalMinutes);
    document.getElementById('analytics-football-sessions').textContent = data.football.totalSessions;

    // Study breakdown
    const studyBreakdown = document.getElementById('analytics-study-breakdown');
    studyBreakdown.innerHTML = data.study.breakdown.map(cat => `
      <div class="breakdown-item">
        <div class="breakdown-label">
          <span class="breakdown-color" style="background: ${cat.categoryColor}"></span>
          ${cat.categoryName}
        </div>
        <div class="breakdown-value">${this.formatDuration(cat.totalMinutes)}</div>
        <div class="breakdown-bar">
          <div class="breakdown-bar-fill" style="width: ${(cat.totalMinutes / data.study.totalMinutes * 100) || 0}%; background: ${cat.categoryColor}"></div>
        </div>
      </div>
    `).join('') || '<p class="empty-state">No data</p>';

    // Football breakdown
    const footballBreakdown = document.getElementById('analytics-football-breakdown');
    footballBreakdown.innerHTML = data.football.breakdown.map(cat => `
      <div class="breakdown-item">
        <div class="breakdown-label">
          <span class="breakdown-color" style="background: ${cat.categoryColor}"></span>
          ${cat.categoryName}
        </div>
        <div class="breakdown-value">${this.formatDuration(cat.totalMinutes)}</div>
        <div class="breakdown-bar">
          <div class="breakdown-bar-fill" style="width: ${(cat.totalMinutes / data.football.totalMinutes * 100) || 0}%; background: ${cat.categoryColor}"></div>
        </div>
      </div>
    `).join('') || '<p class="empty-state">No data</p>';

    // Daily chart
    const chartContainer = document.getElementById('daily-chart');
    if (data.daily && data.daily.length > 0) {
      const maxMinutes = Math.max(...data.daily.map(d => d.totalMinutes), 60);
      chartContainer.innerHTML = `
        <div class="bar-chart">
          ${data.daily.map(d => `
            <div class="bar-group">
              <div class="bar" style="height: ${(d.totalMinutes / maxMinutes * 100)}%; background: ${d.area === 'study' ? '#6366f1' : '#10b981'}"></div>
              <div class="bar-label">${new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      chartContainer.innerHTML = '<p class="empty-state">No data for this period</p>';
    }
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

  openPlanModal(area, date = null) {
    const categories = area === 'study' ? this.studyCategories.filter(c => c.isActive) : this.footballCategories.filter(c => c.isActive);
    const defaultDate = date || this.formatDate(new Date());

    this.openModal(`Add ${area === 'study' ? 'Study' : 'Football'} Plan`, `
      <form id="plan-form">
        <div class="form-group">
          <label>Date</label>
          <input type="date" id="plan-date" value="${defaultDate}" required>
        </div>
        <div class="form-group">
          <label>Category</label>
          <select id="plan-category" required>
            ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Title</label>
          <input type="text" id="plan-title" placeholder="What will you do?" required>
        </div>
        <div class="form-group">
          <label>Duration (minutes)</label>
          <input type="number" id="plan-duration" value="45" min="5" max="480" required>
        </div>
        <div class="form-group">
          <label>Intensity</label>
          <select id="plan-intensity">
            <option value="">None</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div class="form-group">
          <label>Notes (optional)</label>
          <textarea id="plan-notes" rows="2"></textarea>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Add Plan</button>
      </form>
    `);

    document.getElementById('plan-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api.createPlan({
          area,
          date: document.getElementById('plan-date').value,
          categoryId: parseInt(document.getElementById('plan-category').value),
          title: document.getElementById('plan-title').value,
          durationMinutes: parseInt(document.getElementById('plan-duration').value),
          intensity: document.getElementById('plan-intensity').value || null,
          notes: document.getElementById('plan-notes').value || null
        });
        this.closeModal();
        if (area === 'study') this.loadStudyPlan();
        else this.loadFootballPlan();
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
          <input type="datetime-local" id="log-datetime" value="${dateTimeStr}" required>
        </div>
        <div class="form-group">
          <label>Category</label>
          <select id="log-category" required>
            ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Title</label>
          <input type="text" id="log-title" placeholder="What did you do?" required>
        </div>
        <div class="form-group">
          <label>Duration (minutes)</label>
          <input type="number" id="log-duration" value="45" min="1" max="480" required>
        </div>
        <div class="form-group">
          <label>Intensity</label>
          <select id="log-intensity">
            <option value="">None</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div class="form-group">
          <label>Notes (optional)</label>
          <textarea id="log-notes" rows="2"></textarea>
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
          intensity: document.getElementById('log-intensity').value || null,
          notes: document.getElementById('log-notes').value || null
        });
        this.closeModal();
        if (area === 'study') this.loadStudyLogs();
        else this.loadFootballLogs();
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
          <input type="text" id="category-name" placeholder="Category name" required>
        </div>
        <div class="form-group">
          <label>Color</label>
          <input type="color" id="category-color" value="${area === 'study' ? '#6366f1' : '#10b981'}">
        </div>
        ${area === 'football' ? `
          <div class="form-group">
            <label>Type (optional)</label>
            <select id="category-type">
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
    // Show auth view as fallback
    document.getElementById('auth-view').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
  }
});
