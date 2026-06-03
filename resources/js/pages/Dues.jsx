import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { saleService } from '../services/saleService';
import StatusPill from '../components/ui/StatusPill';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { AlertCircle, CheckCircle, CreditCard, Download } from 'lucide-react';

const TK       = (n) => '৳' + Number(n || 0).toLocaleString('en-US');
const todayStr = new Date().toISOString().split('T')[0];

function ageDays(saleDate) {
  if (!saleDate) return 0;
  return Math.floor((new Date() - new Date(saleDate)) / 86400000);
}

function DaysCell({ date }) {
  const days = ageDays(date);
  const color = days > 7 ? '#B83030' : days >= 3 ? '#A85200' : '#176B3A';
  return <span style={{ fontWeight: 700, color, fontSize: 13 }}>{days}d</span>;
}

export default function Dues() {
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const [payTarget, setPayTarget] = useState(null);
  const [payForm, setPayForm]     = useState({ amount: '', date: todayStr, notes: '' });
  const [payError, setPayError]   = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sortBy, setSortBy]           = useState('days_desc');

  const { data, isLoading } = useQuery({
    queryKey: ['sales-dues'],
    queryFn:  () => saleService.getAll({ has_due: true }),
    refetchInterval: 30_000,
  });

  const payMutation = useMutation({
    mutationFn: ({ id, data }) => saleService.payBalance(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-dues'] });
      qc.invalidateQueries({ queryKey: ['sales'] });
      setPayTarget(null);
      setPayError('');
    },
    onError: (e) => setPayError(e.response?.data?.message || 'Failed to record payment'),
  });

  const allDues = data?.data || [];

  const filtered = useMemo(() => {
    let rows = overdueOnly ? allDues.filter(s => ageDays(s.sale_date) > 7) : allDues;
    if (sortBy === 'amount_desc') rows = [...rows].sort((a, b) => b.due_amount - a.due_amount);
    else if (sortBy === 'days_desc') rows = [...rows].sort((a, b) => ageDays(b.sale_date) - ageDays(a.sale_date));
    else if (sortBy === 'name')  rows = [...rows].sort((a, b) => (a.customer?.name || '').localeCompare(b.customer?.name || ''));
    return rows;
  }, [allDues, sortBy, overdueOnly]);

  const totalDue       = allDues.reduce((s, x) => s + parseFloat(x.due_amount || 0), 0);
  const uniqueCustomers= new Set(allDues.map(s => s.customer_id).filter(Boolean)).size;
  const oldestDays     = allDues.length ? Math.max(...allDues.map(s => ageDays(s.sale_date))) : 0;

  const openPay = (sale) => {
    setPayForm({ amount: sale.due_amount, date: todayStr, notes: '' });
    setPayError('');
    setPayTarget(sale);
  };

  const exportCSV = () => {
    const rows = [['Sale ID', 'Customer', 'Phone', 'Sale Date', 'Days', 'Total', 'Paid', 'Due']];
    filtered.forEach(s => rows.push([
      s.id, s.customer?.name || 'Walk-in', s.customer?.phone || '',
      s.sale_date, ageDays(s.sale_date),
      s.total_amount, s.paid_amount, s.due_amount,
    ]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv);
    a.download = `dues-${todayStr}.csv`; a.click();
  };

  if (isLoading) return <LoadingSpinner text="Loading dues..." />;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Outstanding Dues</h2>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>Sales with unpaid amounts</div>
        </div>
        <button className="btn btn-soft btn-sm" onClick={exportCSV}>
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Due Amount', value: TK(totalDue), color: '#B83030' },
          { label: 'No. of Sales', value: allDues.length, color: 'var(--text-1)' },
          { label: 'Customers Owing', value: uniqueCustomers, color: 'var(--primary)' },
          { label: 'Oldest Due', value: `${oldestDays} days`, color: oldestDays > 7 ? '#B83030' : '#A85200' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="select" style={{ width: 'auto' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="days_desc">Oldest first</option>
          <option value="amount_desc">Largest amount first</option>
          <option value="name">Customer name</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={overdueOnly} onChange={e => setOverdueOnly(e.target.checked)} />
          Only overdue &gt;7 days
        </label>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && allDues.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <CheckCircle size={48} style={{ color: 'var(--success)', marginBottom: 12 }} />
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>All dues collected!</div>
          <div style={{ color: 'var(--text-3)' }}>Great work. No outstanding payments.</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="tbl" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Sale Date</th>
                <th style={{ textAlign: 'center' }}>Age</th>
                <th style={{ textAlign: 'right' }}>Total Sale</th>
                <th style={{ textAlign: 'right' }}>Paid</th>
                <th style={{ textAlign: 'right' }}>Remaining Due</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const days = ageDays(s.sale_date);
                return (
                  <tr key={s.id} style={{ background: days > 7 ? '#FEF2F2' : undefined, cursor: 'pointer' }}
                    onClick={() => navigate(`/sales/${s.id}`)}>
                    <td style={{ fontWeight: 600 }}>{s.customer?.name || 'Walk-in'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{s.customer?.phone || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{s.sale_date}</td>
                    <td style={{ textAlign: 'center' }}><DaysCell date={s.sale_date} /></td>
                    <td style={{ textAlign: 'right', fontSize: 13 }}>{TK(s.total_amount)}</td>
                    <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--success)' }}>{TK(s.paid_amount)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#B83030', fontSize: 14 }}>{TK(s.due_amount)}</td>
                    <td>
                      <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); openPay(s); }}>
                        <CreditCard size={13} /> Collect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Collect modal */}
      {payTarget && (
        <Modal title="Collect Payment" onClose={() => setPayTarget(null)}>
          {payError && (
            <div style={{ background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, display: 'flex', gap: 8 }}>
              <AlertCircle size={15} style={{ marginTop: 1 }} />{payError}
            </div>
          )}
          <div style={{ background: 'var(--primary-soft)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{payTarget.customer?.name || 'Walk-in'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Sale #{payTarget.id}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#B83030' }}>{TK(payTarget.due_amount)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>due</div>
              </div>
            </div>
          </div>
          <form onSubmit={e => { e.preventDefault(); payMutation.mutate({ id: payTarget.id, data: payForm }); }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <label className="label" style={{ margin: 0 }}>Amount ৳ *</label>
                <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '2px 8px' }}
                  onClick={() => setPayForm(f => ({ ...f, amount: payTarget.due_amount }))}>
                  Pay in Full
                </button>
              </div>
              <input type="number" className="input" min="0.01" step="0.01" max={payTarget.due_amount}
                value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Collection Date *</label>
              <input type="date" className="input" value={payForm.date}
                onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Notes</label>
              <input className="input" value={payForm.notes}
                onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setPayTarget(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={payMutation.isPending}>
                {payMutation.isPending ? 'Saving...' : 'Confirm Payment'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
