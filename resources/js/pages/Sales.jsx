import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSales } from '../hooks/useSales';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesmanService } from '../services/salesmanService';
import { stockService }    from '../services/stockService';
import { cylinderService } from '../services/cylinderService';
import { useAuth }         from '../contexts/AuthContext';
import StatusPill     from '../components/ui/StatusPill';
import CylBadge       from '../components/ui/CylBadge';
import Modal          from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Trash2, CreditCard, AlertCircle, Package, RotateCcw, Plus } from 'lucide-react';

const TK       = (n) => '৳' + Number(n || 0).toLocaleString('en-US');
const todayStr = new Date().toISOString().split('T')[0];

function ErrorBanner({ error }) {
  if (!error) return null;
  const msg = error?.response?.data?.message || error?.message || 'Error';
  return (
    <div style={{ background:'var(--error-bg)',color:'var(--error)',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:13,display:'flex',gap:8,alignItems:'flex-start' }}>
      <AlertCircle size={15} style={{ marginTop:1, flexShrink:0 }} /><span>{msg}</span>
    </div>
  );
}

function SalesTable({ rows, isSalesman, isAdmin, onPay, onDelete, isDeleting, t }) {
  return (
    <div className="card" style={{ padding:0 }}>
      <table className="tbl" style={{ width:'100%' }}>
        <thead>
          <tr>
            <th>{t('common.date')}</th>
            <th>{t('nav.customers')}</th>
            <th>{t('sales.items')}</th>
            <th style={{ textAlign:'right' }}>{t('common.total')}</th>
            <th style={{ textAlign:'right' }}>{t('common.paid')}</th>
            <th style={{ textAlign:'right' }}>{t('common.due')}</th>
            <th>{t('sales.paymentType')}</th>
            {!isSalesman && <th>{t('nav.salesman')}</th>}
            <th>{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={9} style={{ textAlign:'center', padding:40 }} className="dim">{t('sales.noSales')}</td></tr>
          )}
          {rows.map(s => (
            <tr key={s.id}>
              <td className="dim tiny">{s.sale_date}</td>
              <td style={{ fontWeight:600 }}>{s.customer?.name || t('sales.walkIn')}</td>
              <td>
                {s.items?.map((it, i) => (
                  <span key={i} style={{ display:'block', fontSize:12 }}>
                    {it.cylinder?.name} {it.cylinder?.size} ×{it.qty}
                  </span>
                ))}
              </td>
              <td style={{ fontWeight:600, textAlign:'right' }}>{TK(s.total_amount)}</td>
              <td style={{ color:'var(--success)', textAlign:'right' }}>{TK(s.paid_amount)}</td>
              <td style={{ color: s.due_amount > 0 ? 'var(--accent)' : 'inherit', fontWeight: s.due_amount > 0 ? 700 : 400, textAlign:'right' }}>
                {TK(s.due_amount)}
              </td>
              <td><StatusPill status={s.payment_type} /></td>
              {!isSalesman && <td className="dim">{s.salesman?.name}</td>}
              <td>
                <div style={{ display:'flex', gap:6 }}>
                  {s.due_amount > 0 && (
                    <button className="btn btn-soft btn-sm" onClick={() => onPay(s)}>
                      <CreditCard size={13} /> {t('sales.collectBalance')}
                    </button>
                  )}
                  {isAdmin && (
                    <button className="btn btn-ghost btn-sm"
                      onClick={() => window.confirm(t('sales.deleteConfirm')) && onDelete(s.id)}
                      disabled={isDeleting}>
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
  );
}

export default function Sales() {
  const { t } = useTranslation();
  const { user, isAdmin, isSalesman } = useAuth();
  const qc       = useQueryClient();
  const navigate = useNavigate();

  const [filterFrom, setFilterFrom]         = useState('');
  const [filterTo, setFilterTo]             = useState('');
  const [filterPayment, setFilterPayment]   = useState('');
  const [filterSearch, setFilterSearch]     = useState('');

  const {
    sales, todaySales, outstandingDues, todayCashCollected,
    isLoading, deleteSale, isDeleting,
    payTarget, setPayTarget, payBalance, isPaying, payError,
  } = useSales({ from: filterFrom || undefined, to: filterTo || undefined, payment_type: filterPayment || undefined, search: filterSearch || undefined });

  const [activeTab,    setActiveTab]    = useState('today');   // 'today' | 'all' | 'dues'
  const [payForm,      setPayForm]      = useState({ amount: '', date: todayStr, notes: '' });
  const [showEmpty,    setShowEmpty]    = useState(false);
  const [emptyForm,    setEmptyForm]    = useState({ cylinder_id: '', qty: 1, notes: '' });
  const [emptyErr,     setEmptyErr]     = useState('');
  const [emptySuccess, setEmptySuccess] = useState('');
  const [showReconcile,setShowReconcile]= useState(false);
  const [reconcileAlloc,setReconcileAlloc] = useState(null);
  const [reconcileForm,setReconcileForm]= useState({ sold_qty:'', collected_amount:'' });
  const [reconcileErr, setReconcileErr] = useState('');

  // Salesman's today allocations (incl. reconciled for display)
  const { data: myData } = useQuery({
    queryKey: ['my-allocations', user?.id],
    queryFn:  () => salesmanService.getById(user.id),
    enabled:  isSalesman && !!user?.id,
    refetchInterval: 30_000,
  });

  const allAllocations = useMemo(() =>
    isSalesman ? (myData?.data?.salesman?.allocations || []) : [],
  [isSalesman, myData]);

  const activeAllocations    = allAllocations.filter(a => !a.is_reconciled);
  const reconciledAllocations= allAllocations.filter(a =>  a.is_reconciled);

  // Summary stats — from backend (SalesmanController::show stats object)
  const apiStats           = myData?.data?.stats ?? {};
  const totalAllocated     = apiStats.total_allocated      ?? 0;
  const totalSold          = apiStats.total_sold           ?? 0;
  const totalReturned      = apiStats.total_returned       ?? 0;
  const totalRemaining     = apiStats.total_remaining      ?? 0;
  const totalCashCollected = apiStats.cash_collected       ?? todayCashCollected;
  const dueCollectedToday  = apiStats.due_collected_today  ?? 0;
  const totalCashToHandIn  = apiStats.total_cash_to_hand_in ?? (totalCashCollected + dueCollectedToday);

  // All cylinders for empty return dropdown
  const { data: cylinders } = useQuery({
    queryKey: ['cylinders'],
    queryFn:  cylinderService.getAll,
    enabled:  isSalesman,
  });
  const cylinderList = Array.isArray(cylinders) ? cylinders : (cylinders?.data || []);

  // Empty return mutation
  const emptyMutation = useMutation({
    mutationFn: (data) => stockService.storeReturn(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-allocations'] });
      const cyl = cylinderList.find(c => String(c.id) === String(emptyForm.cylinder_id));
      setEmptySuccess(`Recorded ${emptyForm.qty} empty ${cyl?.name || ''} ${cyl?.size || ''}`);
      setShowEmpty(false);
      setEmptyForm({ cylinder_id:'', qty:1, notes:'' });
      setEmptyErr('');
      setTimeout(() => setEmptySuccess(''), 4000);
    },
    onError: (e) => setEmptyErr(e.response?.data?.message || 'Failed to record'),
  });

  // Reconcile mutation (salesman submits their own EOD)
  const reconcileMutation = useMutation({
    mutationFn: ({ allocationId, data }) => salesmanService.reconcile(allocationId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-allocations'] });
      qc.invalidateQueries({ queryKey: ['sales-today'] });
      qc.invalidateQueries({ queryKey: ['salesmen'] });
      setShowReconcile(false);
      setReconcileErr('');
    },
    onError: (e) => setReconcileErr(e.response?.data?.message || 'Failed to reconcile'),
  });

  const openPay = (sale) => {
    setPayForm({ amount: sale.due_amount || '', date: todayStr, notes: '' });
    setPayTarget(sale);
  };

  const openReconcile = (alloc) => {
    setReconcileAlloc(alloc);
    setReconcileForm({
      sold_qty:         String(alloc.sold_qty ?? 0),
      collected_amount: String(alloc.collected_amount ?? ''),
    });
    reconcileMutation.reset();
    setReconcileErr('');
    setShowReconcile(true);
  };

  if (isLoading) return <LoadingSpinner text={t('common.loading')} />;

  /* ── ADMIN VIEW ────────────────────────────────────────────────── */
  if (!isSalesman) {
    return (
      <div>
        <SalesTable
          rows={sales} isSalesman={false} isAdmin={isAdmin}
          onPay={openPay} onDelete={deleteSale} isDeleting={isDeleting} t={t}
        />
        {payTarget && <PayModal target={payTarget} form={payForm} setForm={setPayForm}
          onClose={() => setPayTarget(null)} onSubmit={() => payBalance({ id:payTarget.id, data:payForm })}
          isPaying={isPaying} error={payError} t={t} />}
      </div>
    );
  }

  /* ── SALESMAN VIEW ─────────────────────────────────────────────── */
  const tabRows = activeTab === 'today' ? todaySales
    : activeTab === 'all'   ? sales
    : outstandingDues;

  return (
    <div>
      {/* ── Stats bar ─────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginBottom:12 }}>
        {[
          { label: t('sales.totalPcs'),         val: `${totalAllocated} pcs`, color:'var(--text-1)' },
          { label: t('sales.soldPcs'),           val: `${totalSold} pcs`,     color:'var(--success)' },
          { label: t('sales.remainingPcs'),      val: `${totalRemaining} pcs`,color:'var(--primary)' },
        ].map(({ label, val, color }) => (
          <div key={label} className="scard" style={{ textAlign:'center' }}>
            <div style={{ fontSize:18, fontWeight:700, color }}>{val}</div>
            <div className="dim tiny">{label}</div>
          </div>
        ))}
      </div>
      {/* Cash accountability bar */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginBottom:20 }}>
        <div className="scard" style={{ textAlign:'center' }}>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--warning)' }}>{TK(totalCashCollected)}</div>
          <div className="dim tiny">{t('sales.cashCollectedToday')}</div>
        </div>
        <div className="scard" style={{ textAlign:'center' }}>
          <div style={{ fontSize:16, fontWeight:700, color: dueCollectedToday > 0 ? 'var(--success)' : 'var(--text-3)' }}>{TK(dueCollectedToday)}</div>
          <div className="dim tiny">{t('sales.dueCollectedToday', 'Dues Collected')}</div>
        </div>
        <div className="scard" style={{ textAlign:'center', background:'var(--primary-soft)' }}>
          <div style={{ fontSize:16, fontWeight:800, color:'var(--primary)' }}>{TK(totalCashToHandIn)}</div>
          <div className="dim tiny">{t('sales.totalCashToHandIn', 'Total to Hand In')}</div>
        </div>
      </div>

      {/* ── Today's load (allocation cards) ───────────────────────── */}
      <div style={{ marginBottom:24 }}>
        <div className="section-title" style={{ marginBottom:12 }}>{t('allocation.myAllocations')}</div>

        {activeAllocations.length === 0 && reconciledAllocations.length === 0 && (
          <div className="card" style={{ textAlign:'center', padding:24, color:'var(--text-3)' }}>
            {t('allocation.noAllocationToday')}
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:12 }}>
          {/* Active allocations */}
          {activeAllocations.map(a => {
            const remaining = Math.max(0, a.qty - (a.sold_qty || 0) - (a.returned_qty || 0));
            const soldPct   = a.qty > 0 ? Math.round(((a.sold_qty || 0) / a.qty) * 100) : 0;
            const retPct    = a.qty > 0 ? Math.round(((a.returned_qty || 0) / a.qty) * 100) : 0;
            return (
              <div key={a.id} className="card" style={{ padding:16 }}>
                {/* Header */}
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                  {a.cylinder && <CylBadge cylinder={a.cylinder} size="sm" />}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:14 }}>{a.cylinder?.name} {a.cylinder?.size}</div>
                    <div style={{ color:'var(--primary)', fontSize:13, fontWeight:600 }}>{TK(a.sale_price)}/{t('common.pcs')}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:20, fontWeight:800, color: remaining === 0 ? 'var(--success)' : 'var(--text-1)' }}>{remaining}</div>
                    <div className="dim tiny" style={{ fontSize:10 }}>{t('allocation.remaining')}</div>
                  </div>
                </div>

                {/* Progress bar: sold (teal) + returned (amber) */}
                <div style={{ background:'var(--border-soft)', borderRadius:4, height:6, marginBottom:12, overflow:'hidden', display:'flex' }}>
                  <div style={{ width:`${soldPct}%`, height:'100%', background:'var(--success)', borderRadius:4, transition:'width 0.3s' }} />
                  <div style={{ width:`${retPct}%`, height:'100%', background:'var(--warning)', borderRadius:'0 4px 4px 0', transition:'width 0.3s' }} />
                </div>

                {/* 4-stat row */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', fontSize:12, marginBottom:12 }}>
                  {[
                    [a.qty,             t('allocation.allocated'), 'var(--text-1)'],
                    [a.sold_qty||0,     t('allocation.sold'),      'var(--success)'],
                    [a.returned_qty||0, t('allocation.returned'),  'var(--warning)'],
                    [remaining,         t('allocation.withHim'),   remaining === 0 ? 'var(--text-3)' : 'var(--primary)'],
                  ].map(([v, l, c]) => (
                    <div key={l} style={{ textAlign:'center' }}>
                      <div style={{ fontWeight:700, color:c, fontSize:15 }}>{v}</div>
                      <div className="dim tiny">{l}</div>
                    </div>
                  ))}
                </div>

                <button className="btn btn-soft btn-sm" style={{ width:'100%', justifyContent:'center' }}
                  onClick={() => openReconcile(a)}>
                  <RotateCcw size={13} /> {t('allocation.reconcileDay')}
                </button>
              </div>
            );
          })}

          {/* Reconciled allocations (summary) */}
          {reconciledAllocations.map(a => (
            <div key={a.id} className="card" style={{ padding:16, opacity:0.7, borderLeft:'3px solid var(--success)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                {a.cylinder && <CylBadge cylinder={a.cylinder} size="sm" />}
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:13 }}>{a.cylinder?.name} {a.cylinder?.size}</div>
                  <div style={{ fontSize:12, color:'var(--primary)' }}>{TK(a.sale_price)}/{t('common.pcs')}</div>
                </div>
                <span className="pill pill-teal" style={{ fontSize:11 }}>✓ {t('status.reconciled')}</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', fontSize:12, paddingTop:8, borderTop:'1px solid var(--border-soft)' }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontWeight:700, color:'var(--success)' }}>{a.sold_qty||0}</div>
                  <div className="dim tiny">{t('allocation.sold')}</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontWeight:700, color:'var(--warning)' }}>{a.returned_qty||0}</div>
                  <div className="dim tiny">{t('allocation.returned')}</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontWeight:700, color:'var(--primary)' }}>{TK(a.collected_amount||0)}</div>
                  <div className="dim tiny">{t('allocation.collected')}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Success toast ─────────────────────────────────────────── */}
      {emptySuccess && (
        <div style={{ background:'var(--success-bg, #e6f9ee)', color:'var(--success)', borderRadius:8, padding:'10px 16px', marginBottom:14, fontSize:13, fontWeight:500, display:'flex', alignItems:'center', gap:8 }}>
          ✓ {emptySuccess}
        </div>
      )}

      {/* ── Action buttons ─────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        <button className="btn btn-soft btn-sm" onClick={() => { setEmptySuccess(''); setShowEmpty(true); }}>
          <Package size={14} /> {t('allocation.recordEmpty')}
        </button>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:8, marginBottom:16, borderBottom:'1px solid var(--border-soft)', paddingBottom:0 }}>
        {[
          { key:'today', label: t('sales.todaySales') + ` (${todaySales.length})` },
          { key:'all',   label: t('sales.allSales') },
          { key:'dues',  label: t('sales.outstandingDues') + (outstandingDues.length ? ` (${outstandingDues.length})` : '') },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`tab-btn${activeTab === tab.key ? ' active' : ''}`}
            style={{ borderRadius:'6px 6px 0 0', marginBottom:-1 }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Today tab: summary bar + cards */}
      {activeTab === 'today' && (
        todaySales.length === 0 ? (
          <div className="card" style={{ textAlign:'center', padding:32 }}>
            <div className="dim" style={{ marginBottom:12 }}>{t('sales.noSales')}</div>
            <Link to="/sales/new" className="btn btn-primary btn-sm">
              <Plus size={14} /> {t('sales.newSale')}
            </Link>
          </div>
        ) : (
          <>
            <div style={{ display:'flex', gap:16, marginBottom:12, padding:'8px 14px', background:'var(--bg)', borderRadius:8, fontSize:13 }}>
              <span className="dim">{t('common.total')}: <strong>{TK(todaySales.reduce((s,x) => s+parseFloat(x.total_amount||0),0))}</strong></span>
              <span style={{ color:'var(--success)' }}>{t('common.paid')}: <strong>{TK(todaySales.reduce((s,x) => s+parseFloat(x.paid_amount||0),0))}</strong></span>
              <span style={{ color:'var(--accent)' }}>{t('common.due')}: <strong>{TK(todaySales.reduce((s,x) => s+parseFloat(x.due_amount||0),0))}</strong></span>
            </div>
            {todaySales.map(s => <SaleCard key={s.id} sale={s} onPay={openPay} t={t} onView={() => navigate(`/sales/${s.id}`)} />)}
          </>
        )
      )}

      {/* All sales tab — with filter bar */}
      {activeTab === 'all' && (
        <>
          <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
            <input type="date" className="input" style={{ width:145 }} value={filterFrom} onChange={e => setFilterFrom(e.target.value)} placeholder="From" />
            <input type="date" className="input" style={{ width:145 }} value={filterTo} onChange={e => setFilterTo(e.target.value)} placeholder="To" />
            <select className="select" style={{ width:'auto' }} value={filterPayment} onChange={e => setFilterPayment(e.target.value)}>
              <option value="">All types</option>
              <option value="cash">Cash</option>
              <option value="partial">Partial</option>
              <option value="due">Due</option>
            </select>
            <input className="input" style={{ flex:1, minWidth:150 }} placeholder="Search customer..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} />
          </div>
          {sales.length === 0
            ? <div className="card" style={{ textAlign:'center', padding:32, color:'var(--text-3)' }}>{t('sales.noSales')}</div>
            : sales.map(s => <SaleCard key={s.id} sale={s} onPay={openPay} t={t} onView={() => navigate(`/sales/${s.id}`)} />)
          }
        </>
      )}

      {/* Outstanding dues tab */}
      {activeTab === 'dues' && (
        outstandingDues.length === 0
          ? <div className="card" style={{ textAlign:'center', padding:32, color:'var(--text-3)' }}>{t('sales.noDuesToday')}</div>
          : outstandingDues.map(s => <SaleCard key={s.id} sale={s} onPay={openPay} t={t} highlight onView={() => navigate(`/sales/${s.id}`)} />)
      )}

      {/* ── Collect payment modal ─────────────────────────────────── */}
      {payTarget && (
        <PayModal target={payTarget} form={payForm} setForm={setPayForm}
          onClose={() => setPayTarget(null)} onSubmit={() => payBalance({ id:payTarget.id, data:payForm })}
          isPaying={isPaying} error={payError} t={t} />
      )}

      {/* ── Reconcile modal (salesman EOD) ────────────────────────── */}
      {showReconcile && reconcileAlloc && (
        <Modal title={t('allocation.endOfDayReconcile')} onClose={() => setShowReconcile(false)} size="md">
          <ErrorBanner error={reconcileErr ? { message: reconcileErr } : null} />
          <div style={{ background:'var(--primary-soft)', borderRadius:10, padding:'12px 16px', marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {reconcileAlloc.cylinder && <CylBadge cylinder={reconcileAlloc.cylinder} size="sm" />}
                <div>
                  <div style={{ fontWeight:600 }}>{reconcileAlloc.cylinder?.name} {reconcileAlloc.cylinder?.size}</div>
                  <div className="dim tiny">{TK(reconcileAlloc.sale_price)}/{t('common.pcs')}</div>
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:20, fontWeight:700, color:'var(--primary)' }}>{reconcileAlloc.qty}</div>
                <div className="dim tiny">{t('allocation.totalAllocated')}</div>
              </div>
            </div>
          </div>
          <div style={{ background:'var(--bg)', borderRadius:8, padding:'10px 14px', marginBottom:16 }}>
            <div className="dim tiny" style={{ marginBottom:4 }}>{t('allocation.currentlyRecorded')}</div>
            <div style={{ display:'flex', gap:20 }}>
              <div><span style={{ fontWeight:600, color:'var(--success)' }}>{reconcileAlloc.sold_qty||0}</span> <span className="dim tiny">{t('allocation.sold')}</span></div>
              <div><span style={{ fontWeight:600, color:'var(--warning)' }}>{reconcileAlloc.returned_qty||0}</span> <span className="dim tiny">{t('allocation.returned')}</span></div>
            </div>
          </div>
          <form onSubmit={e => {
            e.preventDefault();
            const sold      = parseInt(reconcileForm.sold_qty) || 0;
            const collected = parseFloat(reconcileForm.collected_amount) || 0;
            if (sold > reconcileAlloc.qty) {
              setReconcileErr(`Sold (${sold}) cannot exceed allocated (${reconcileAlloc.qty}).`);
              return;
            }
            reconcileMutation.mutate({ allocationId: reconcileAlloc.id, data: { sold_qty: sold, collected_amount: collected } });
          }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label className="label">{t('allocation.actualSoldQty')} *</label>
                <input type="number" className="input" min="0" max={reconcileAlloc.qty}
                  value={reconcileForm.sold_qty}
                  onChange={e => {
                    const qty  = parseInt(e.target.value) || 0;
                    const cash = qty * parseFloat(reconcileAlloc.sale_price || 0);
                    setReconcileForm(f => ({ ...f, sold_qty: e.target.value, collected_amount: String(cash) }));
                  }} required />
                <div className="dim tiny" style={{ marginTop:4 }}>Max: {reconcileAlloc.qty} · {TK(reconcileAlloc.sale_price)}/pcs</div>
              </div>
              <div>
                <label className="label">{t('allocation.cashCollected')} *</label>
                <input type="number" className="input" min="0" step="0.01"
                  value={reconcileForm.collected_amount}
                  onChange={e => setReconcileForm(f => ({...f, collected_amount: e.target.value}))} required />
                <div className="dim tiny" style={{ marginTop:4 }}>
                  Expected: {TK((parseInt(reconcileForm.sold_qty)||0) * parseFloat(reconcileAlloc.sale_price||0))}
                </div>
              </div>
            </div>
            {reconcileForm.sold_qty !== '' && (
              <div style={{ background:'var(--bg)', borderRadius:8, padding:'10px 14px', marginBottom:12 }}>
                <div className="dim tiny" style={{ marginBottom:4 }}>{t('allocation.afterReconcile')}</div>
                <div style={{ display:'flex', gap:16 }}>
                  <span><span style={{ fontWeight:600, color:'var(--success)' }}>{parseInt(reconcileForm.sold_qty)||0}</span> <span className="dim tiny">sold</span></span>
                  <span><span style={{ fontWeight:600, color:'#A85200' }}>{Math.max(0, reconcileAlloc.qty - (parseInt(reconcileForm.sold_qty)||0))}</span> <span className="dim tiny">return to warehouse</span></span>
                </div>
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:20 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowReconcile(false)}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary" disabled={reconcileMutation.isPending}>
                {reconcileMutation.isPending ? t('allocation.reconciling') : t('allocation.confirmReconcile')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Record empty cylinders modal ──────────────────────────── */}
      {showEmpty && (
        <Modal title={t('allocation.emptyReturn')} onClose={() => { setShowEmpty(false); setEmptyErr(''); }}>
          <ErrorBanner error={emptyErr ? { message: emptyErr } : null} />
          <form onSubmit={e => {
            e.preventDefault();
            setEmptyErr('');
            emptyMutation.mutate({
              cylinder_id: parseInt(emptyForm.cylinder_id),
              qty:         parseInt(emptyForm.qty),
              type:        'empty_return',
              return_date: todayStr,
              notes:       emptyForm.notes || null,
            });
          }}>
            <div style={{ marginBottom:12 }}>
              <label className="label">{t('allocation.cylinderType')} *</label>
              <select className="select" value={emptyForm.cylinder_id}
                onChange={e => setEmptyForm(f => ({...f, cylinder_id: e.target.value}))} required>
                <option value="">Select cylinder...</option>
                {cylinderList.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.size}</option>
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

/* ── Sale card (salesman list view) ────────────────────────────── */
function SaleCard({ sale, onPay, t, highlight, onView }) {
  const TK = (n) => '৳' + Number(n || 0).toLocaleString('en-US');
  const items = sale.items || [];
  return (
    <div className="card" style={{ padding:16, marginBottom:10, borderLeft: highlight && sale.due_amount > 0 ? '3px solid var(--accent)' : undefined, cursor: onView ? 'pointer' : undefined }}
      onClick={onView}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:15 }}>{sale.customer?.name || t('sales.walkIn')}</div>
          <div className="dim tiny">#{sale.id} · {sale.sale_date}</div>
        </div>
        <StatusPill status={sale.payment_type} />
      </div>

      {/* Items */}
      <div style={{ marginBottom:12 }}>
        {items.map((it, i) => {
          const lineTotal = parseFloat(it.qty || 0) * parseFloat(it.unit_price || 0);
          return (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13, marginBottom:5 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {it.cylinder && <CylBadge cylinder={it.cylinder} size="sm" />}
                <span style={{ color:'var(--text-2)' }}>{it.cylinder?.name} {it.cylinder?.size} × {it.qty}</span>
              </div>
              <span style={{ fontWeight:600, color:'var(--text-1)' }}>{TK(lineTotal)}</span>
            </div>
          );
        })}
      </div>

      {/* Footer: amounts + action */}
      <div style={{ display:'flex', gap:16, alignItems:'center', paddingTop:10, borderTop:'1px solid var(--border-soft)', flexWrap:'wrap' }}>
        <span className="dim tiny">{t('common.total')}: <strong style={{ color:'var(--text-1)' }}>{TK(sale.total_amount)}</strong></span>
        <span style={{ fontSize:12, color:'var(--success)' }}>{t('common.paid')}: <strong>{TK(sale.paid_amount)}</strong></span>
        {sale.due_amount > 0 && (
          <span style={{ fontSize:12, color:'var(--accent)', fontWeight:700 }}>{t('common.due')}: {TK(sale.due_amount)}</span>
        )}
        {sale.due_amount > 0 && (
          <button className="btn btn-soft btn-sm" style={{ marginLeft:'auto' }}
            onClick={e => { e.stopPropagation(); onPay(sale); }}>
            <CreditCard size={13} /> {t('sales.collectBalance')} {TK(sale.due_amount)}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Shared collect payment modal ──────────────────────────────── */
function PayModal({ target, form, setForm, onClose, onSubmit, isPaying, error, t }) {
  return (
    <Modal title={t('sales.collectPayment')} onClose={onClose}>
      <ErrorBanner error={error} />
      <div style={{ background:'var(--primary-soft)',borderRadius:10,padding:'12px 16px',marginBottom:20 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:600 }}>{target.customer?.name || t('sales.walkIn')}</div>
            <div className="dim tiny">{t('common.date')}: {target.sale_date}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:18,fontWeight:700,color:'var(--accent)' }}>{'৳' + Number(target.due_amount||0).toLocaleString('en-US')}</div>
            <div className="dim tiny">{t('sales.remainingDue')}</div>
          </div>
        </div>
      </div>
      <div style={{ background:'var(--bg)',borderRadius:8,padding:'8px 14px',marginBottom:16 }}>
        <span className="dim tiny">{t('sales.alreadyPaid')}: </span>
        <span style={{ fontWeight:600 }}>{'৳' + Number(target.paid_amount||0).toLocaleString('en-US')}</span>
        <span className="dim tiny"> / {'৳' + Number(target.total_amount||0).toLocaleString('en-US')}</span>
      </div>
      <form onSubmit={e => { e.preventDefault(); onSubmit(); }}>
        <div style={{ marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
            <label className="label" style={{ margin:0 }}>{t('common.amount')} ৳ *</label>
            <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize:11, padding:'2px 8px' }}
              onClick={() => setForm(f => ({...f, amount: target.due_amount}))}>
              {t('common.payInFull')}
            </button>
          </div>
          <input type="number" className="input" min="0.01" step="0.01" max={target.due_amount}
            value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} required />
          {(() => {
            const entered = parseFloat(form.amount || 0);
            const remaining = Math.round((target.due_amount - entered) * 100) / 100;
            if (entered <= 0) return <div className="dim tiny" style={{ marginTop:5 }}>{t('sales.partialPaidHint')}</div>;
            if (remaining <= 0) return <div style={{ color:'var(--success)', fontSize:12, fontWeight:600, marginTop:5 }}>{t('common.fullySettled')}</div>;
            return <div style={{ color:'var(--accent)', fontSize:12, marginTop:5 }}>{'৳' + remaining.toLocaleString('en-US')} {t('common.afterPayment')}</div>;
          })()}
        </div>
        <div style={{ marginBottom:12 }}>
          <label className="label">{t('sales.collectionDate')} *</label>
          <input type="date" className="input" value={form.date}
            onChange={e => setForm(f => ({...f, date: e.target.value}))} required />
        </div>
        <div style={{ marginBottom:12 }}>
          <label className="label">{t('common.notes')}</label>
          <input className="input" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
        </div>
        <div style={{ display:'flex',justifyContent:'flex-end',gap:8,marginTop:20 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={isPaying}>
            {isPaying ? t('common.saving') : t('sales.collectBalance')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
