import React, { useState } from 'react';
import { usePurchases } from '../hooks/usePurchases';
import CylCell    from '../components/ui/CylCell';
import StatusPill from '../components/ui/StatusPill';
import Modal      from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Plus, Layers, Zap } from 'lucide-react';

const TK = (n) => '৳' + Number(n || 0).toLocaleString('en-US');
const today = new Date().toISOString().split('T')[0];

const defaultForm = { supplier_id: '', purchase_date: today, paid_amount: '', notes: '', items: [{ cylinder_id: '', qty: 1, unit_cost: '' }] };

export default function Purchases() {
  const { purchases, isLoading, cylinders, suppliers, showAdd, setShowAdd, createPurchase, isCreating, simulation, simulateSale, simLoading } = usePurchases();
  const [form, setForm]   = useState(defaultForm);
  const [simForm, setSimForm] = useState({ cylinder_id: '', qty: 1, unit_price: '' });

  const setItem = (i, field, val) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: val };
    setForm(f => ({...f, items}));
  };

  const handleCreate = (e) => {
    e.preventDefault();
    createPurchase({
      ...form,
      paid_amount: parseFloat(form.paid_amount || 0),
      items: form.items.map(it => ({
        cylinder_id: parseInt(it.cylinder_id),
        qty: parseInt(it.qty),
        unit_cost: parseFloat(it.unit_cost),
      })),
    });
  };

  const totalAmount = form.items.reduce((s, it) => s + (parseInt(it.qty||0) * parseFloat(it.unit_cost||0)), 0);

  if (isLoading) return <LoadingSpinner text="Loading purchases..." />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h3 style={{ margin: 0 }}>Purchase Lots</h3>
          <p className="dim tiny" style={{ marginTop: 4 }}>FIFO queue — oldest lots sell first</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add Purchase
        </button>
      </div>

      {/* FIFO Simulator */}
      <div className="card" style={{ marginBottom: 24, background: 'var(--primary-soft)', border: '1px solid var(--primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Zap size={18} style={{ color: 'var(--primary)' }} />
          <div className="section-title" style={{ marginBottom: 0, color: 'var(--primary)' }}>FIFO Sale Simulator</div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 2, minWidth: 160 }}>
            <label className="label">Cylinder Type</label>
            <select className="select" value={simForm.cylinder_id} onChange={e => setSimForm(f => ({...f, cylinder_id: e.target.value}))}>
              <option value="">Select...</option>
              {cylinders.map(c => <option key={c.id} value={c.id}>{c.name} {c.size}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 100 }}>
            <label className="label">Quantity</label>
            <input type="number" className="input" min="1" value={simForm.qty} onChange={e => setSimForm(f => ({...f, qty: parseInt(e.target.value)}))} />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label className="label">Sale Price ৳</label>
            <input type="number" className="input" min="0" step="0.01" value={simForm.unit_price} onChange={e => setSimForm(f => ({...f, unit_price: e.target.value}))} />
          </div>
          <button
            className="btn btn-primary btn-sm"
            disabled={!simForm.cylinder_id || !simForm.unit_price || simLoading}
            onClick={() => simulateSale(parseInt(simForm.cylinder_id), simForm.qty, parseFloat(simForm.unit_price))}
          >
            {simLoading ? 'Simulating...' : 'Simulate FIFO'}
          </button>
        </div>

        {simulation && (
          <div style={{ marginTop: 16, background: '#fff', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
              <div><div className="dim tiny">Revenue</div><div style={{ fontWeight: 700, color: 'var(--primary)' }}>{TK(simulation.total_revenue)}</div></div>
              <div><div className="dim tiny">Total Cost</div><div style={{ fontWeight: 700 }}>{TK(simulation.total_cost)}</div></div>
              <div><div className="dim tiny">Profit</div><div style={{ fontWeight: 700, color: 'var(--success)' }}>{TK(simulation.total_profit)}</div></div>
              <div><div className="dim tiny">Lots Used</div><div style={{ fontWeight: 700 }}>{simulation.lots_consumed}</div></div>
            </div>
            <div className="dim tiny" style={{ marginBottom: 8 }}>Lot breakdown:</div>
            {simulation.breakdown?.map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, padding: '6px 0', borderTop: '1px solid var(--border-soft)', fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>{b.lot_id_label}</span>
                <span className="dim">×{b.qty} @ cost {TK(b.unit_cost)}</span>
                <span style={{ color: 'var(--success)' }}>= {TK(b.profit)} profit</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Purchase table */}
      <div className="card" style={{ padding: 0 }}>
        <table className="tbl" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Supplier</th>
              <th>Items</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }} className="dim">No purchases yet</td></tr>
            )}
            {purchases.map(p => (
              <tr key={p.id}>
                <td className="dim tiny">#{p.id}</td>
                <td>{p.purchase_date}</td>
                <td style={{ fontWeight: 600 }}>{p.supplier?.name}</td>
                <td>
                  {p.items?.map((it, i) => (
                    <span key={i} style={{ display: 'block', fontSize: 12 }}>
                      <CylCell cylinder={it.cylinder} /> ×{it.qty} @ {TK(it.unit_cost)}
                    </span>
                  ))}
                </td>
                <td style={{ fontWeight: 600 }}>{TK(p.total_amount)}</td>
                <td style={{ color: 'var(--success)' }}>{TK(p.paid_amount)}</td>
                <td style={{ color: p.due_amount > 0 ? 'var(--accent)' : 'var(--success)' }}>{TK(p.due_amount)}</td>
                <td>
                  {p.items?.map((it, i) => <StatusPill key={i} status={it.status} />)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Purchase Modal */}
      {showAdd && (
        <Modal title="Add Purchase" onClose={() => setShowAdd(false)} size="lg">
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label className="label">Supplier *</label>
                <select className="select" value={form.supplier_id} onChange={e => setForm(f => ({...f, supplier_id: e.target.value}))} required>
                  <option value="">Select...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Purchase Date *</label>
                <input type="date" className="input" value={form.purchase_date} onChange={e => setForm(f => ({...f, purchase_date: e.target.value}))} required />
              </div>
            </div>

            <div className="section-title" style={{ fontSize: 13, marginBottom: 8 }}>Items</div>
            {form.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 2 }}>
                  <label className="label">Cylinder</label>
                  <select className="select" value={item.cylinder_id} onChange={e => setItem(i, 'cylinder_id', e.target.value)} required>
                    <option value="">Select...</option>
                    {cylinders.map(c => <option key={c.id} value={c.id}>{c.name} {c.size}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="label">Qty</label>
                  <input type="number" className="input" min="1" value={item.qty} onChange={e => setItem(i, 'qty', e.target.value)} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="label">Unit Cost ৳</label>
                  <input type="number" className="input" min="0" step="0.01" value={item.unit_cost} onChange={e => setItem(i, 'unit_cost', e.target.value)} required />
                </div>
                {form.items.length > 1 && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))}>✕</button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(f => ({ ...f, items: [...f.items, { cylinder_id: '', qty: 1, unit_cost: '' }] }))}>+ Add Item</button>

            <div style={{ marginTop: 12, marginBottom: 12 }}>
              <label className="label">Paid Amount ৳</label>
              <input type="number" className="input" min="0" step="0.01" value={form.paid_amount} placeholder={totalAmount} onChange={e => setForm(f => ({...f, paid_amount: e.target.value}))} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
              <div>
                <div className="dim tiny">Total Amount</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>{TK(totalAmount)}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isCreating}>{isCreating ? 'Saving...' : 'Add Purchase'}</button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
