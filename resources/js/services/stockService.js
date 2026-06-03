import api from './api';
export const stockService = {
  getAll:       ()           => api.get('/stock').then(r => r.data),
  getReturns:   (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q.set(k, v); });
    return api.get(`/returns?${q}`).then(r => r.data);
  },
  storeReturn:  (data)       => api.post('/returns', data).then(r => r.data),
  verifyReturn: (id)         => api.post(`/returns/${id}/verify`).then(r => r.data),
  rejectReturn: (id, notes)  => api.post(`/returns/${id}/reject`, { notes }).then(r => r.data),
};
