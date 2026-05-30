import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supplierService } from '../services/supplierService';
import Modal    from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Plus, CreditCard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const TK = (n) => '৳' + Number(n || 0).toLocaleString('en-US');
const today = new Date().toISOString().split('T')[0];

export default function Suppliers() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [showAdd, setShowAdd]     = useState(false);
  const [showPay, setShowPay]     = useState(false);
  const [selected, setSelected]   = useState(null);
  const [addForm, setAddForm]     = useState({ name: '', type: 'dealer', phone: '', address: '' });
  const [payForm, setPayForm]     = useState({ amount: '', payment_date: today, notes: '' });

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn:  () => supplierService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: supplierService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); setShowAdd(false); },
  });

  const payMutation = useMutation({
    mutationFn: ({ id, data }) => supplierService.pay(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setShowPay(false); },
  });

  const supplierList = suppliers?.data || [];
  const totalDue = supplierList.reduce((s, sp) => s + parseFloat(sp.total_due || 0), 0);

  if (isLoading) return <LoadingSpinner text="Loading suppliers..." />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div className="dim tiny">Total Supplier Due: <strong style={{ color: 'var(--warning)' }}>{TK(totalDue)}</strong></div>
        {isAdmin && <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}><Plus size={16} /> Add Supplier</button>}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="tbl" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Phone</th>
              <th>Total Due</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {supplierList.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }} className="dim">No suppliers</td></tr>
            )}
            {supplierList.map(s => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.name}</td>
                <td><span className="pill">{s.type}</span></td>
                <td className="dim">{s.phone || '—'}</td>
                <td style={{ fontWeight: 700, color: s.total_due > 0 ? 'var(--warning)' : 'var(--success)' }}>{TK(s.total_due)}</td>
                <td>
                  {s.total_due > 0 && (
                    <button className="btn btn-soft btn-sm" onClick={() => { setSelected(s); setPayForm({ amount: s.total_due, payment_date: today, notes: '' }); setShowPay(true); }}>
                      <CreditCard size={14} /> Pay
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <Modal title="Add Supplier" onClose={() => setShowAdd(false)}>
          <form onSubmit={e => { e.preventDefault(); createMutation.mutate(addForm); }}>
            <div style={{ marginBottom: 12 }}><label className="label">Name *</label><input className="input" value={addForm.name} onChange={e => setAddForm(f => ({...f, name: e.target.value}))} required /></div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Type</label>
              <select className="select" value={addForm.type} onChange={e => setAddForm(f => ({...f, type: e.target.value}))}>
                <option value="dealer">Dealer / Agent</option>
                <option value="self">Self</option>
              </select>
            </div>
            <div style={{ marginBottom: 12 }}><label className="label">Phone</label><input className="input" value={addForm.phone} onChange={e => setAddForm(f => ({...f, phone: e.target.value}))} /></div>
            <div style={{ marginBottom: 12 }}><label className="label">Address</label><input className="input" value={addForm.address} onChange={e => setAddForm(f => ({...f, address: e.target.value}))} /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>{createMutation.isPending ? 'Saving...' : 'Add Supplier'}</button>
            </div>
          </form>
        </Modal>
      )}

      {showPay && selected && (
        <Modal title={`Pay Supplier — ${selected.name}`} onClose={() => setShowPay(false)}>
          <form onSubmit={e => { e.preventDefault(); payMutation.mutate({ id: selected.id, data: payForm }); }}>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Amount ৳ *</label>
              <input type="number" className="input" min="0.01" step="0.01" value={payForm.amount} onChange={e => setPayForm(f => ({...f, amount: e.target.value}))} required />
              <div className="dim tiny" style={{ marginTop: 4 }}>Outstanding: {TK(selected.total_due)}</div>
            </div>
            <div style={{ marginBottom: 12 }}><label className="label">Date *</label><input type="date" className="input" value={payForm.payment_date} onChange={e => setPayForm(f => ({...f, payment_date: e.target.value}))} required /></div>
            <div style={{ marginBottom: 12 }}><label className="label">Notes</label><input className="input" value={payForm.notes} onChange={e => setPayForm(f => ({...f, notes: e.target.value}))} /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowPay(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={payMutation.isPending}>{payMutation.isPending ? 'Saving...' : 'Record Payment'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
