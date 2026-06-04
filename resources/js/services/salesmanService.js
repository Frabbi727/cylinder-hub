import api from './api';
export const salesmanService = {
  getAll:          (date)          => api.get('/salesmen', { params: date ? { date } : {} }).then(r => r.data),
  getById:         (id)            => api.get(`/salesmen/${id}`).then(r => r.data),
  getReport:       (id, from, to)  => api.get(`/salesmen/${id}/report`, { params: { from, to } }).then(r => r.data),
  getCylinderFlow: (id, from, to)  => api.get(`/salesmen/${id}/cylinder-flow`, { params: { from, to } }).then(r => r.data),
  create:          (data)          => api.post('/salesmen', data).then(r => r.data),
  update:          (id, data)      => api.put(`/salesmen/${id}`, data).then(r => r.data),
  toggleActive:    (id)            => api.post(`/salesmen/${id}/toggle-active`).then(r => r.data),
  allocate:        (id, data)      => api.post(`/salesmen/${id}/allocate`, data).then(r => r.data),
  reconcile:       (allocId, data) => api.post(`/allocations/${allocId}/reconcile`, data).then(r => r.data),
};
