import api from './api';
export const saleService = {
  getAll:      (page = 1, todayOnly = false) =>
    api.get(`/sales?page=${page}${todayOnly ? '&today=1' : ''}`).then(r => r.data),
  getById:     (id)       => api.get(`/sales/${id}`).then(r => r.data),
  create:      (data)     => api.post('/sales', data).then(r => r.data),
  remove:      (id)       => api.delete(`/sales/${id}`).then(r => r.data),
  payBalance:  (id, data) => api.post(`/sales/${id}/pay`, data).then(r => r.data),
};
