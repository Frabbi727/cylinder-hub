import api from './api';
export const purchaseService = {
  getAll:     (page = 1) => api.get(`/purchases?page=${page}`).then(r => r.data),
  getById:    (id)       => api.get(`/purchases/${id}`).then(r => r.data),
  create:     (data)     => api.post('/purchases', data).then(r => r.data),
  payBalance: (id, data) => api.post(`/purchases/${id}/pay`, data).then(r => r.data),
  fifoQueue:  (cylinderId) => api.get(`/purchases/fifo/${cylinderId}`).then(r => r.data),
  simulate:   (data)     => api.post('/purchases/simulate', data).then(r => r.data),
};
