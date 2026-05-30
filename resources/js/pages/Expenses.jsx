import React, { useState } from 'react';
import { useExpenses } from '../hooks/useExpenses';
import Modal    from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Plus, Trash2, Receipt } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const TK = (n) => '৳' + Number(n || 0).toLocaleString('en-US');
const today = new Date().toISOString().split('T')[0];

const CATEGORIES = ['transport', 'salary', 'rent', 'utility', 'other'];
const CAT_COLORS = { transport: '#5A8DEE', salary: '#FF6B6B', rent: '#FF9500', utility: '#34C759', other: '#9AA3AE' };

export default function Expenses() {
  const { expenses, isLoading, showAdd, setShowAdd, createExpense, deleteExpense, isCreating } = useExpenses();
  const { isAdmin } = useAuth();
  const [form, setForm] = useState({ category: 'other', amount: '', expense_date: today, description: '' });

  const totalAmount = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const byCategory  = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = expenses.filter(e => e.category === cat).reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    return acc;
  }, {});

  if (isLoading) return <LoadingSpinner text="Loading expenses..." />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{TK(totalAmount)}</div>
          <div className="dim tiny">This month's expenses</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}><Plus size={16} /> Add Expense</button>
      </div>

      {/* Category breakdown */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => (
          <div key={cat} className="scard" style={{ flex: 1, minWidth: 120 }}>
            <span className="ico" style={{ background: CAT_COLORS[cat] + '22', color: CAT_COLORS[cat] }}>
              <Receipt size={16} />
            </span>
            <div className="lbl" style={{ textTransform: 'capitalize' }}>{cat}</div>
            <div className="val" style={{ fontSize: 16 }}>{TK(byCategory[cat])}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="tbl" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Recorded By</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }} className="dim">No expenses this month</td></tr>
            )}
            {expenses.map(e => (
              <tr key={e.id}>
                <td>{e.expense_date}</td>
                <td>
                  <span className="pill" style={{ background: CAT_COLORS[e.category] + '22', color: CAT_COLORS[e.category] }}>
                    {e.category}
                  </span>
                </td>
                <td className="dim">{e.description || '—'}</td>
                <td style={{ fontWeight: 700 }}>{TK(e.amount)}</td>
                <td className="dim">{e.recorded_by?.name}</td>
                {isAdmin && (
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => window.confirm('Delete expense?') && deleteExpense(e.id)}>
                      <Trash2 size={14} style={{ color: 'var(--error)' }} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <Modal title="Add Expense" onClose={() => setShowAdd(false)}>
          <form onSubmit={e => { e.preventDefault(); createExpense(form); }}>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Category *</label>
              <select className="select" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                {CATEGORIES.map(cat => <option key={cat} value={cat} style={{ textTransform: 'capitalize' }}>{cat}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}><label className="label">Amount ৳ *</label><input type="number" className="input" min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} required /></div>
            <div style={{ marginBottom: 12 }}><label className="label">Date *</label><input type="date" className="input" value={form.expense_date} onChange={e => setForm(f => ({...f, expense_date: e.target.value}))} required /></div>
            <div style={{ marginBottom: 12 }}><label className="label">Description</label><input className="input" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isCreating}>{isCreating ? 'Saving...' : 'Add Expense'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
