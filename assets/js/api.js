// API Client for Logbook
const API_BASE = window.location.origin;

class API {
  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(method, endpoint, data = null) {
    const options = {
      method,
      headers: this.getHeaders()
    };
    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Request failed');
    }
    return result;
  }

  // ==================== AUTH ====================

  async login(email, password) {
    const result = await this.request('POST', '/api/auth/login', { email, password });
    this.token = result.token;
    localStorage.setItem('authToken', result.token);
    return result;
  }

  async register(name, email, password) {
    const result = await this.request('POST', '/api/auth/register', { name, email, password });
    this.token = result.token;
    localStorage.setItem('authToken', result.token);
    return result;
  }

  async getCurrentUser() {
    return await this.request('GET', '/api/auth/me');
  }

  logout() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  isAuthenticated() {
    return !!this.token;
  }

  // ==================== CATEGORIES ====================

  async getStudyCategories(activeOnly = false) {
    const endpoint = activeOnly ? '/api/categories/study/active' : '/api/categories/study';
    return await this.request('GET', endpoint);
  }

  async createStudyCategory(name, color) {
    return await this.request('POST', '/api/categories/study', { name, color });
  }

  async updateStudyCategory(id, data) {
    return await this.request('PUT', `/api/categories/study/${id}`, data);
  }

  async deleteStudyCategory(id) {
    return await this.request('DELETE', `/api/categories/study/${id}`);
  }

  async getFootballCategories(activeOnly = false) {
    const endpoint = activeOnly ? '/api/categories/football/active' : '/api/categories/football';
    return await this.request('GET', endpoint);
  }

  async createFootballCategory(name, type, color) {
    return await this.request('POST', '/api/categories/football', { name, type, color });
  }

  async updateFootballCategory(id, data) {
    return await this.request('PUT', `/api/categories/football/${id}`, data);
  }

  async deleteFootballCategory(id) {
    return await this.request('DELETE', `/api/categories/football/${id}`);
  }

  // ==================== PLANS ====================

  async getPlans(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request('GET', `/api/plans${query ? '?' + query : ''}`);
  }

  async getWeekPlans(weekStart, area = null) {
    const params = { weekStart };
    if (area) params.area = area;
    const query = new URLSearchParams(params).toString();
    return await this.request('GET', `/api/plans/week?${query}`);
  }

  async createPlan(data) {
    return await this.request('POST', '/api/plans', data);
  }

  async updatePlan(id, data) {
    return await this.request('PUT', `/api/plans/${id}`, data);
  }

  async completePlan(id, data = {}) {
    return await this.request('POST', `/api/plans/${id}/complete`, data);
  }

  async skipPlan(id) {
    return await this.request('POST', `/api/plans/${id}/skip`);
  }

  async deletePlan(id) {
    return await this.request('DELETE', `/api/plans/${id}`);
  }

  // ==================== LOGS ====================

  async getLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request('GET', `/api/logs${query ? '?' + query : ''}`);
  }

  async getTodayLogs(area = null) {
    const params = area ? { area } : {};
    const query = new URLSearchParams(params).toString();
    return await this.request('GET', `/api/logs/today${query ? '?' + query : ''}`);
  }

  async createLog(data) {
    return await this.request('POST', '/api/logs', data);
  }

  async updateLog(id, data) {
    return await this.request('PUT', `/api/logs/${id}`, data);
  }

  async deleteLog(id) {
    return await this.request('DELETE', `/api/logs/${id}`);
  }

  // ==================== WEEKLY PLANS ====================

  async getWeeklyPlans(area = null) {
    const params = {};
    if (area) params.area = area;
    const query = new URLSearchParams(params).toString();
    return await this.request('GET', `/api/weekly-plans${query ? '?' + query : ''}`);
  }

  async createWeeklyPlan(data) {
    return await this.request('POST', '/api/weekly-plans', data);
  }

  async updateWeeklyPlan(id, data) {
    return await this.request('PUT', `/api/weekly-plans/${id}`, data);
  }

  async deleteWeeklyPlan(id) {
    return await this.request('DELETE', `/api/weekly-plans/${id}`);
  }

  async completeWeeklyPlan(id) {
    return await this.request('POST', `/api/weekly-plans/${id}/complete`);
  }

  async uncompleteWeeklyPlan(id) {
    return await this.request('POST', `/api/weekly-plans/${id}/uncomplete`);
  }

  async getWeeklyPlanStatus(weekStart, area = null) {
    const params = { weekStart };
    if (area) params.area = area;
    const query = new URLSearchParams(params).toString();
    return await this.request('GET', `/api/weekly-plans/week-status?${query}`);
  }

  // ==================== ANALYTICS ====================

  async getDashboard() {
    return await this.request('GET', '/api/analytics/dashboard');
  }

  async getWeeklyStats(weekStart, area = null) {
    let url = `/api/analytics/weekly?weekStart=${weekStart}`;
    if (area) url += `&area=${area}`;
    return await this.request('GET', url);
  }

  async getMonthlyStats(year, month, area = null) {
    let url = `/api/analytics/monthly?year=${year}&month=${month}`;
    if (area) url += `&area=${area}`;
    return await this.request('GET', url);
  }
}

const api = new API();
