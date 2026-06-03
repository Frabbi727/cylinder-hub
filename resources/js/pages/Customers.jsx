import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomers } from '../hooks/useCustomers';
import { useTranslation } from 'react-i18next';
import Modal    from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Plus, CreditCard, Trash2, Search, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const TK = (n) => '৳' + Number(n || 0).toLocaleString('en-US');
const todayStr = new Date().toISOString().split('T')[0];

export default function Customers() {
  const { t }    = useTranslation();
  const navigate = useNavigate();
  const { customers, isLoading, showAdd, setShowAdd, showCollect, setShowCollect, selected, setSelected, createCustomer, collectDue, deleteCustomer, isCreating, isCollecting } = useCustomers();
  const { isAdmin } = useAuth();
  const [addForm, setAddForm]       = useState({ name: '', phone: '', address: '' });
  const [collectForm, setCollForm]  = useState({ amount: '', collection_date: todayStr, notes: '' });
  const [search, setSearch]         = useState('');
  const [duesOnly, setDuesOnly]     = useState(false);

  const filtered = useMemo(() => {
    let rows = customers;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(c => c.name.toLowerCase().includes(q) || (c.phone || '').includes(q));
    }
    if (duesOnly) rows = rows.filter(c => parseFloat(c.total_due || 0) > 0);
    return rows;
  }, [customers, search, duesOnly]);

  const totalDue = customers.reduce((s, c) => s + parseFloat(c.total_due || 0), 0);

  if (isLoading) return <LoadingSpinner text={t('common.loading')} />;

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>{t('nav.customers')}</h2>
          <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>
            {t('customers.totalDue')}: <strong style={{ color:'var(--accent)' }}>{TK(totalDue)}</strong>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> {t('customers.addCustomer')}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:'1', minWidth:200, maxWidth:360 }}>
          <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)' }} />
          <input className="input" style={{ paddingLeft:36 }} placeholder="Search by name or phone..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, cursor:'pointer', whiteSpace:'nowrap' }}>
          <input type="checkbox" checked={duesOnly} onChange={e => setDuesOnly(e.target.checked)} />
          Only with outstanding dues
        </label>
      </div>

      <div className="card" style={{ padding:0 }}>
        <table className="tbl" style={{ width:'100%' }}>
          <thead>
            <tr>
              <th>{t('common.name')}</th>
              <th>{t('common.phone')}</th>
              <th>{t('common.address')}</th>
              <th style={{ textAlign:'right' }}>{t('common.due')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign:'center', padding:40 }} className="dim">{t('customers.noCustomers')}</td></tr>
            )}
            {filtered.map(c => (
              <tr key={c.id} style={{ cursor:'pointer', background: parseFloat(c.total_due || 0) > 0 ? '#FEF2F2' : undefined }}
                onClick={() => navigate(`/customers/${c.id}`)}>
                <td style={{ fontWeight:600 }}>{c.name}</td>
                <td className="dim">{c.phone || '—'}</td>
                <td className="dim" style={{ maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.address || '—'}</td>
                <td style={{ fontWeight:700, textAlign:'right', color: parseFloat(c.total_due || 0) > 0 ? '#B83030' : 'var(--success)' }}>
                  {TK(c.total_due)}
                </td>
                <td>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); navigate(`/customers/${c.id}`); }}>
                      <Eye size={14} />
                    </button>
                    {c.total_due > 0 && (
                      <button className="btn btn-soft btn-sm" onClick={e => { e.stopPropagation(); setSelected(c); setCollForm({ amount: c.total_due, collection_date: todayStr, notes: '' }); setShowCollect(true); }}>
                        <CreditCard size={14} /> {t('customers.collectDue')}
                      </button>
                    )}
                    {isAdmin && (
                      <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); window.confirm(t('customers.deleteConfirm')) && deleteCustomer(c.id); }}>
                        <Trash2 size={14} style={{ color:'var(--error)' }} />
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
        <Modal title={t('customers.addCustomer')} onClose={() => setShowAdd(false)}>
          <form onSubmit={e => { e.preventDefault(); createCustomer(addForm); }}>
            <div style={{ marginBottom:12 }}><label className="label">{t('common.name')} *</label><input className="input" value={addForm.name} onChange={e => setAddForm(f => ({...f, name: e.target.value}))} required /></div>
            <div style={{ marginBottom:12 }}><label className="label">{t('common.phone')}</label><input className="input" value={addForm.phone} onChange={e => setAddForm(f => ({...f, phone: e.target.value}))} /></div>
            <div style={{ marginBottom:12 }}><label className="label">{t('common.address')}</label><input className="input" value={addForm.address} onChange={e => setAddForm(f => ({...f, address: e.target.value}))} /></div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:20 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary" disabled={isCreating}>{isCreating ? t('common.saving') : t('customers.addCustomer')}</button>
            </div>
          </form>
        </Modal>
      )}

      {showCollect && selected && (
        <Modal title={`${t('customers.collectDue')} — ${selected.name}`} onClose={() => setShowCollect(false)}>
          <form onSubmit={e => { e.preventDefault(); collectDue({ id: selected.id, data: collectForm }); }}>
            <div style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                <label className="label" style={{ margin:0 }}>{t('common.amount')} ৳ *</label>
                <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize:11, padding:'2px 8px' }}
                  onClick={() => setCollForm(f => ({...f, amount: selected.total_due}))}>
                  {t('common.payInFull')}
                </button>
              </div>
              <input type="number" className="input" min="0.01" step="0.01" max={selected.total_due}
                value={collectForm.amount} onChange={e => setCollForm(f => ({...f, amount: e.target.value}))} required />
            </div>
            <div style={{ marginBottom:12 }}><label className="label">{t('common.date')} *</label><input type="date" className="input" value={collectForm.collection_date} onChange={e => setCollForm(f => ({...f, collection_date: e.target.value}))} required /></div>
            <div style={{ marginBottom:12 }}><label className="label">{t('common.notes')}</label><input className="input" value={collectForm.notes} onChange={e => setCollForm(f => ({...f, notes: e.target.value}))} /></div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:20 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowCollect(false)}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary" disabled={isCollecting}>{isCollecting ? t('common.saving') : t('customers.recordCollection')}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
