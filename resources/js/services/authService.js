import api from './api';

export const authService = {
  login:  (credentials) => api.post('/auth/login', credentials).then(r => r.data),
  logout: ()            => api.post('/auth/logout').then(r => r.data),
  me:     ()            => api.get('/auth/me').then(r => r.data),
};
