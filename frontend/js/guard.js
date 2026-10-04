// frontend/js/guard.js
// Protects pages — checks auth + role

const Guard = {
  // Protect page. Call with allowed roles: Guard.protect('citizen')
  async protect(...allowedRoles) {
    const token = API.getToken();
    const role = API.getRole();

    // Not logged in
    if (!token) {
      window.location.replace('/login.html');
      return null;
    }

    // Wrong role
    if (allowedRoles.length && !allowedRoles.includes(role)) {
      Auth.redirectByRole(role);
      return null;
    }

    // Verify token still valid + get fresh user
    try {
      const res = await API.get('/auth/me');
      API.setUser(res.data, role);
      return res.data;
    } catch (err) {
      API.clearToken();
      window.location.replace('/login.html');
      return null;
    }
  },

  // Send heartbeat every 60s to update last_seen
  startHeartbeat() {
    const send = async () => {
      try { await API.get('/auth/me'); } catch (e) {}
    };
    send();
    setInterval(send, 60000);
  }
};