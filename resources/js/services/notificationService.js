import api from './api';
export const notificationService = {
  getAll:   ()   => api.get('/notifications').then(r => r.data),
  markRead: (id) => api.post(`/notifications/${id}/read`).then(r => r.data),
  markAll:  ()   => api.post('/notifications/read-all').then(r => r.data),
};
