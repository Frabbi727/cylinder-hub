import api from './api';
export const expenseService = {
  getAll:  (page = 1, month, year) => {
    let url = `/expenses?page=${page}`;
    if (month && year) url += `&month=${month}&year=${year}`;
    return api.get(url).then(r => r.data);
  },
  create:  (data)     => api.post('/expenses', data).then(r => r.data),
  update:  (id, data) => api.put(`/expenses/${id}`, data).then(r => r.data),
  remove:  (id)       => api.delete(`/expenses/${id}`).then(r => r.data),
};
