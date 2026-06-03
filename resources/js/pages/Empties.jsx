import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockService } from '../services/stockService';
import { cylinderService } from '../services/cylinderService';
import { customerService } from '../services/customerService';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Package, AlertCircle, Plus, CheckCircle } from 'lucide-react';

const todayStr = new Date().toISOString().split('T')[0];

const EXTRA_REASONS = [
  { value: 'old_stock',          label: 'Old stock' },
  { value: 'neighbour',          label: 'Neighbour collection' },
  { value: 'competitor',         label: 'Competitor cylinder' },
  { value: 'salesman_handover',  label: 'Salesman handover' },
  { value: 'other',              label: 'Other' },
];

export default function Empties() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab]   = useState('normal'); // 'normal' | 'extra'
  const [form, setForm]           = useState({ cylinder_id: '', customer_id: '', qty: 1, return_date: todayStr, notes: '', extra_reason: '' });
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [custSearch, setCustSearch] = useState('');

  const { data: stockData, isLoading } = useQuery({
    queryKey: ['stock'],
    queryFn:  stockService.getAll,
    refetchInterval: 30_000,
  });

  const { data: cylinders } = useQuery({
    queryKey: ['cylinders'],
    queryFn:  cylinderService.getAll,
  });

  const { data: custData } = useQuery({
    queryKey: ['customers-search', custSearch],
    queryFn:  () => customerService.getAll(1, custSearch),
    enabled:  custSearch.length > 0,
  });

  const returnMutation = useMutation({
    mutationFn: (data) => stockService.storeReturn(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['stock'] });
      const isExtra = vars.is_extra;
      setSuccess(isExtra
        ? 'Extra return logged! Admin will be notified for verification.'
        : `Logged ${vars.qty} empty cylinder(s) returned.`
      );
      setShowModal(false);
      setForm({ cylinder_id: '', customer_id: '', qty: 1, return_date: todayStr, notes: '', extra_reason: '' });
      setCustSearch('');
      setError('');
      setTimeout(() => setSuccess(''), 5000);
    },
    onError: (e) => setError(e.response?.data?.message || 'Failed to record return'),
  });

  const cylinderList = Array.isArray(cylinders) ? cylinders : (cylinders?.data || []);
  const stockList    = stockData?.data || [];
  const customers    = custData?.data || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    returnMutation.mutate({
      cylinder_id:  parseInt(form.cylinder_id),
      customer_id:  form.customer_id ? parseInt(form.customer_id) : null,
      qty:          parseInt(form.qty),
      type:         'empty_return',
      return_date:  form.return_date,
      notes:        form.notes || null,
      is_extra:     modalTab === 'extra',
      extra_reason: modalTab === 'extra' ? form.extra_reason : null,
    });
  };

  if (isLoading) return <LoadingSpinner text="Loading stock..." />;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Empty Cylinders</h2>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>Track empty cylinder returns</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setError(''); setShowModal(true); }}>
          <Plus size={15} /> Log Empty Return
        </button>
      </div>

      {/* Success toast */}
      {success && (
        <div style={{ background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 8, padding: '10px 16px', marginBottom: 14, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={15} /> {success}
        </div>
      )}

      {/* Stock snapshot table */}
      <div className="card" style={{ padding: 0, marginBottom: 20 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-soft)' }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Live Stock Snapshot</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Current inventory per cylinder type</div>
        </div>
        {stockList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No stock data available</div>
        ) : (
          <table className="tbl" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Cylinder Type</th>
                <th style={{ textAlign: 'center' }}>Filled</th>
                <th style={{ textAlign: 'center' }}>Empty</th>
                <th style={{ textAlign: 'center' }}>Allocated</th>
                <th>Stock Bar</th>
              </tr>
            </thead>
            <tbody>
              {stockList.map((s) => {
                const total = (s.filled_qty || 0) + (s.empty_qty || 0);
                const fillPct = total > 0 ? Math.round((s.filled_qty || 0) / total * 100) : 0;
                const isCritical = s.filled_qty <= (s.reorder_level || 0);
                return (
                  <tr key={s.cylinder_id || s.id}>
                    <td style={{ fontWeight: 600 }}>
                      {s.name || s.cylinder?.name} {s.size || s.cylinder?.size}
                      {isCritical && <span className="pill pill-coral" style={{ fontSize: 10, marginLeft: 8 }}>Low Stock</span>}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: isCritical ? '#B83030' : 'var(--text-1)' }}>
                      {s.filled_qty || 0}
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--text-2)' }}>{s.empty_qty || 0}</td>
                    <td style={{ textAlign: 'center', color: 'var(--primary)', fontWeight: 600 }}>{s.allocated_qty || 0}</td>
                    <td style={{ minWidth: 100 }}>
                      <div style={{ background: 'var(--border-soft)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                        <div style={{ width: `${fillPct}%`, height: '100%', background: isCritical ? '#B83030' : 'var(--success)', transition: 'width 0.3s' }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Log Empty Return Modal */}
      {showModal && (
        <Modal title="Log Empty Return" onClose={() => { setShowModal(false); setError(''); }} size="md">
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border-soft)', paddingBottom: 0 }}>
            {[{ key: 'normal', label: 'Normal Return' }, { key: 'extra', label: 'Extra Return' }].map(t => (
              <button key={t.key} className={`tab-btn${modalTab === t.key ? ' active' : ''}`}
                style={{ borderRadius: '6px 6px 0 0', marginBottom: -1 }}
                onClick={() => setModalTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          {modalTab === 'extra' && (
            <div style={{ background: '#FFF1DD', border: '1px solid #FF9500', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#A85200', display: 'flex', gap: 8 }}>
              <AlertCircle size={15} style={{ marginTop: 1, flexShrink: 0 }} />
              <span>Admin will be notified for verification. Extra returns are held as pending until approved.</span>
            </div>
          )}

          {error && (
            <div style={{ background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, display: 'flex', gap: 8 }}>
              <AlertCircle size={15} style={{ marginTop: 1 }} />{error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Cylinder Type *</label>
              <select className="select" value={form.cylinder_id}
                onChange={e => setForm(f => ({ ...f, cylinder_id: e.target.value }))} required>
                <option value="">Select cylinder type...</option>
                {cylinderList.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.size}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="label">Customer</label>
              <input className="input" placeholder="Search customer name..."
                value={custSearch}
                onChange={e => { setCustSearch(e.target.value); setForm(f => ({ ...f, customer_id: '' })); }} />
              {custSearch && customers.length > 0 && !form.customer_id && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 8, maxHeight: 140, overflowY: 'auto', marginTop: 4 }}>
                  {customers.slice(0, 5).map(c => (
                    <div key={c.id} style={{ padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}
                      onMouseDown={() => { setForm(f => ({ ...f, customer_id: String(c.id) })); setCustSearch(c.name); }}>
                      {c.name} {c.phone && <span style={{ color: 'var(--text-3)' }}>· {c.phone}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label className="label">Quantity *</label>
                <input type="number" className="input" min="1" value={form.qty}
                  onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Date *</label>
                <input type="date" className="input" value={form.return_date}
                  onChange={e => setForm(f => ({ ...f, return_date: e.target.value }))} required />
              </div>
            </div>

            {modalTab === 'extra' && (
              <div style={{ marginBottom: 12 }}>
                <label className="label">Reason *</label>
                <select className="select" value={form.extra_reason}
                  onChange={e => setForm(f => ({ ...f, extra_reason: e.target.value }))} required={modalTab === 'extra'}>
                  <option value="">Select reason...</option>
                  {EXTRA_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label className="label">Notes</label>
              <input className="input" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => { setShowModal(false); setError(''); }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={returnMutation.isPending}>
                {returnMutation.isPending ? 'Saving...' : 'Submit Return'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
