import api from './api';

const qs = (params) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') q.set(k, v); });
  return q.toString();
};

export const reportService = {
  pnl:          (period, from, to) => api.get(`/reports/pnl?${qs({ period, from, to })}`).then(r => r.data),
  cashflow:     (period, from, to) => api.get(`/reports/cashflow?${qs({ period, from, to })}`).then(r => r.data),
  purchases:    (period, from, to) => api.get(`/reports/purchases?${qs({ period, from, to })}`).then(r => r.data),
  cylinderFlow: (period, from, to, salesmanId) =>
    api.get(`/reports/cylinder-flow?${qs({ period, from, to, salesman_id: salesmanId })}`).then(r => r.data),
};
