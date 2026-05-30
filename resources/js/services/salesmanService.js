import api from './api';
export const salesmanService = {
  getAll:    ()            => api.get('/salesmen').then(r => r.data),
  getById:   (id)          => api.get(`/salesmen/${id}`).then(r => r.data),
  allocate:  (id, data)    => api.post(`/salesmen/${id}/allocate`, data).then(r => r.data),
  reconcile: (allocId, data) => api.post(`/allocations/${allocId}/reconcile`, data).then(r => r.data),
};
