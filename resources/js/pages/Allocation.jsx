import React, { useState } from 'react';
import { useAllocation } from '../hooks/useAllocation';
import CylBadge   from '../components/ui/CylBadge';
import Modal      from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Plus, Truck, CheckCircle } from 'lucide-react';

const TK = (n) => '৳' + Number(n || 0).toLocaleString('en-US');
const today = new Date().toISOString().split('T')[0];

export default function Allocation() {
  const { salesmen, cylinders, isLoading, showAllocate, setShowAllocate, selectedSalesman, setSelectedSalesman, allocate, isAllocating } = useAllocation();
  const [form, setForm] = useState({ cylinder_id: '', qty: 1, allocation_date: today });

  const totalAllocated  = salesmen.reduce((s, sm) => s + (sm.allocations?.reduce((a, al) => a + al.qty, 0) || 0), 0);
  const totalCollected  = salesmen.reduce((s, sm) => s + (sm.allocations?.reduce((a, al) => a + parseFloat(al.collected_amount || 0), 0) || 0), 0);

  const handleAllocate = (e) => {
    e.preventDefault();
    if (!selectedSalesman) return;
    allocate({ salesmanId: selectedSalesman.id, data: form });
  };

  if (isLoading) return <LoadingSpinner text="Loading salesmen..." />;

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="scard">
          <span className="ico ico-primary"><Truck size={20} /></span>
          <div className="lbl">Active Salesmen</div>
          <div className="val">{salesmen.length}</div>
        </div>
        <div className="scard">
          <span className="ico ico-warning"><Truck size={20} /></span>
          <div className="lbl">Allocated Today</div>
          <div className="val">{totalAllocated} pcs</div>
        </div>
        <div className="scard">
          <span className="ico ico-success"><CheckCircle size={20} /></span>
          <div className="lbl">Collected Today</div>
          <div className="val">{TK(totalCollected)}</div>
        </div>
      </div>

      {/* Salesman Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {salesmen.length === 0 && <div className="dim" style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40 }}>No salesmen found.</div>}
        {salesmen.map(sm => {
          const todayAllocs = sm.allocations || [];
          const totalAllocQty   = todayAllocs.reduce((s, a) => s + a.qty, 0);
          const totalSoldQty    = todayAllocs.reduce((s, a) => s + (a.sold_qty || 0), 0);
          const totalReturnedQty= todayAllocs.reduce((s, a) => s + (a.returned_qty || 0), 0);
          const withSalesman    = totalAllocQty - totalSoldQty - totalReturnedQty;
          const collectedAmt    = todayAllocs.reduce((s, a) => s + parseFloat(a.collected_amount || 0), 0);

          return (
            <div key={sm.id} className="card">
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 14
                  }}>
                    {sm.avatar_initials || sm.name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{sm.name}</div>
                    <div className="dim tiny">{sm.phone}</div>
                  </div>
                </div>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => { setSelectedSalesman(sm); setShowAllocate(true); }}
                >
                  <Plus size={14} /> Allocate
                </button>
              </div>

              {/* Today's allocations */}
              {todayAllocs.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  {todayAllocs.map(alloc => (
                    <div key={alloc.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {alloc.cylinder && <CylBadge cylinder={alloc.cylinder} size="sm" />}
                        <span style={{ fontSize: 13 }}>{alloc.cylinder?.name} {alloc.cylinder?.size}</span>
                      </div>
                      <span style={{ fontWeight: 600 }}>{alloc.qty} pcs</span>
                    </div>
                  ))}
                </div>
              )}

              {todayAllocs.length === 0 && (
                <div className="dim tiny" style={{ textAlign: 'center', padding: '12px 0' }}>No allocations today</div>
              )}

              {/* Metrics */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-soft)', paddingTop: 12 }}>
                {[
                  ['Allocated', totalAllocQty, 'var(--text-1)'],
                  ['Sold', totalSoldQty, 'var(--success)'],
                  ['Returned', totalReturnedQty, 'var(--warning)'],
                  ['With him', Math.max(0, withSalesman), 'var(--primary)'],
                ].map(([lbl, val, color]) => (
                  <div key={lbl} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color }}>{val}</div>
                    <div className="dim tiny">{lbl}</div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'center', marginTop: 8, fontSize: 13 }}>
                <span className="dim">Collected: </span>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{TK(collectedAmt)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Allocate Modal */}
      {showAllocate && selectedSalesman && (
        <Modal title={`Allocate Stock — ${selectedSalesman.name}`} onClose={() => setShowAllocate(false)}>
          <form onSubmit={handleAllocate}>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Cylinder Type *</label>
              <select className="select" value={form.cylinder_id} onChange={e => setForm(f => ({...f, cylinder_id: e.target.value}))} required>
                <option value="">Select...</option>
                {cylinders.map(c => <option key={c.id} value={c.id}>{c.name} {c.size} (filled: {c.stock?.filled_qty || 0})</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Quantity *</label>
              <input type="number" className="input" min="1" value={form.qty} onChange={e => setForm(f => ({...f, qty: parseInt(e.target.value)}))} required />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAllocate(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isAllocating}>{isAllocating ? 'Allocating...' : 'Allocate'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
