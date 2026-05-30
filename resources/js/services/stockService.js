import api from './api';
export const stockService = {
  getAll:       ()     => api.get('/stock').then(r => r.data),
  getReturns:   (page = 1) => api.get(`/returns?page=${page}`).then(r => r.data),
  storeReturn:  (data) => api.post('/returns', data).then(r => r.data),
};
