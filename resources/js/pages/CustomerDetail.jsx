import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerService } from '../services/customerService';
import { saleService } from '../services/saleService';
import StatusPill from '../components/ui/StatusPill';
import CylBadge from '../components/ui/CylBadge';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ChevronLeft, CreditCard, AlertCircle, Package } from 'lucide-react';

const TK       = (n) => '৳' + Number(n || 0).toLocaleString('en-US');
const todayStr = new Date().toISOString().split('T')[0];

export default function CustomerDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const [tab, setTab]               = useState('sales');
  const [payTarget, setPayTarget]   = useState(null);
  const [payForm, setPayForm]       = useState({ amount: '', date: todayStr, notes: '' });
  const [payError, setPayError]     = useState('');

  const { data: custData, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn:  () => customerService.getById(id),
  });

  const { data: salesData } = useQuery({
    queryKey: ['customer-sales', id],
    queryFn:  () => saleService.getAll({ search: '' }),
    enabled:  !!id,
  });

  const { data: emptiesData } = useQuery({
    queryKey: ['customer-empties', id],
    queryFn:  () => customerService.getEmpties(id),
    enabled:  tab === 'empties' && !!id,
  });

  const payMutation = useMutation({
    mutationFn: ({ sid, data }) => saleService.payBalance(sid, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', id] });
      qc.invalidateQueries({ queryKey: ['customer-sales', id] });
      qc.invalidateQueries({ queryKey: ['sales-dues'] });
      setPayTarget(null);
      setPayError('');
    },
    onError: (e) => setPayError(e.response?.data?.message || 'Failed to record payment'),
  });

  if (isLoading) return <LoadingSpinner text="Loading customer..." />;

  const customer    = custData?.data;
  const allSales    = salesData?.data || [];
  const custSales   = allSales.filter(s => s.customer_id === parseInt(id));
  const payments    = customer?.due_collections || [];
  const empties     = emptiesData?.data?.balances || [];
  const totalPending= emptiesData?.data?.total_pending || 0;

  const totalRevenue = custSales.reduce((s, x) => s + parseFloat(x.total_amount || 0), 0);
  const totalPaid    = custSales.reduce((s, x) => s + parseFloat(x.paid_amount || 0), 0);
  const totalDue     = custSales.reduce((s, x) => s + parseFloat(x.due_amount || 0), 0);

  const TABS = [
    { key: 'sales',    label: 'Sales History' },
    { key: 'payments', label: 'Payment History' },
    { key: 'empties',  label: `Empty Cylinders${totalPending > 0 ? ` (${totalPending} pending)` : ''}` },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/customers')}>
          <ChevronLeft size={15} /> Customers
        </button>
      </div>

      {/* Header */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{customer?.name}</div>
            {customer?.phone && <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 2 }}>📞 {customer.phone}</div>}
            {customer?.address && <div style={{ fontSize: 13, color: 'var(--text-3)' }}>📍 {customer.address}</div>}
          </div>
          <div style={{ display: 'flex', gap: 20, textAlign: 'right' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: totalDue > 0 ? '#B83030' : 'var(--success)' }}>{TK(totalDue)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Outstanding Due</div>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-1)' }}>{TK(totalRevenue)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Total Purchased</div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary sidebar row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total Purchases', value: TK(totalRevenue) },
          { label: 'Total Paid', value: TK(totalPaid), color: 'var(--success)' },
          { label: 'Outstanding Due', value: TK(totalDue), color: totalDue > 0 ? '#B83030' : undefined },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: color || 'var(--text-1)' }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--border-soft)' }}>
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`}
            style={{ borderRadius: '6px 6px 0 0', marginBottom: -1 }}
            onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Sales History */}
      {tab === 'sales' && (
        <div className="card" style={{ padding: 0 }}>
          {custSales.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No sales to this customer</div>
          ) : (
            <table className="tbl" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Items</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>Paid</th>
                  <th style={{ textAlign: 'right' }}>Due</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {custSales.map(s => (
                  <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/sales/${s.id}`)}>
                    <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{s.sale_date}</td>
                    <td style={{ fontSize: 12 }}>
                      {(s.items || []).map((it, i) => (
                        <span key={i} style={{ display: 'block' }}>{it.cylinder?.name} ×{it.qty}</span>
                      ))}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{TK(s.total_amount)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--success)' }}>{TK(s.paid_amount)}</td>
                    <td style={{ textAlign: 'right', fontWeight: s.due_amount > 0 ? 700 : 400, color: s.due_amount > 0 ? '#B83030' : undefined }}>
                      {TK(s.due_amount)}
                    </td>
                    <td><StatusPill status={s.payment_type} /></td>
                    <td>
                      {s.due_amount > 0 && (
                        <button className="btn btn-soft btn-sm" onClick={e => { e.stopPropagation(); setPayForm({ amount: s.due_amount, date: todayStr, notes: '' }); setPayError(''); setPayTarget(s); }}>
                          <CreditCard size={12} /> Collect
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Payment History */}
      {tab === 'payments' && (
        <div className="card" style={{ padding: 0 }}>
          {payments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No payment records</div>
          ) : (
            <table className="tbl" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Collected By</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{p.collection_date}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{TK(p.amount)}</td>
                    <td style={{ fontSize: 13 }}>{p.collected_by?.name || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{p.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Empty Cylinders */}
      {tab === 'empties' && (
        <div className="card" style={{ padding: 0 }}>
          {empties.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
              <Package size={32} style={{ marginBottom: 10, opacity: 0.3 }} />
              <div>No cylinder balance data for this customer.</div>
            </div>
          ) : (
            <table className="tbl" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Cylinder Type</th>
                  <th style={{ textAlign: 'center' }}>Sold to Customer</th>
                  <th style={{ textAlign: 'center' }}>Returned</th>
                  <th style={{ textAlign: 'center' }}>Pending (at Customer)</th>
                </tr>
              </thead>
              <tbody>
                {empties.map(b => (
                  <tr key={b.cylinder_id} style={{ background: b.pending_qty > 0 ? '#FFFBF0' : undefined }}>
                    <td style={{ fontWeight: 600 }}>
                      {b.cylinder_name} {b.cylinder_size}
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--text-2)' }}>{b.sold_qty}</td>
                    <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>{b.returned_qty}</td>
                    <td style={{ textAlign: 'center' }}>
                      {b.pending_qty > 0 ? (
                        <span style={{ fontWeight: 800, color: '#A85200', fontSize: 15 }}>{b.pending_qty}</span>
                      ) : (
                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>✓ 0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {totalPending > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, padding: '10px 16px', color: 'var(--text-2)' }}>
                      Total pending empties:
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, fontSize: 16, color: '#A85200' }}>
                      {totalPending}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
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
                <div style={{ fontWeight: 600 }}>{customer?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Sale #{payTarget.id}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#B83030' }}>{TK(payTarget.due_amount)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>due</div>
              </div>
            </div>
          </div>
          <form onSubmit={e => { e.preventDefault(); payMutation.mutate({ sid: payTarget.id, data: payForm }); }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <label className="label" style={{ margin: 0 }}>Amount ৳ *</label>
                <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '2px 8px' }}
                  onClick={() => setPayForm(f => ({ ...f, amount: payTarget.due_amount }))}>
                  Pay in Full
                </button>
              </div>
              <input type="number" className="input" min="0.01" step="0.01"
                value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Date *</label>
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
                {payMutation.isPending ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
