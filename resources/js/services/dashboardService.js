import api from './api';
export const dashboardService = {
  get: (params = {}) => api.get('/dashboard', { params }).then(r => r.data),
};
