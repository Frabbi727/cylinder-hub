import React, { useState } from 'react';
import { useInventory } from '../hooks/useInventory';
import { useTranslation } from 'react-i18next';
import CylBadge   from '../components/ui/CylBadge';
import StockBar   from '../components/ui/StockBar';
import StatusPill from '../components/ui/StatusPill';
import Modal      from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Plus, Package, AlertCircle, Edit2, Trash2 } from 'lucide-react';

const COLORS = [
  { c1: '#2BB3C0', c2: '#0E7B86', label: 'Teal' },
  { c1: '#5A8DEE', c2: '#2C5FB8', label: 'Blue' },
  { c1: '#FF8A5B', c2: '#D2541C', label: 'Orange' },
  { c1: '#9AA3AE', c2: '#5B636E', label: 'Gray' },
  { c1: '#34C759', c2: '#1E8A35', label: 'Green' },
];

const emptyForm = {
  name: '', size: '', short_code: '', brands: '',
  status: 'active', reorder_level: 10, capacity: 100,
  color1: '#2BB3C0', color2: '#0E7B86',
};

function CylinderForm({ form, setForm, onSubmit, onClose, submitLabel, isLoading }) {
  const { t } = useTranslation();
  return (
    <form onSubmit={onSubmit}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
        <div>
          <label className="label">{t('common.name')} *</label>
          <input className="input" placeholder="Omera, Bashundhara…" value={form.name}
            onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
        </div>
        <div>
          <label className="label">{t('inventory.size')} *</label>
          <input className="input" placeholder="12 kg" value={form.size}
            onChange={e => setForm(f => ({...f, size: e.target.value}))} required />
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
        <div>
          <label className="label">{t('inventory.shortCode')} *</label>
          <input className="input" placeholder="12" maxLength="5" value={form.short_code}
            onChange={e => setForm(f => ({...f, short_code: e.target.value}))} required />
        </div>
        <div>
          <label className="label">{t('inventory.capacity')}</label>
          <input type="number" className="input" min="1" value={form.capacity}
            onChange={e => setForm(f => ({...f, capacity: parseInt(e.target.value) || 100}))} />
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
        <div>
          <label className="label">{t('inventory.reorderAt')}</label>
          <input type="number" className="input" min="0" value={form.reorder_level}
            onChange={e => setForm(f => ({...f, reorder_level: parseInt(e.target.value) || 0}))} />
        </div>
        <div>
          <label className="label">{t('common.status')}</label>
          <select className="select" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
            <option value="active">{t('status.active')}</option>
            <option value="inactive">{t('status.inactive')}</option>
          </select>
        </div>
      </div>
      <div style={{ marginBottom:12 }}>
        <label className="label">{t('inventory.brands')}</label>
        <input className="input" placeholder="Bashundhara, Omera" value={form.brands}
          onChange={e => setForm(f => ({...f, brands: e.target.value}))} />
      </div>
      <div style={{ marginBottom:16 }}>
        <label className="label">{t('inventory.colorTheme')}</label>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {COLORS.map(col => (
            <button key={col.label} type="button"
              onClick={() => setForm(f => ({...f, color1: col.c1, color2: col.c2}))}
              style={{
                display:'flex', alignItems:'center', gap:6, padding:'6px 10px',
                borderRadius:8,
                border: form.color1 === col.c1 ? '2px solid var(--primary)' : '1px solid var(--border)',
                background: form.color1 === col.c1 ? 'var(--primary-soft)' : 'transparent',
                cursor:'pointer',
              }}>
              <span style={{ width:16, height:16, borderRadius:4, background:`linear-gradient(135deg, ${col.c1}, ${col.c2})` }} />
              <span style={{ fontSize:12 }}>{col.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:20 }}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? t('common.saving') : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default function Inventory() {
  const { t } = useTranslation();
  const {
    cylinders, isLoading, tab, setTab,
    showAddCylinder, setShowAddCylinder,
    createCylinder, isCreating,
    updateCylinder, isUpdating,
    deleteCylinder, isDeleting,
  } = useInventory();

  const [addForm,    setAddForm]    = useState(emptyForm);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm,   setEditForm]   = useState(emptyForm);

  const totalFilled  = cylinders.reduce((s, c) => s + (c.stock?.filled_qty || 0), 0);
  const totalEmpty   = cylinders.reduce((s, c) => s + (c.stock?.empty_qty  || 0), 0);
  const belowReorder = cylinders.filter(c => c.status === 'active' && (c.stock?.filled_qty || 0) <= c.reorder_level).length;

  const openEdit = (c) => {
    setEditTarget(c);
    setEditForm({
      name:          c.name,
      size:          c.size,
      short_code:    c.short_code,
      brands:        c.brands || '',
      status:        c.status,
      reorder_level: c.reorder_level,
      capacity:      c.capacity,
      color1:        c.color1,
      color2:        c.color2,
    });
  };

  const handleAdd = (e) => {
    e.preventDefault();
    createCylinder(addForm, {
      onSuccess: () => { setAddForm(emptyForm); setShowAddCylinder(false); },
    });
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    updateCylinder({ id: editTarget.id, data: editForm }, {
      onSuccess: () => setEditTarget(null),
    });
  };

  const handleDelete = (c) => {
    if (!window.confirm(`Delete "${c.name} ${c.size}"? This cannot be undone.`)) return;
    deleteCylinder(c.id);
  };

  if (isLoading) return <LoadingSpinner text={t('common.loading')} />;

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div className="stats-grid" style={{ flex:1, marginRight:16 }}>
          <div className="scard">
            <span className="ico ico-primary"><Package size={20} /></span>
            <div className="lbl">{t('inventory.totalFilled')}</div>
            <div className="val">{totalFilled} {t('common.pcs')}</div>
          </div>
          <div className="scard">
            <span className="ico ico-warning"><Package size={20} /></span>
            <div className="lbl">{t('inventory.totalEmpty')}</div>
            <div className="val">{totalEmpty} {t('common.pcs')}</div>
          </div>
          <div className="scard">
            <span className="ico ico-coral"><AlertCircle size={20} /></span>
            <div className="lbl">{t('inventory.belowReorder')}</div>
            <div className="val">{belowReorder} {t('inventory.types')}</div>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setAddForm(emptyForm); setShowAddCylinder(true); }}>
          <Plus size={16} /> {t('inventory.addCylinderType')}
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-row" style={{ marginBottom:20 }}>
        <button className={`tab-btn${tab === 'stock' ? ' active' : ''}`} onClick={() => setTab('stock')}>
          {t('inventory.stockOverview')}
        </button>
        <button className={`tab-btn${tab === 'types' ? ' active' : ''}`} onClick={() => setTab('types')}>
          {t('inventory.cylinderTypes')}
        </button>
      </div>

      {/* ── Stock Overview ────────────────────────────────────────── */}
      {tab === 'stock' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 }}>
          {cylinders.length === 0 && (
            <div className="dim" style={{ padding:40, textAlign:'center' }}>{t('inventory.noCylinders')}</div>
          )}
          {cylinders.map(c => (
            <div key={c.id} className="card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <CylBadge cylinder={c} />
                  <div>
                    <div style={{ fontWeight:600 }}>{c.name}</div>
                    <div className="dim tiny">{c.size}</div>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <StatusPill status={c.status} />
                  <button className="btn btn-ghost btn-sm" title={t('common.edit')}
                    onClick={() => openEdit(c)} style={{ padding:'4px 6px' }}>
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:22, fontWeight:700, color:'var(--primary)' }}>{c.stock?.filled_qty || 0}</div>
                  <div className="dim tiny">{t('dashboard.filledLabel')}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:22, fontWeight:700, color:'var(--warning)' }}>{c.stock?.empty_qty || 0}</div>
                  <div className="dim tiny">{t('dashboard.emptyLabel')}</div>
                </div>
              </div>
              <StockBar filled={c.stock?.filled_qty || 0} empty={c.stock?.empty_qty || 0} capacity={c.stock?.capacity || c.capacity} />
              {(c.stock?.filled_qty || 0) <= c.reorder_level && c.status === 'active' && (
                <div style={{ marginTop:8, fontSize:12, color:'var(--accent)', fontWeight:600 }}>
                  {t('inventory.belowReorderWarning')} ({c.reorder_level})
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Cylinder Types table ──────────────────────────────────── */}
      {tab === 'types' && (
        <div className="card" style={{ padding:0 }}>
          <table className="tbl" style={{ width:'100%' }}>
            <thead>
              <tr>
                <th>{t('inventory.cylinderTypes')}</th>
                <th>{t('inventory.brands')}</th>
                <th style={{ textAlign:'right' }}>{t('dashboard.filledLabel')}</th>
                <th style={{ textAlign:'right' }}>{t('dashboard.emptyLabel')}</th>
                <th style={{ textAlign:'right' }}>{t('inventory.capacity')}</th>
                <th style={{ textAlign:'right' }}>{t('inventory.reorderAt')}</th>
                <th>{t('common.status')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {cylinders.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign:'center', padding:40 }} className="dim">{t('inventory.noCylinders')}</td></tr>
              )}
              {cylinders.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <CylBadge cylinder={c} size="sm" />
                      <div>
                        <div style={{ fontWeight:600 }}>{c.name}</div>
                        <div className="dim tiny">{c.size}</div>
                      </div>
                    </div>
                  </td>
                  <td className="dim">{c.brands || '—'}</td>
                  <td style={{ fontWeight:600, textAlign:'right' }}>{c.stock?.filled_qty || 0}</td>
                  <td style={{ color:'var(--warning)', fontWeight:600, textAlign:'right' }}>{c.stock?.empty_qty || 0}</td>
                  <td style={{ textAlign:'right' }}>{c.capacity}</td>
                  <td style={{ textAlign:'right' }}>{c.reorder_level}</td>
                  <td><StatusPill status={c.status} /></td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn-ghost btn-sm" title={t('common.edit')} onClick={() => openEdit(c)}>
                        <Edit2 size={14} />
                      </button>
                      <button className="btn btn-ghost btn-sm" title={t('common.delete')}
                        onClick={() => handleDelete(c)} disabled={isDeleting}>
                        <Trash2 size={14} style={{ color:'var(--error)' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add cylinder modal ───────────────────────────────────── */}
      {showAddCylinder && (
        <Modal title={t('inventory.addCylinderType')}
          onClose={() => { setShowAddCylinder(false); setAddForm(emptyForm); }}>
          <CylinderForm
            form={addForm} setForm={setAddForm}
            onSubmit={handleAdd}
            onClose={() => { setShowAddCylinder(false); setAddForm(emptyForm); }}
            submitLabel={t('inventory.addCylinderType')}
            isLoading={isCreating}
          />
        </Modal>
      )}

      {/* ── Edit cylinder modal ──────────────────────────────────── */}
      {editTarget && (
        <Modal title={`${t('common.edit')} — ${editTarget.name} ${editTarget.size}`}
          onClose={() => setEditTarget(null)}>
          <CylinderForm
            form={editForm} setForm={setEditForm}
            onSubmit={handleUpdate}
            onClose={() => setEditTarget(null)}
            submitLabel={t('common.save')}
            isLoading={isUpdating}
          />
        </Modal>
      )}
    </div>
  );
}
