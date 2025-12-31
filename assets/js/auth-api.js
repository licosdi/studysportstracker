// API client for Study Tracker
const API_BASE_URL = window.location.origin;

class StudyTrackerAPI {
  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  // Set authorization header
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Handle API response
  async handleResponse(response) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  }

  // ==================== AUTH ====================

  async register(name, email, password) {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await this.handleResponse(response);
    this.token = data.token;
    localStorage.setItem('authToken', data.token);
    return data;
  }

  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await this.handleResponse(response);
    this.token = data.token;
    localStorage.setItem('authToken', data.token);
    return data;
  }

  async getCurrentUser() {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    const data = await this.handleResponse(response);
    return data.user;
  }

  async logout() {
    try {
      if (this.token) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: this.getHeaders()
        });
      }
    } finally {
      this.token = null;
      localStorage.removeItem('authToken');
    }
  }

  isAuthenticated() {
    return !!this.token;
  }

  // ==================== SESSIONS ====================

  async getSessions() {
    const response = await fetch(`${API_BASE_URL}/api/sessions`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    const data = await this.handleResponse(response);
    return data.sessions;
  }

  async createSession(session) {
    const response = await fetch(`${API_BASE_URL}/api/sessions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        date: session.date,
        subject: session.subject,
        duration: session.duration,
        category: session.category,
        plannerTaskId: session.plannerTaskId
      })
    });
    const data = await this.handleResponse(response);
    return data.session;
  }

  async updateSession(id, session) {
    const response = await fetch(`${API_BASE_URL}/api/sessions/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(session)
    });
    const data = await this.handleResponse(response);
    return data.session;
  }

  async deleteSession(id) {
    const response = await fetch(`${API_BASE_URL}/api/sessions/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    await this.handleResponse(response);
  }

  async getSessionStats(category) {
    const url = category
      ? `${API_BASE_URL}/api/sessions/stats?category=${category}`
      : `${API_BASE_URL}/api/sessions/stats`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    });
    return await this.handleResponse(response);
  }

  // ==================== PLANNER ====================

  async getPlannerTasks(weekStart) {
    const url = weekStart
      ? `${API_BASE_URL}/api/planner?weekStart=${encodeURIComponent(weekStart)}`
      : `${API_BASE_URL}/api/planner`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    });
    const data = await this.handleResponse(response);
    return data.tasks;
  }

  async createPlannerTask(task) {
    const response = await fetch(`${API_BASE_URL}/api/planner`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        subject: task.subject,
        duration: task.duration,
        day: task.day,
        category: task.category,
        weekStart: task.weekStart
      })
    });
    const data = await this.handleResponse(response);
    return data.task;
  }

  async updatePlannerTask(id, updates) {
    const response = await fetch(`${API_BASE_URL}/api/planner/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates)
    });
    const data = await this.handleResponse(response);
    return data.task;
  }

  async togglePlannerTask(id) {
    const response = await fetch(`${API_BASE_URL}/api/planner/${id}/toggle`, {
      method: 'PATCH',
      headers: this.getHeaders()
    });
    const data = await this.handleResponse(response);
    return data.task;
  }

  async deletePlannerTask(id) {
    const response = await fetch(`${API_BASE_URL}/api/planner/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    await this.handleResponse(response);
  }

  async clearPlannerWeek(weekStart) {
    const response = await fetch(`${API_BASE_URL}/api/planner/week/${encodeURIComponent(weekStart)}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    await this.handleResponse(response);
  }

  // ==================== PRESETS ====================

  async getPresets(category) {
    const url = category
      ? `${API_BASE_URL}/api/presets?category=${category}`
      : `${API_BASE_URL}/api/presets`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    });
    const data = await this.handleResponse(response);
    return data.presets;
  }

  async createPreset(subject, category) {
    const response = await fetch(`${API_BASE_URL}/api/presets`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ subject, category })
    });
    const data = await this.handleResponse(response);
    return data.preset;
  }

  async deletePreset(id) {
    const response = await fetch(`${API_BASE_URL}/api/presets/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    await this.handleResponse(response);
  }

  // ==================== NOTION ====================

  async getNotionConfig() {
    const response = await fetch(`${API_BASE_URL}/api/notion/config`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    const data = await this.handleResponse(response);
    return data.config;
  }

  async getNotionConfigFull() {
    const response = await fetch(`${API_BASE_URL}/api/notion/config/full`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    const data = await this.handleResponse(response);
    return data.config;
  }

  async saveNotionConfig(config) {
    const response = await fetch(`${API_BASE_URL}/api/notion/config`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        token: config.token,
        databaseId: config.databaseId,
        autoSync: config.autoSync,
        syncOnTimerComplete: config.syncOnTimerComplete
      })
    });
    await this.handleResponse(response);
  }

  async deleteNotionConfig() {
    const response = await fetch(`${API_BASE_URL}/api/notion/config`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    await this.handleResponse(response);
  }
}

// Export singleton instance
const api = new StudyTrackerAPI();
