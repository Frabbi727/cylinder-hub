import api from './api';
export const cylinderService = {
  getAll:    ()       => api.get('/cylinders').then(r => r.data),
  getById:   (id)     => api.get(`/cylinders/${id}`).then(r => r.data),
  create:    (data)   => api.post('/cylinders', data).then(r => r.data),
  update:    (id, data) => api.put(`/cylinders/${id}`, data).then(r => r.data),
  remove:    (id)     => api.delete(`/cylinders/${id}`).then(r => r.data),
};
