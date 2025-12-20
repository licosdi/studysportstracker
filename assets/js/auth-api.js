// Authentication API client
const API_BASE_URL = window.location.origin;

class AuthAPI {
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

  // Register new user
  async register(name, email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Store token
      this.token = data.token;
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));

      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Login user
  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store token
      this.token = data.token;
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Get current user
  async getCurrentUser() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get user');
      }

      return data.user;
    } catch (error) {
      console.error('Get user error:', error);
      throw error;
    }
  }

  // Logout
  async logout() {
    try {
      if (this.token) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: this.getHeaders()
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage regardless of API call result
      this.token = null;
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.token;
  }

  // Get stored user
  getStoredUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  }
}

// Export singleton instance
const authAPI = new AuthAPI();
