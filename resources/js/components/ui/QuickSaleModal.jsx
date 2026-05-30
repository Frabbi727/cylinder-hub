import React, { useState } from 'react';
import Modal from './Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cylinderService } from '../../services/cylinderService';
import { saleService } from '../../services/saleService';
import { customerService } from '../../services/customerService';

const TK = (n) => '৳' + Number(n || 0).toLocaleString('en-US');
const today = new Date().toISOString().split('T')[0];

export default function QuickSaleModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    customer_id: '', sale_date: today,
    payment_type: 'cash', paid_amount: '',
    items: [{ cylinder_id: '', qty: 1, unit_price: '' }],
  });
  const [error, setError] = useState('');

  const { data: cylinders } = useQuery({ queryKey: ['cylinders'], queryFn: cylinderService.getAll });

  const mutation = useMutation({
    mutationFn: saleService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['sales'] });
      onClose();
    },
    onError: (e) => setError(e.response?.data?.message || 'Failed to create sale'),
  });

  const setItem = (i, field, val) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: val };
    setForm(f => ({ ...f, items }));
  };

  const addItem = () => setForm(f => ({
    ...f, items: [...f.items, { cylinder_id: '', qty: 1, unit_price: '' }]
  }));

  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const totalAmount = form.items.reduce((s, it) =>
    s + (parseFloat(it.qty || 0) * parseFloat(it.unit_price || 0)), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const data = {
      ...form,
      customer_id: form.customer_id || null,
      paid_amount: form.payment_type === 'cash' ? totalAmount : parseFloat(form.paid_amount || 0),
      items: form.items.map(it => ({
        cylinder_id: parseInt(it.cylinder_id),
        qty: parseInt(it.qty),
        unit_price: parseFloat(it.unit_price),
      })),
    };
    mutation.mutate(data);
  };

  return (
    <Modal title="Quick Sale" onClose={onClose} size="md">
      <form onSubmit={handleSubmit}>
        {error && <div className="pill-coral" style={{ marginBottom: 16, padding: '8px 12px', borderRadius: 8 }}>{error}</div>}

        <div className="form-row" style={{ marginBottom: 12 }}>
          <label className="label">Sale Date</label>
          <input type="date" className="input" value={form.sale_date} onChange={e => setForm(f => ({...f, sale_date: e.target.value}))} required />
        </div>

        <div className="form-row" style={{ marginBottom: 12 }}>
          <label className="label">Payment Type</label>
          <select className="select" value={form.payment_type} onChange={e => setForm(f => ({...f, payment_type: e.target.value}))}>
            <option value="cash">Cash</option>
            <option value="due">Due</option>
            <option value="partial">Partial</option>
          </select>
        </div>

        {form.payment_type === 'partial' && (
          <div className="form-row" style={{ marginBottom: 12 }}>
            <label className="label">Paid Amount</label>
            <input type="number" className="input" placeholder="0" value={form.paid_amount} onChange={e => setForm(f => ({...f, paid_amount: e.target.value}))} />
          </div>
        )}

        <div style={{ marginBottom: 8 }}>
          <div className="section-title" style={{ fontSize: 13, marginBottom: 8 }}>Items</div>
          {form.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 2 }}>
                <label className="label">Cylinder</label>
                <select className="select" value={item.cylinder_id} onChange={e => setItem(i, 'cylinder_id', e.target.value)} required>
                  <option value="">Select...</option>
                  {cylinders?.data?.map(c => <option key={c.id} value={c.id}>{c.name} {c.size}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="label">Qty</label>
                <input type="number" className="input" min="1" value={item.qty} onChange={e => setItem(i, 'qty', e.target.value)} required />
              </div>
              <div style={{ flex: 1 }}>
                <label className="label">Price ৳</label>
                <input type="number" className="input" min="0" step="0.01" value={item.unit_price} onChange={e => setItem(i, 'unit_price', e.target.value)} required />
              </div>
              {form.items.length > 1 && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeItem(i)} style={{ marginBottom: 1 }}>✕</button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}>+ Add Item</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
          <div>
            <div className="dim tiny">Total Amount</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>{TK(totalAmount)}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Record Sale'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
