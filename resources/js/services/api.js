import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Token refresh queue ───────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token));
  failedQueue = [];
};

const clearAuth = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_refresh_token');
  localStorage.removeItem('auth_user');
};

// ── 401 interceptor: auto-refresh then retry ──────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // Not a 401 or already retried → pass through
    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err);
    }

    // Auth endpoints (login / refresh) — never attempt auto-refresh
    if (original.url?.includes('/auth/')) {
      return Promise.reject(err);
    }

    const refreshToken = localStorage.getItem('auth_refresh_token');
    if (!refreshToken) {
      clearAuth();
      window.location.href = '/login';
      return Promise.reject(err);
    }

    // If a refresh is already in-flight, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(token => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing    = true;

    try {
      const { data } = await axios.post('/api/v1/auth/refresh', {}, {
        headers: {
          Authorization:  `Bearer ${refreshToken}`,
          Accept:         'application/json',
          'Content-Type': 'application/json',
        },
      });

      const newAccess  = data.data.access_token;
      const newRefresh = data.data.refresh_token;
      localStorage.setItem('auth_token',         newAccess);
      localStorage.setItem('auth_refresh_token', newRefresh);
      api.defaults.headers.common.Authorization = `Bearer ${newAccess}`;

      processQueue(null, newAccess);
      original.headers.Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      clearAuth();
      window.location.href = '/login';
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
