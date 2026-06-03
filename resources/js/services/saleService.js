import api from './api';
export const saleService = {
  getAll: (params = {}) => {
    const q = new URLSearchParams();
    if (params.page)         q.set('page', params.page);
    if (params.today)        q.set('today', '1');
    if (params.has_due)      q.set('has_due', '1');
    if (params.from)         q.set('from', params.from);
    if (params.to)           q.set('to', params.to);
    if (params.payment_type) q.set('payment_type', params.payment_type);
    if (params.search)       q.set('search', params.search);
    return api.get(`/sales?${q}`).then(r => r.data);
  },
  getById:    (id)       => api.get(`/sales/${id}`).then(r => r.data),
  create:     (data)     => api.post('/sales', data).then(r => r.data),
  remove:     (id)       => api.delete(`/sales/${id}`).then(r => r.data),
  payBalance: (id, data) => api.post(`/sales/${id}/pay`, data).then(r => r.data),
};
