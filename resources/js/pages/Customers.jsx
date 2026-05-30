import React, { useState } from 'react';
import { useCustomers } from '../hooks/useCustomers';
import Modal    from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Plus, CreditCard, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const TK = (n) => '৳' + Number(n || 0).toLocaleString('en-US');
const today = new Date().toISOString().split('T')[0];

export default function Customers() {
  const { customers, isLoading, showAdd, setShowAdd, showCollect, setShowCollect, selected, setSelected, createCustomer, collectDue, deleteCustomer, isCreating, isCollecting } = useCustomers();
  const { isAdmin } = useAuth();
  const [addForm, setAddForm]     = useState({ name: '', phone: '', address: '' });
  const [collectForm, setCollForm]= useState({ amount: '', collection_date: today, notes: '' });

  const totalDue = customers.reduce((s, c) => s + parseFloat(c.total_due || 0), 0);

  if (isLoading) return <LoadingSpinner text="Loading customers..." />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div className="dim tiny">Total Customer Due: <strong style={{ color: 'var(--accent)' }}>{TK(totalDue)}</strong></div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}><Plus size={16} /> Add Customer</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="tbl" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Due</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }} className="dim">No customers yet</td></tr>
            )}
            {customers.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600 }}>{c.name}</td>
                <td className="dim">{c.phone || '—'}</td>
                <td className="dim">{c.address || '—'}</td>
                <td style={{ fontWeight: 700, color: c.total_due > 0 ? 'var(--accent)' : 'var(--success)' }}>{TK(c.total_due)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {c.total_due > 0 && (
                      <button className="btn btn-soft btn-sm" onClick={() => { setSelected(c); setCollForm({ amount: c.total_due, collection_date: today, notes: '' }); setShowCollect(true); }}>
                        <CreditCard size={14} /> Collect
                      </button>
                    )}
                    {isAdmin && (
                      <button className="btn btn-ghost btn-sm" onClick={() => window.confirm('Delete customer?') && deleteCustomer(c.id)}>
                        <Trash2 size={14} style={{ color: 'var(--error)' }} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <Modal title="Add Customer" onClose={() => setShowAdd(false)}>
          <form onSubmit={e => { e.preventDefault(); createCustomer(addForm); }}>
            <div style={{ marginBottom: 12 }}><label className="label">Name *</label><input className="input" value={addForm.name} onChange={e => setAddForm(f => ({...f, name: e.target.value}))} required /></div>
            <div style={{ marginBottom: 12 }}><label className="label">Phone</label><input className="input" value={addForm.phone} onChange={e => setAddForm(f => ({...f, phone: e.target.value}))} /></div>
            <div style={{ marginBottom: 12 }}><label className="label">Address</label><input className="input" value={addForm.address} onChange={e => setAddForm(f => ({...f, address: e.target.value}))} /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isCreating}>{isCreating ? 'Saving...' : 'Add Customer'}</button>
            </div>
          </form>
        </Modal>
      )}

      {showCollect && selected && (
        <Modal title={`Collect Due — ${selected.name}`} onClose={() => setShowCollect(false)}>
          <form onSubmit={e => { e.preventDefault(); collectDue({ id: selected.id, data: collectForm }); }}>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Amount ৳ *</label>
              <input type="number" className="input" min="0.01" step="0.01" value={collectForm.amount} onChange={e => setCollForm(f => ({...f, amount: e.target.value}))} required />
              <div className="dim tiny" style={{ marginTop: 4 }}>Outstanding: {TK(selected.total_due)}</div>
            </div>
            <div style={{ marginBottom: 12 }}><label className="label">Date *</label><input type="date" className="input" value={collectForm.collection_date} onChange={e => setCollForm(f => ({...f, collection_date: e.target.value}))} required /></div>
            <div style={{ marginBottom: 12 }}><label className="label">Notes</label><input className="input" value={collectForm.notes} onChange={e => setCollForm(f => ({...f, notes: e.target.value}))} /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowCollect(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isCollecting}>{isCollecting ? 'Saving...' : 'Record Collection'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
