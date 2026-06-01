import React, { useState, useMemo } from 'react';
import { useSales } from '../hooks/useSales';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesmanService } from '../services/salesmanService';
import { stockService }    from '../services/stockService';
import { useAuth }         from '../contexts/AuthContext';
import StatusPill     from '../components/ui/StatusPill';
import CylBadge       from '../components/ui/CylBadge';
import Modal          from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Trash2, CreditCard, AlertCircle, Package } from 'lucide-react';

const TK       = (n) => '৳' + Number(n || 0).toLocaleString('en-US');
const todayStr = new Date().toISOString().split('T')[0];

function ErrorBanner({ error }) {
  if (!error) return null;
  const msg = error.response?.data?.message || error.message || 'Error';
  return (
    <div style={{ background:'var(--error-bg)',color:'var(--error)',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:13,display:'flex',gap:8,alignItems:'flex-start' }}>
      <AlertCircle size={15} style={{ marginTop:1, flexShrink:0 }} /><span>{msg}</span>
    </div>
  );
}

export default function Sales() {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const isSalesman = user?.role === 'salesman';

  const { sales, isLoading, deleteSale, isDeleting, payTarget, setPayTarget, payBalance, isPaying, payError } = useSales();
  const [payForm,   setPayForm]   = useState({ amount: '', date: todayStr, notes: '' });
  const [showEmpty, setShowEmpty] = useState(false);
  const [emptyForm, setEmptyForm] = useState({ cylinder_id: '', qty: 1, notes: '' });
  const [emptyErr,  setEmptyErr]  = useState('');

  // Salesman's today allocations
  const { data: myData } = useQuery({
    queryKey: ['my-allocations', user?.id],
    queryFn:  () => salesmanService.getById(user.id),
    enabled:  isSalesman && !!user?.id,
    refetchInterval: 30_000,
  });

  const allocations = useMemo(() => {
    if (!isSalesman) return [];
    return (myData?.salesman?.allocations || []).filter(a => !a.is_reconciled);
  }, [isSalesman, myData]);

  // Empty return mutation
  const emptyMutation = useMutation({
    mutationFn: (data) => stockService.storeReturn(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-allocations'] });
      setShowEmpty(false);
      setEmptyForm({ cylinder_id: '', qty: 1, notes: '' });
      setEmptyErr('');
    },
    onError: (e) => setEmptyErr(e.response?.data?.message || 'Failed to record'),
  });

  const openPay = (sale) => {
    setPayForm({ amount: sale.due_amount || '', date: todayStr, notes: '' });
    setPayTarget(sale);
  };

  if (isLoading) return <LoadingSpinner text={t('common.loading')} />;

  return (
    <div>
      {/* ── Salesman allocation panel ─────────────────────────────── */}
      {isSalesman && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div className="section-title">{t('allocation.myAllocations')}</div>
            <button className="btn btn-soft btn-sm" onClick={() => setShowEmpty(true)}>
              <Package size={14} /> {t('allocation.recordEmpty')}
            </button>
          </div>

          {allocations.length === 0 ? (
            <div className="card" style={{ textAlign:'center', padding:24, color:'var(--text-3)' }}>
              {t('allocation.noAllocationToday')}
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:12 }}>
              {allocations.map(a => {
                const remaining = Math.max(0, a.qty - (a.sold_qty || 0));
                const pct = a.qty > 0 ? Math.round(((a.qty - remaining) / a.qty) * 100) : 0;
                return (
                  <div key={a.id} className="card" style={{ padding:14 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                      {a.cylinder && <CylBadge cylinder={a.cylinder} size="sm" />}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:14 }}>{a.cylinder?.name} {a.cylinder?.size}</div>
                        <div style={{ color:'var(--primary)', fontSize:13, fontWeight:600 }}>{TK(a.sale_price)}/{t('common.pcs')}</div>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div style={{ background:'var(--border-soft)', borderRadius:4, height:6, marginBottom:10, overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`, height:'100%', background:'var(--primary)', borderRadius:4, transition:'width 0.3s' }} />
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                      <div style={{ textAlign:'center' }}>
                        <div style={{ fontWeight:700 }}>{a.qty}</div>
                        <div className="dim tiny">{t('allocation.allocated')}</div>
                      </div>
                      <div style={{ textAlign:'center' }}>
                        <div style={{ fontWeight:700, color:'var(--success)' }}>{a.sold_qty || 0}</div>
                        <div className="dim tiny">{t('allocation.sold')}</div>
                      </div>
                      <div style={{ textAlign:'center' }}>
                        <div style={{ fontWeight:700, color:'var(--primary)' }}>{remaining}</div>
                        <div className="dim tiny">{t('allocation.remaining')}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Sales table ───────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0 }}>
        <table className="tbl" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>{t('common.date')}</th>
              {!isSalesman && <th>{t('nav.customers')}</th>}
              <th>{t('sales.items')}</th>
              <th>{t('common.total')}</th>
              <th>{t('common.paid')}</th>
              <th>{t('common.due')}</th>
              <th>{t('sales.paymentType')}</th>
              {!isSalesman && <th>{t('nav.salesman')}</th>}
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && (
              <tr><td colSpan={isSalesman ? 7 : 9} style={{ textAlign:'center', padding:40 }} className="dim">{t('sales.noSales')}</td></tr>
            )}
            {sales.map(s => (
              <tr key={s.id}>
                <td>{s.sale_date}</td>
                {!isSalesman && <td style={{ fontWeight:600 }}>{s.customer?.name || t('sales.walkIn')}</td>}
                <td>
                  {s.items?.map((it, i) => (
                    <span key={i} style={{ display:'block', fontSize:12 }}>
                      {it.cylinder?.name} {it.cylinder?.size} ×{it.qty}
                    </span>
                  ))}
                </td>
                <td style={{ fontWeight:600 }}>{TK(s.total_amount)}</td>
                <td style={{ color:'var(--success)' }}>{TK(s.paid_amount)}</td>
                <td style={{ color: s.due_amount > 0 ? 'var(--accent)' : 'inherit', fontWeight: s.due_amount > 0 ? 700 : 400 }}>
                  {TK(s.due_amount)}
                </td>
                <td><StatusPill status={s.payment_type} /></td>
                {!isSalesman && <td className="dim">{s.salesman?.name}</td>}
                <td>
                  <div style={{ display:'flex', gap:6 }}>
                    {s.due_amount > 0 && (
                      <button className="btn btn-soft btn-sm" onClick={() => openPay(s)} title={t('sales.collectBalance')}>
                        <CreditCard size={13} /> {t('sales.collectBalance')}
                      </button>
                    )}
                    {isAdmin && (
                      <button className="btn btn-ghost btn-sm"
                        onClick={() => window.confirm(t('sales.deleteConfirm')) && deleteSale(s.id)}
                        disabled={isDeleting} title={t('common.delete')}
                      >
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

      {/* ── Collect payment modal ─────────────────────────────────── */}
      {payTarget && (
        <Modal title={t('sales.collectPayment')} onClose={() => setPayTarget(null)}>
          <ErrorBanner error={payError} />
          <div style={{ background:'var(--primary-soft)',borderRadius:10,padding:'12px 16px',marginBottom:20 }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:600 }}>{payTarget.customer?.name || t('sales.walkIn')}</div>
                <div className="dim tiny">{t('common.date')}: {payTarget.sale_date}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:18,fontWeight:700,color:'var(--accent)' }}>{TK(payTarget.due_amount)}</div>
                <div className="dim tiny">{t('sales.remainingDue')}</div>
              </div>
            </div>
          </div>
          <div style={{ background:'var(--bg)',borderRadius:8,padding:'8px 14px',marginBottom:16 }}>
            <span className="dim tiny">{t('sales.alreadyPaid')}: </span>
            <span style={{ fontWeight:600 }}>{TK(payTarget.paid_amount)}</span>
            <span className="dim tiny"> / {TK(payTarget.total_amount)}</span>
          </div>
          <form onSubmit={e => { e.preventDefault(); payBalance({ id: payTarget.id, data: payForm }); }}>
            <div style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                <label className="label" style={{ margin:0 }}>{t('common.amount')} ৳ *</label>
                <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize:11, padding:'2px 8px' }}
                  onClick={() => setPayForm(f => ({...f, amount: payTarget.due_amount}))}>
                  {t('common.payInFull')}
                </button>
              </div>
              <input type="number" className="input" min="0.01" step="0.01" max={payTarget.due_amount}
                value={payForm.amount} onChange={e => setPayForm(f => ({...f, amount: e.target.value}))} required />
              {(() => {
                const entered = parseFloat(payForm.amount || 0);
                const remaining = Math.round((payTarget.due_amount - entered) * 100) / 100;
                if (entered <= 0) return <div className="dim tiny" style={{ marginTop:5 }}>{t('sales.partialPaidHint')}</div>;
                if (remaining <= 0) return <div style={{ color:'var(--success)', fontSize:12, fontWeight:600, marginTop:5 }}>{t('common.fullySettled')}</div>;
                return <div style={{ color:'var(--accent)', fontSize:12, marginTop:5 }}>{TK(remaining)} {t('common.afterPayment')}</div>;
              })()}
            </div>
            <div style={{ marginBottom:12 }}>
              <label className="label">{t('sales.collectionDate')} *</label>
              <input type="date" className="input" value={payForm.date}
                onChange={e => setPayForm(f => ({...f, date: e.target.value}))} required />
            </div>
            <div style={{ marginBottom:12 }}>
              <label className="label">{t('common.notes')}</label>
              <input className="input" value={payForm.notes}
                onChange={e => setPayForm(f => ({...f, notes: e.target.value}))} />
            </div>
            <div style={{ display:'flex',justifyContent:'flex-end',gap:8,marginTop:20 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setPayTarget(null)}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary" disabled={isPaying}>
                {isPaying ? t('common.saving') : t('sales.collectBalance')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Record empty return modal (salesman) ──────────────────── */}
      {showEmpty && isSalesman && (
        <Modal title={t('allocation.emptyReturn')} onClose={() => { setShowEmpty(false); setEmptyErr(''); }}>
          <ErrorBanner error={emptyErr ? { message: emptyErr } : null} />
          <form onSubmit={e => {
            e.preventDefault();
            setEmptyErr('');
            emptyMutation.mutate({
              cylinder_id:  parseInt(emptyForm.cylinder_id),
              qty:          parseInt(emptyForm.qty),
              type:         'empty_return',
              return_date:  todayStr,
              notes:        emptyForm.notes || null,
            });
          }}>
            <div style={{ marginBottom:12 }}>
              <label className="label">{t('allocation.cylinderType')} *</label>
              <select className="select" value={emptyForm.cylinder_id}
                onChange={e => setEmptyForm(f => ({...f, cylinder_id: e.target.value}))} required>
                <option value="">Select...</option>
                {allocations.map(a => (
                  <option key={a.id} value={a.cylinder_id}>
                    {a.cylinder?.name} {a.cylinder?.size}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom:12 }}>
              <label className="label">{t('allocation.emptyQty')} *</label>
              <input type="number" className="input" min="1" value={emptyForm.qty}
                onChange={e => setEmptyForm(f => ({...f, qty: e.target.value}))} required />
            </div>
            <div style={{ marginBottom:12 }}>
              <label className="label">{t('common.notes')}</label>
              <input className="input" value={emptyForm.notes}
                onChange={e => setEmptyForm(f => ({...f, notes: e.target.value}))} />
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:20 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowEmpty(false)}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary" disabled={emptyMutation.isPending}>
                {emptyMutation.isPending ? t('common.saving') : t('allocation.recordEmpty')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
