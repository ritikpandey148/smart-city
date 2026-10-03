// frontend/js/api.js
// Central fetch wrapper — handles JWT, errors, base URL

const API = {
  getToken() {
    return localStorage.getItem('sc_token');
  },

  setToken(token) {
    localStorage.setItem('sc_token', token);
  },

  clearToken() {
    localStorage.removeItem('sc_token');
    localStorage.removeItem('sc_user');
    localStorage.removeItem('sc_role');
  },

  getUser() {
    const u = localStorage.getItem('sc_user');
    return u ? JSON.parse(u) : null;
  },

  getRole() {
    return localStorage.getItem('sc_role');
  },

  setUser(user, role) {
    localStorage.setItem('sc_user', JSON.stringify(user));
    localStorage.setItem('sc_role', role);
  },

  async request(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
    const headers = options.headers || {};

    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const token = this.getToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(url, { ...options, headers });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Session expired
        if (res.status === 401 && token) {
          // agar login endpoint nahi hai toh logout karo
          if (!endpoint.includes('/auth/login')) {
            this.clearToken();
          }
        }
        throw {
          status: res.status,
          message: data.message || 'Something went wrong',
          data
        };
      }

      return data;
    } catch (err) {
      if (err.status) throw err;
      throw { status: 0, message: 'Network error. Please check your connection.' };
    }
  },

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body)
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body)
    });
  },

  del(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};