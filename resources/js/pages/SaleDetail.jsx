import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { saleService } from '../services/saleService';
import StatusPill from '../components/ui/StatusPill';
import CylBadge from '../components/ui/CylBadge';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ChevronLeft, CreditCard, Printer, AlertCircle } from 'lucide-react';

const TK      = (n) => '৳' + Number(n || 0).toLocaleString('en-US');
const todayStr = new Date().toISOString().split('T')[0];

export default function SaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc       = useQueryClient();

  const [showCollect, setShowCollect] = useState(false);
  const [payForm, setPayForm]         = useState({ amount: '', date: todayStr, notes: '' });
  const [payError, setPayError]       = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['sale', id],
    queryFn:  () => saleService.getById(id),
    enabled:  !!id,
  });

  const payMutation = useMutation({
    mutationFn: ({ amount, date, notes }) => saleService.payBalance(id, { amount, date, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sale', id] });
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['sales-dues'] });
      setShowCollect(false);
      setPayError('');
    },
    onError: (e) => setPayError(e.response?.data?.message || 'Failed to record payment'),
  });

  if (isLoading) return <LoadingSpinner text="Loading sale..." />;
  if (error) return <div style={{ padding: 24, color: 'var(--error)' }}>Failed to load sale.</div>;

  // Handle both API shapes: { data: { sale, payment_history } } and legacy { data: sale }
  const sale           = data?.data?.sale   || data?.data;
  const paymentHistory = data?.data?.payment_history || [];
  const due            = parseFloat(sale?.due_amount || 0);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Back */}
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          <ChevronLeft size={15} /> Back
        </button>
      </div>

      {/* Header card */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Sale #{sale?.id}</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{sale?.sale_date} · {sale?.salesman?.name}</div>
            <div style={{ marginTop: 8, fontWeight: 600, fontSize: 15 }}>{sale?.customer?.name || 'Walk-in Customer'}</div>
            {sale?.customer?.phone && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{sale.customer.phone}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StatusPill status={sale?.payment_type} />
            <button className="btn btn-soft btn-sm" onClick={() => window.print()}>
              <Printer size={13} /> Print Receipt
            </button>
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Items</div>
        <table className="tbl" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Cylinder</th>
              <th style={{ textAlign: 'center' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Unit Price</th>
              <th style={{ textAlign: 'right' }}>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {(sale?.items || []).map((it, i) => (
              <tr key={i}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {it.cylinder && <CylBadge cylinder={it.cylinder} size="sm" />}
                    <span style={{ fontWeight: 600 }}>{it.cylinder?.name} {it.cylinder?.size}</span>
                  </div>
                </td>
                <td style={{ textAlign: 'center', fontWeight: 600 }}>{it.qty}</td>
                <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>{TK(it.unit_price)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{TK(it.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment summary */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Payment Summary</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-2)' }}>Total Amount</span>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{TK(sale?.total_amount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-2)' }}>Total Paid</span>
            <span style={{ fontWeight: 700, color: 'var(--success)', fontSize: 16 }}>{TK(sale?.paid_amount)}</span>
          </div>
          {due > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '2px solid var(--border-soft)' }}>
              <span style={{ fontWeight: 700 }}>Remaining Due</span>
              <span style={{ fontWeight: 800, color: '#B83030', fontSize: 18 }}>{TK(due)}</span>
            </div>
          )}
        </div>
        {due > 0 && (
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
            onClick={() => { setPayForm({ amount: due, date: todayStr, notes: '' }); setShowCollect(true); }}>
            <CreditCard size={15} /> Collect Payment
          </button>
        )}
      </div>

      {/* Payment history */}
      {paymentHistory.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Payment History</div>
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
              {paymentHistory.map((ph, i) => (
                <tr key={i}>
                  <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{ph.collection_date}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{TK(ph.amount)}</td>
                  <td style={{ fontSize: 13 }}>{ph.collected_by || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{ph.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Collect modal */}
      {showCollect && (
        <Modal title="Collect Payment" onClose={() => setShowCollect(false)}>
          {payError && (
            <div style={{ background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, display: 'flex', gap: 8 }}>
              <AlertCircle size={15} style={{ marginTop: 1, flexShrink: 0 }} />{payError}
            </div>
          )}
          <div style={{ background: 'var(--primary-soft)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{sale?.customer?.name || 'Walk-in'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Sale #{sale?.id} · {sale?.sale_date}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#B83030' }}>{TK(due)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>remaining due</div>
              </div>
            </div>
          </div>
          <form onSubmit={e => { e.preventDefault(); payMutation.mutate(payForm); }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label className="label" style={{ margin: 0 }}>Amount ৳ *</label>
                <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '2px 8px' }}
                  onClick={() => setPayForm(f => ({ ...f, amount: due }))}>
                  Pay in Full
                </button>
              </div>
              <input type="number" className="input" min="0.01" step="0.01" max={due}
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
              <button type="button" className="btn btn-ghost" onClick={() => setShowCollect(false)}>Cancel</button>
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
