import api from './api';
export const customerService = {
  getAll:   (page = 1) => api.get(`/customers?page=${page}`).then(r => r.data),
  getById:  (id)       => api.get(`/customers/${id}`).then(r => r.data),
  search:   (term)     => api.get(`/customers?search=${term}`).then(r => r.data),
  create:   (data)     => api.post('/customers', data).then(r => r.data),
  update:   (id, data) => api.put(`/customers/${id}`, data).then(r => r.data),
  remove:   (id)       => api.delete(`/customers/${id}`).then(r => r.data),
  collect:  (id, data) => api.post(`/customers/${id}/collect`, data).then(r => r.data),
};
