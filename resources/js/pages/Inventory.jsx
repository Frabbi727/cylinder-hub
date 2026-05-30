import React, { useState } from 'react';
import { useInventory } from '../hooks/useInventory';
import CylBadge   from '../components/ui/CylBadge';
import StockBar   from '../components/ui/StockBar';
import StatusPill from '../components/ui/StatusPill';
import Modal      from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Plus, Package, AlertCircle } from 'lucide-react';

const TK = (n) => '৳' + Number(n || 0).toLocaleString('en-US');

const COLORS = [
  { c1: '#2BB3C0', c2: '#0E7B86', label: 'Teal' },
  { c1: '#5A8DEE', c2: '#2C5FB8', label: 'Blue' },
  { c1: '#FF8A5B', c2: '#D2541C', label: 'Orange' },
  { c1: '#9AA3AE', c2: '#5B636E', label: 'Gray' },
  { c1: '#34C759', c2: '#1E8A35', label: 'Green' },
];

const defaultForm = { name: '', size: '', short_code: '', brands: '', status: 'active', reorder_level: 10, capacity: 100, color1: '#2BB3C0', color2: '#0E7B86' };

export default function Inventory() {
  const { cylinders, isLoading, tab, setTab, showAddCylinder, setShowAddCylinder, createCylinder, isCreating } = useInventory();
  const [form, setForm] = useState(defaultForm);

  const totalFilled = cylinders.reduce((s, c) => s + (c.stock?.filled_qty || 0), 0);
  const totalEmpty  = cylinders.reduce((s, c) => s + (c.stock?.empty_qty  || 0), 0);
  const belowReorder = cylinders.filter(c => c.status === 'active' && (c.stock?.filled_qty || 0) <= c.reorder_level).length;

  const handleCreate = (e) => {
    e.preventDefault();
    createCylinder(form);
  };

  if (isLoading) return <LoadingSpinner text="Loading inventory..." />;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div className="stats-grid" style={{ flex: 1, marginRight: 16 }}>
          <div className="scard">
            <span className="ico ico-primary"><Package size={20} /></span>
            <div className="lbl">Total Filled</div>
            <div className="val">{totalFilled} pcs</div>
          </div>
          <div className="scard">
            <span className="ico ico-warning"><Package size={20} /></span>
            <div className="lbl">Total Empty</div>
            <div className="val">{totalEmpty} pcs</div>
          </div>
          <div className="scard">
            <span className="ico ico-coral"><AlertCircle size={20} /></span>
            <div className="lbl">Below Reorder</div>
            <div className="val">{belowReorder} types</div>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddCylinder(true)}>
          <Plus size={16} /> Add Cylinder Type
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-row" style={{ marginBottom: 20 }}>
        <button className={`tab-btn${tab === 'stock' ? ' active' : ''}`} onClick={() => setTab('stock')}>Stock Overview</button>
        <button className={`tab-btn${tab === 'types' ? ' active' : ''}`} onClick={() => setTab('types')}>Cylinder Types</button>
      </div>

      {/* Stock Overview */}
      {tab === 'stock' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {cylinders.map(c => (
            <div key={c.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CylBadge cylinder={c} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div className="dim tiny">{c.size}</div>
                  </div>
                </div>
                <StatusPill status={c.status} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>{c.stock?.filled_qty || 0}</div>
                  <div className="dim tiny">Filled</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--warning)' }}>{c.stock?.empty_qty || 0}</div>
                  <div className="dim tiny">Empty</div>
                </div>
              </div>
              <StockBar filled={c.stock?.filled_qty || 0} empty={c.stock?.empty_qty || 0} capacity={c.stock?.capacity || c.capacity} />
              {(c.stock?.filled_qty || 0) <= c.reorder_level && c.status === 'active' && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                  ⚠ Below reorder level ({c.reorder_level})
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cylinder Types */}
      {tab === 'types' && (
        <div className="card" style={{ padding: 0 }}>
          <table className="tbl" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Cylinder</th>
                <th>Brands</th>
                <th>Filled</th>
                <th>Empty</th>
                <th>Capacity</th>
                <th>Reorder At</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {cylinders.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <CylBadge cylinder={c} size="sm" />
                      <div>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div className="dim tiny">{c.size}</div>
                      </div>
                    </div>
                  </td>
                  <td className="dim">{c.brands || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{c.stock?.filled_qty || 0}</td>
                  <td style={{ color: 'var(--warning)', fontWeight: 600 }}>{c.stock?.empty_qty || 0}</td>
                  <td>{c.capacity}</td>
                  <td>{c.reorder_level}</td>
                  <td><StatusPill status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Cylinder Modal */}
      {showAddCylinder && (
        <Modal title="Add Cylinder Type" onClose={() => setShowAddCylinder(false)}>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label className="label">Name *</label>
                <input className="input" placeholder="LP Gas" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
              </div>
              <div>
                <label className="label">Size *</label>
                <input className="input" placeholder="12 kg" value={form.size} onChange={e => setForm(f => ({...f, size: e.target.value}))} required />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label className="label">Short Code *</label>
                <input className="input" placeholder="12" maxLength="5" value={form.short_code} onChange={e => setForm(f => ({...f, short_code: e.target.value}))} required />
              </div>
              <div>
                <label className="label">Capacity</label>
                <input type="number" className="input" value={form.capacity} onChange={e => setForm(f => ({...f, capacity: parseInt(e.target.value)}))} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Brands</label>
              <input className="input" placeholder="Bashundhara, Omera" value={form.brands} onChange={e => setForm(f => ({...f, brands: e.target.value}))} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Color Theme</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {COLORS.map(col => (
                  <button
                    key={col.label} type="button"
                    onClick={() => setForm(f => ({...f, color1: col.c1, color2: col.c2}))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
                      borderRadius: 8, border: form.color1 === col.c1 ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: form.color1 === col.c1 ? 'var(--primary-soft)' : 'transparent', cursor: 'pointer'
                    }}
                  >
                    <span style={{ width: 16, height: 16, borderRadius: 4, background: `linear-gradient(135deg, ${col.c1}, ${col.c2})` }} />
                    <span style={{ fontSize: 12 }}>{col.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAddCylinder(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isCreating}>{isCreating ? 'Saving...' : 'Add Cylinder'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
