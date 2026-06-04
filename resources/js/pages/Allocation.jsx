import React from 'react';
import { useAllocation } from '../hooks/useAllocation';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import CylBadge   from '../components/ui/CylBadge';
import Modal      from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Truck, CheckCircle, UserPlus, Edit2, Power, AlertCircle, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TK = (n) => '৳' + Number(n || 0).toLocaleString('en-US');
const todayStr = new Date().toISOString().split('T')[0];

function ErrorBanner({ error }) {
  if (!error) return null;
  const msg = error.response?.data?.message || error.message || 'Error';
  return (
    <div style={{ background:'var(--error-bg)',color:'var(--error)',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:13,display:'flex',gap:8,alignItems:'flex-start' }}>
      <AlertCircle size={15} style={{ marginTop:1,flexShrink:0 }} /><span>{msg}</span>
    </div>
  );
}

export default function Allocation() {
  const { isAdmin } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    salesmen, allocationSummary, cylinders, isLoading,
    viewDate, setViewDate, isToday, prevDay, nextDay,
    showAddSalesman, setShowAddSalesman,
    salesmanForm, setSalesmanForm,
    createSalesman, isCreatingSalesman, createSalesmanError,
    showEditSalesman, setShowEditSalesman,
    selectedSalesman, openEditSalesman,
    updateSalesman, isUpdatingSalesman, updateSalesmanError,
    toggleActive,
  } = useAllocation();

  const activeSalesmen = allocationSummary.active_count    ?? 0;
  const totalAllocated = allocationSummary.total_allocated ?? 0;
  const totalCollected = allocationSummary.total_collected ?? 0;

  if (isLoading) return <LoadingSpinner text={t('common.loading')} />;

  return (
    <div>
      {/* Date navigation */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={prevDay}>
          <ChevronLeft size={16} /> {t('allocation.prevDay')}
        </button>
        <input type="date" className="input" style={{ width:160 }}
          value={viewDate} onChange={e => setViewDate(e.target.value)} />
        {!isToday && (
          <button className="btn btn-soft btn-sm" onClick={() => setViewDate(todayStr)}>
            {t('common.today')}
          </button>
        )}
        <button className="btn btn-ghost btn-sm" disabled={isToday} onClick={nextDay}>
          {t('allocation.nextDay')} <ChevronRight size={16} />
        </button>
        {!isToday && (
          <span className="pill pill-amber" style={{ fontSize:11 }}>{t('allocation.readOnly')}</span>
        )}
      </div>

      {/* Stats + Add button */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div className="stats-grid" style={{ flex:1, marginRight:16 }}>
          <div className="scard">
            <span className="ico ico-primary"><Truck size={20} /></span>
            <div className="lbl">{t('allocation.activeSalesmen')}</div>
            <div className="val">{activeSalesmen}</div>
          </div>
          <div className="scard">
            <span className="ico ico-warning"><Truck size={20} /></span>
            <div className="lbl">{t('allocation.allocatedToday')}</div>
            <div className="val">{totalAllocated} {t('common.pcs')}</div>
          </div>
          <div className="scard">
            <span className="ico ico-success"><CheckCircle size={20} /></span>
            <div className="lbl">{t('allocation.collectedToday')}</div>
            <div className="val">{TK(totalCollected)}</div>
          </div>
        </div>
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddSalesman(true)}>
            <UserPlus size={16} /> {t('allocation.addSalesman')}
          </button>
        )}
      </div>

      {/* Salesman cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap:16 }}>
        {salesmen.length === 0 && (
          <div className="dim" style={{ gridColumn:'1/-1', textAlign:'center', padding:60 }}>
            {t('allocation.noSalesmenYet')}{isAdmin && ' ' + t('allocation.addFirstSalesman')}
          </div>
        )}
        {salesmen.map(sm => {
          const allocs         = sm.allocations || [];
          const stats          = sm.alloc_stats || {};
          const totalAllocQty  = stats.total_allocated  ?? 0;
          const totalSoldQty   = stats.total_sold       ?? 0;
          const totalRetQty    = stats.total_returned   ?? 0;
          const withSalesman   = stats.with_salesman    ?? 0;
          const collectedAmt   = stats.collected_amount ?? 0;

          return (
            <div key={sm.id} className="card"
              style={{ opacity: sm.is_active ? 1 : 0.6, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onClick={() => navigate(`/salesmen/${sm.id}`)}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:42,height:42,borderRadius:'50%',background:sm.is_active?'var(--primary)':'var(--text-3)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:15,flexShrink:0 }}>
                    {sm.avatar_initials || sm.name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15, display:'flex', alignItems:'center', gap:5 }}>
                      {sm.name}
                      <ExternalLink size={12} style={{ color:'var(--text-3)', flexShrink:0 }} />
                    </div>
                    <div className="dim tiny">{sm.phone || sm.email}</div>
                    {!sm.is_active && <span className="pill" style={{ fontSize:10, marginTop:2 }}>{t('status.inactive')}</span>}
                  </div>
                </div>
                {isAdmin && (
                  <div style={{ display:'flex', gap:6 }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEditSalesman(sm)} title={t('common.edit')}>
                      <Edit2 size={14} />
                    </button>
                    <button className="btn btn-ghost btn-sm"
                      title={sm.is_active ? 'Deactivate' : 'Activate'}
                      onClick={() => window.confirm(`${sm.is_active?'Deactivate':'Activate'} ${sm.name}?`) && toggleActive(sm.id)}>
                      <Power size={14} style={{ color:sm.is_active?'var(--error)':'var(--success)' }} />
                    </button>
                  </div>
                )}
              </div>

              {allocs.length > 0 ? (
                <div style={{ marginBottom:12 }}>
                  <div className="dim tiny" style={{ marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                    {t('allocation.todayAllocations')}
                  </div>
                  {allocs.map(alloc => (
                    <div key={alloc.id} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',borderRadius:8,background:'var(--bg)',marginBottom:4 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        {alloc.cylinder && <CylBadge cylinder={alloc.cylinder} size="sm" />}
                        <div>
                          <div style={{ fontSize:13, fontWeight:600 }}>{alloc.cylinder?.name} {alloc.cylinder?.size}</div>
                          <div className="dim tiny">
                            {alloc.qty} {t('allocation.allocatedLabel')} · {alloc.sold_qty||0} {t('allocation.sold')} · {alloc.returned_qty||0} {t('allocation.returned')}
                            {alloc.sale_price > 0 && <span> · {TK(alloc.sale_price)}/{t('common.pcs')}</span>}
                            {alloc.allocation_date && alloc.allocation_date < todayStr && (
                              <span style={{ marginLeft: 6, color: '#A85200', fontWeight: 600 }}>
                                · carry-over {alloc.allocation_date}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {alloc.is_reconciled
                        ? <span className="pill pill-teal" style={{ fontSize:11 }}>✓ {t('status.reconciled')}</span>
                        : <span className="pill pill-amber" style={{ fontSize:11 }}>Pending EOD</span>
                      }
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dim tiny" style={{ textAlign:'center', padding:'10px 0 14px', borderBottom:'1px solid var(--border-soft)', marginBottom:12 }}>
                  {t('allocation.noAllocations')}
                </div>
              )}

              <div style={{ display:'flex', justifyContent:'space-between' }}>
                {[
                  [t('allocation.allocated'), totalAllocQty, 'var(--text-1)', null],
                  [t('allocation.sold'),      totalSoldQty,  'var(--success)', null],
                  [t('allocation.returned'),  totalRetQty,   'var(--warning)', null],
                  ['With Him', withSalesman,  withSalesman > 0 ? 'var(--primary)' : 'var(--text-3)',
                   withSalesman > 0 ? 'can still sell' : null],
                ].map(([label, value, color, sub]) => (
                  <div key={label} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:18, fontWeight:700, color }}>{value}</div>
                    <div className="dim tiny">{label}</div>
                    {sub && <div style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 600, marginTop: 2 }}>{sub}</div>}
                  </div>
                ))}
              </div>
              {collectedAmt > 0 && (
                <div style={{ textAlign:'center', marginTop:10, padding:8, background:'var(--primary-soft)', borderRadius:8 }}>
                  <span className="dim tiny">{t('allocation.collected')}: </span>
                  <span style={{ fontWeight:700, color:'var(--primary)' }}>{TK(collectedAmt)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>


      {/* ADD SALESMAN MODAL */}
      {showAddSalesman && (
        <Modal title={t('allocation.addSalesman')} onClose={() => setShowAddSalesman(false)}>
          <ErrorBanner error={createSalesmanError} />
          <form onSubmit={e => { e.preventDefault(); createSalesman(salesmanForm); }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label className="label">{t('allocation.fullName')} *</label>
                <input className="input" value={salesmanForm.name} onChange={e => setSalesmanForm(f => ({...f, name: e.target.value}))} required />
              </div>
              <div>
                <label className="label">{t('common.phone')}</label>
                <input className="input" value={salesmanForm.phone} onChange={e => setSalesmanForm(f => ({...f, phone: e.target.value}))} />
              </div>
            </div>
            <div style={{ marginBottom:12 }}>
              <label className="label">{t('common.email')} *</label>
              <input type="email" className="input" value={salesmanForm.email} onChange={e => setSalesmanForm(f => ({...f, email: e.target.value}))} required />
            </div>
            <div style={{ marginBottom:16 }}>
              <label className="label">{t('common.password')} *</label>
              <input type="password" className="input" value={salesmanForm.password} onChange={e => setSalesmanForm(f => ({...f, password: e.target.value}))} required minLength={6} />
              <div className="dim tiny" style={{ marginTop:4 }}>{t('allocation.passwordHint')}</div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:20 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAddSalesman(false)}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary" disabled={isCreatingSalesman}>
                {isCreatingSalesman ? t('common.creating') : t('allocation.addSalesman')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* EDIT SALESMAN MODAL */}
      {showEditSalesman && selectedSalesman && (
        <Modal title={`${t('common.edit')} — ${selectedSalesman.name}`} onClose={() => setShowEditSalesman(false)}>
          <ErrorBanner error={updateSalesmanError} />
          <form onSubmit={e => { e.preventDefault(); updateSalesman({ id: selectedSalesman.id, data: salesmanForm }); }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label className="label">{t('allocation.fullName')} *</label>
                <input className="input" value={salesmanForm.name} onChange={e => setSalesmanForm(f => ({...f, name: e.target.value}))} required />
              </div>
              <div>
                <label className="label">{t('common.phone')}</label>
                <input className="input" value={salesmanForm.phone} onChange={e => setSalesmanForm(f => ({...f, phone: e.target.value}))} />
              </div>
            </div>
            <div style={{ marginBottom:12 }}>
              <label className="label">{t('common.email')} *</label>
              <input type="email" className="input" value={salesmanForm.email} onChange={e => setSalesmanForm(f => ({...f, email: e.target.value}))} required />
            </div>
            <div style={{ marginBottom:16 }}>
              <label className="label">{t('common.password')} <span className="dim">({t('allocation.passwordOptional')})</span></label>
              <input type="password" className="input" value={salesmanForm.password} onChange={e => setSalesmanForm(f => ({...f, password: e.target.value}))} minLength={6} />
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:20 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowEditSalesman(false)}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary" disabled={isUpdatingSalesman}>
                {isUpdatingSalesman ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}
