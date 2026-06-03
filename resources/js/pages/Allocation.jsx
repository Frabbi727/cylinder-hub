import React from 'react';
import { useAllocation } from '../hooks/useAllocation';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import CylBadge   from '../components/ui/CylBadge';
import Modal      from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Plus, Truck, CheckCircle, UserPlus, Edit2, Power, AlertCircle, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

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

  const {
    salesmen, cylinders, isLoading,
    viewDate, setViewDate, isToday, prevDay, nextDay,
    showAllocate, setShowAllocate, allocForm, setAllocForm,
    selectedSalesman, openAllocate,
    allocate, isAllocating, allocateError,
    showAddSalesman, setShowAddSalesman,
    salesmanForm, setSalesmanForm,
    createSalesman, isCreatingSalesman, createSalesmanError,
    showEditSalesman, setShowEditSalesman,
    openEditSalesman,
    updateSalesman, isUpdatingSalesman, updateSalesmanError,
    toggleActive,
    showReconcile, setShowReconcile,
    selectedAllocation,
    reconcileForm, setReconcileForm,
    openReconcile,
    reconcile, isReconciling, reconcileError,
  } = useAllocation();

  const activeSalesmen  = salesmen.filter(s => s.is_active).length;
  const totalAllocated  = salesmen.reduce((s, sm) => s + (sm.allocations?.reduce((a, al) => a + (parseInt(al.qty) || 0), 0) || 0), 0);
  const totalCollected  = salesmen.reduce((s, sm) => s + (sm.allocations?.reduce((a, al) => a + parseFloat(al.collected_amount || 0), 0) || 0), 0);

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
            <div key={sm.id} className="card" style={{ opacity: sm.is_active ? 1 : 0.6 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:42,height:42,borderRadius:'50%',background:sm.is_active?'var(--primary)':'var(--text-3)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:15,flexShrink:0 }}>
                    {sm.avatar_initials || sm.name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15 }}>{sm.name}</div>
                    <div className="dim tiny">{sm.phone || sm.email}</div>
                    {!sm.is_active && <span className="pill" style={{ fontSize:10, marginTop:2 }}>{t('status.inactive')}</span>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'flex-end' }}>
                  {sm.is_active && isToday && (
                    <button className="btn btn-primary btn-sm" onClick={() => openAllocate(sm)}>
                      <Plus size={13} /> {t('allocation.allocateStock').split(' ')[0]}
                    </button>
                  )}
                  {isAdmin && (
                    <>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEditSalesman(sm)} title={t('common.edit')}>
                        <Edit2 size={14} />
                      </button>
                      <button className="btn btn-ghost btn-sm"
                        title={sm.is_active ? t('allocation.reconcile') : t('status.active')}
                        onClick={() => window.confirm(`${sm.is_active?'Deactivate':'Activate'} ${sm.name}?`) && toggleActive(sm.id)}>
                        <Power size={14} style={{ color:sm.is_active?'var(--error)':'var(--success)' }} />
                      </button>
                    </>
                  )}
                </div>
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
                        : isToday && (
                          <button className="btn btn-soft btn-sm" style={{ fontSize:12,padding:'4px 10px' }} onClick={() => openReconcile(sm, alloc)}>
                            <RotateCcw size={12} /> {t('allocation.reconcile')}
                          </button>
                        )
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

      {/* ALLOCATE MODAL */}
      {showAllocate && selectedSalesman && (() => {
        const selectedCyl = cylinders.find(c => String(c.id) === String(allocForm.cylinder_id));
        const fifoCost    = selectedCyl?.fifo_cost ?? null;
        const salePrice   = parseFloat(allocForm.sale_price) || 0;
        const diff        = fifoCost !== null && salePrice > 0 ? salePrice - fifoCost : null;
        const isLoss      = diff !== null && diff < 0;
        const isBreakEven = diff !== null && diff === 0;
        return (
          <Modal title={`${t('allocation.allocateStock')} — ${selectedSalesman.name}`} onClose={() => setShowAllocate(false)}>
            <ErrorBanner error={allocateError} />
            <form onSubmit={e => { e.preventDefault(); allocate({ salesmanId: selectedSalesman.id, data: allocForm }); }}>
              <div style={{ marginBottom:16 }}>
                <label className="label">{t('inventory.cylinderTypes')} *</label>
                <select className="select" value={allocForm.cylinder_id} onChange={e => setAllocForm(f => ({...f, cylinder_id: e.target.value, sale_price: ''}))} required>
                  <option value="">Select...</option>
                  {cylinders.map(c => (
                    <option key={c.id} value={c.id} disabled={(c.stock?.filled_qty||0)===0}>
                      {c.name} {c.size} — {c.stock?.filled_qty||0} {t('allocation.availableFilled')}
                      {(c.stock?.filled_qty||0)===0 ? ` (${t('allocation.outOfStock')})` : ''}
                    </option>
                  ))}
                </select>
                {fifoCost !== null && (
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6 }}>
                    <span style={{ fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.04em' }}>{t('allocation.fifoCost')}:</span>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--primary)' }}>৳{Number(fifoCost).toLocaleString('en-US')}</span>
                  </div>
                )}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom: isLoss || isBreakEven ? 8 : 16 }}>
                <div>
                  <label className="label">{t('common.qty')} *</label>
                  <input type="number" className="input" min="1" value={allocForm.qty} onChange={e => setAllocForm(f => ({...f, qty: e.target.value}))} required />
                </div>
                <div>
                  <label className="label">{t('allocation.salePrice')} *</label>
                  <input type="number" className="input" min="0.01" step="0.01" placeholder="e.g. 1200"
                    style={ isLoss ? { borderColor:'var(--error)', outline:'none', boxShadow:'0 0 0 2px var(--error-bg)' } : {} }
                    value={allocForm.sale_price} onChange={e => setAllocForm(f => ({...f, sale_price: e.target.value}))} required />
                  {diff !== null && salePrice > 0 && !isLoss && !isBreakEven && (
                    <div style={{ fontSize:11, color:'var(--success)', marginTop:4 }}>
                      +{TK(diff)} {t('allocation.profitHint').replace('{{amount}}', '')}
                    </div>
                  )}
                </div>
              </div>
              {isLoss && (
                <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fff5f5', border:'1px solid var(--error)', borderRadius:8, padding:'10px 14px', marginBottom:16, color:'var(--error)' }}>
                  <AlertCircle size={16} style={{ flexShrink:0 }} />
                  <span style={{ fontSize:13, fontWeight:500 }}>
                    {t('allocation.lossWarning').replace('{{amount}}', TK(Math.abs(diff)))}
                  </span>
                </div>
              )}
              {isBreakEven && (
                <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fffbeb', border:'1px solid var(--warning)', borderRadius:8, padding:'10px 14px', marginBottom:16, color:'var(--warning)' }}>
                  <AlertCircle size={16} style={{ flexShrink:0 }} />
                  <span style={{ fontSize:13, fontWeight:500 }}>{t('allocation.breakEven')}</span>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:20 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAllocate(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={isAllocating}>
                  {isAllocating ? t('allocation.allocating') : t('allocation.confirmAllocation')}
                </button>
              </div>
            </form>
          </Modal>
        );
      })()}

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

      {/* RECONCILE MODAL */}
      {showReconcile && selectedSalesman && selectedAllocation && (
        <Modal title={t('allocation.endOfDayReconcile')} onClose={() => setShowReconcile(false)} size="md">
          <ErrorBanner error={reconcileError} />
          <div style={{ background:'var(--primary-soft)', borderRadius:10, padding:'12px 16px', marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {selectedAllocation.cylinder && <CylBadge cylinder={selectedAllocation.cylinder} size="sm" />}
                <div>
                  <div style={{ fontWeight:600 }}>{selectedAllocation.cylinder?.name} {selectedAllocation.cylinder?.size}</div>
                  <div className="dim tiny">{selectedSalesman.name}</div>
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:20, fontWeight:700, color:'var(--primary)' }}>{selectedAllocation.qty}</div>
                <div className="dim tiny">{t('allocation.totalAllocated')}</div>
              </div>
            </div>
          </div>
          <div style={{ background:'var(--bg)', borderRadius:8, padding:'10px 14px', marginBottom:20 }}>
            <div className="dim tiny" style={{ marginBottom:4 }}>{t('allocation.currentlyRecorded')}</div>
            <div style={{ display:'flex', gap:20 }}>
              <div><span style={{ fontWeight:600, color:'var(--success)' }}>{selectedAllocation.sold_qty||0}</span> <span className="dim tiny">{t('allocation.sold')}</span></div>
              <div><span style={{ fontWeight:600, color:'var(--warning)' }}>{selectedAllocation.returned_qty||0}</span> <span className="dim tiny">{t('allocation.returned')}</span></div>
            </div>
          </div>
          <form onSubmit={e => { e.preventDefault(); reconcile({ allocationId: selectedAllocation.id, data: { sold_qty: parseInt(reconcileForm.sold_qty)||0, returned_qty: parseInt(reconcileForm.returned_qty)||0, collected_amount: parseFloat(reconcileForm.collected_amount)||0 } }); }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label className="label">{t('allocation.actualSoldQty')} *</label>
                <input type="number" className="input" min="0" max={selectedAllocation.qty}
                  value={reconcileForm.sold_qty} onChange={e => setReconcileForm(f => ({...f, sold_qty: e.target.value}))} required />
                <div className="dim tiny" style={{ marginTop:4 }}>Max: {selectedAllocation.qty}</div>
              </div>
              <div>
                <label className="label">{t('allocation.emptyCylindersReturned')} *</label>
                <input type="number" className="input" min="0"
                  value={reconcileForm.returned_qty} onChange={e => setReconcileForm(f => ({...f, returned_qty: e.target.value}))} required />
              </div>
            </div>
            <div style={{ marginBottom:16 }}>
              <label className="label">{t('allocation.cashCollected')} *</label>
              <input type="number" className="input" min="0" step="0.01"
                value={reconcileForm.collected_amount} onChange={e => setReconcileForm(f => ({...f, collected_amount: e.target.value}))} required />
            </div>
            {reconcileForm.sold_qty !== '' && (
              <div style={{ background:'var(--bg)', borderRadius:8, padding:'10px 14px', marginBottom:16 }}>
                <div className="dim tiny" style={{ marginBottom:4 }}>{t('allocation.afterReconcile')}</div>
                <div>
                  <span style={{ fontWeight:600 }}>{Math.max(0, selectedAllocation.qty - parseInt(reconcileForm.sold_qty||0) - parseInt(reconcileForm.returned_qty||0))}</span>
                  <span className="dim tiny"> {t('allocation.unsoldWillRestore')}</span>
                </div>
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:20 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowReconcile(false)}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary" disabled={isReconciling}>
                {isReconciling ? t('allocation.reconciling') : t('allocation.confirmReconcile')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
