import api from './api';
export const supplierService = {
  getAll:  (page = 1) => api.get(`/suppliers?page=${page}`).then(r => r.data),
  getById: (id)       => api.get(`/suppliers/${id}`).then(r => r.data),
  create:  (data)     => api.post('/suppliers', data).then(r => r.data),
  update:  (id, data) => api.put(`/suppliers/${id}`, data).then(r => r.data),
  remove:  (id)       => api.delete(`/suppliers/${id}`).then(r => r.data),
  pay:     (id, data) => api.post(`/suppliers/${id}/pay`, data).then(r => r.data),
};
