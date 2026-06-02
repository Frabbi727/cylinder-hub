import api from './api';
export const dashboardService = {
  // API wraps in { success, data: { summary, weekly_chart, ... } } — unwrap here
  get: (params = {}) => api.get('/dashboard', { params }).then(r => r.data.data),
};
