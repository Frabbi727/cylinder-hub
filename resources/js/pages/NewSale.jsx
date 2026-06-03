import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { salesmanService } from '../services/salesmanService';
import { customerService }  from '../services/customerService';
import { saleService }      from '../services/saleService';
import CylBadge      from '../components/ui/CylBadge';
import StatusPill    from '../components/ui/StatusPill';
import Modal         from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ChevronLeft, AlertCircle, UserPlus, Plus, Trash2 } from 'lucide-react';

const TK       = (n) => '৳' + Number(n || 0).toLocaleString('en-US');
const todayStr = new Date().toISOString().split('T')[0];

const DEFAULT_FORM = {
  customer_id:  '',
  sale_date:    todayStr,
  payment_type: 'cash',
  paid_amount:  '',
  items: [{ cylinder_id: '', qty: 1, unit_price: '' }],
};

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div style={{ background:'var(--error-bg)', color:'var(--error)', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, display:'flex', gap:8, alignItems:'flex-start' }}>
      <AlertCircle size={15} style={{ marginTop:1, flexShrink:0 }} /><span>{message}</span>
    </div>
  );
}

export default function NewSale() {
  const navigate  = useNavigate();
  const qc        = useQueryClient();
  const { t }     = useTranslation();
  const { user, isSalesman } = useAuth();

  const [form,          setForm]          = useState(DEFAULT_FORM);
  const [error,         setError]         = useState('');
  const [custSearch,    setCustSearch]    = useState('');
  const [custDropOpen,  setCustDropOpen]  = useState(false);
  const [showCustInput, setShowCustInput] = useState(false);
  const [newCustForm,   setNewCustForm]   = useState({ name: '', phone: '' });

  // Guard: admins go back to /sales
  if (!isSalesman) { navigate('/sales', { replace: true }); return null; }

  /* ── Data ──────────────────────────────────────────────────────── */
  const { data: myData, isLoading: allocLoading } = useQuery({
    queryKey: ['my-allocations', user?.id],
    queryFn:  () => salesmanService.getById(user.id),
    enabled:  !!user?.id,
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn:  () => customerService.getAll(),
  });

  /* ── Allocation map ─────────────────────────────────────────────── */
  const allocMap = useMemo(() => {
    const allocs = myData?.data?.salesman?.allocations || [];
    return allocs.reduce((acc, a) => {
      if (a.is_reconciled) return acc;
      const remaining = Math.max(0, (a.qty || 0) - (a.sold_qty || 0) - (a.returned_qty || 0));
      if (!acc[a.cylinder_id]) {
        acc[a.cylinder_id] = { cylinder: a.cylinder, remaining: 0, sale_price: a.sale_price || 0 };
      }
      acc[a.cylinder_id].remaining += remaining;
      return acc;
    }, {});
  }, [myData]);

  const cylinderList = Object.values(allocMap).map(e => e.cylinder).filter(Boolean);
  const customerList = customers?.data || [];
  const filteredCusts = custSearch.trim()
    ? customerList.filter(c =>
        c.name.toLowerCase().includes(custSearch.toLowerCase()) ||
        (c.phone || '').includes(custSearch))
    : customerList;
  const selectedCustomer = customerList.find(c => String(c.id) === String(form.customer_id));

  /* ── Auto-calculations ─────────────────────────────────────────── */
  const { lineItems, totalAmount, paidAmount, dueAmount } = useMemo(() => {
    const lineItems = form.items.map(it => ({
      ...it,
      cylinder:  allocMap[it.cylinder_id]?.cylinder,
      lineTotal: parseFloat(it.qty || 0) * parseFloat(it.unit_price || 0),
    }));
    const totalAmount = lineItems.reduce((s, l) => s + l.lineTotal, 0);
    const paidAmount  = form.payment_type === 'cash' ? totalAmount
                      : form.payment_type === 'due'  ? 0
                      : Math.min(parseFloat(form.paid_amount || 0), totalAmount);
    const dueAmount   = Math.max(0, totalAmount - paidAmount);
    return { lineItems, totalAmount, paidAmount, dueAmount };
  }, [form, allocMap]);

  const isValid = form.items.every(it => it.cylinder_id && parseInt(it.qty) > 0 && parseFloat(it.unit_price) > 0)
    && totalAmount > 0
    && (form.payment_type !== 'partial' || parseFloat(form.paid_amount || 0) > 0);

  /* ── Mutations ─────────────────────────────────────────────────── */
  const saleMutation = useMutation({
    mutationFn: saleService.create,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['sales-today'] });
      qc.invalidateQueries({ queryKey: ['my-allocations'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['sales-dues'] });
      const saleId = res?.data?.sale?.id || res?.data?.id;
      navigate(saleId ? `/sales/${saleId}` : '/sales');
    },
    onError: (e) => setError(e.response?.data?.message || 'Failed to record sale'),
  });

  const addCustomerMutation = useMutation({
    mutationFn: customerService.create,
    onSuccess: (newCust) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setForm(f => ({ ...f, customer_id: String(newCust.id) }));
      setCustSearch(newCust.name);
      setShowCustInput(false);
      setNewCustForm({ name: '', phone: '' });
      setCustDropOpen(false);
    },
  });

  /* ── Item helpers ──────────────────────────────────────────────── */
  const setItem = (i, field, val) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: val };
    if (field === 'cylinder_id') {
      const alloc = allocMap[val];
      items[i].unit_price = alloc?.sale_price ? String(alloc.sale_price) : '';
      items[i].qty        = Math.min(parseInt(items[i].qty) || 1, alloc?.remaining || 1);
    }
    setForm(f => ({ ...f, items }));
  };

  const addItem    = () => setForm(f => ({ ...f, items: [...f.items, { cylinder_id: '', qty: 1, unit_price: '' }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const handleCancel = () => {
    const hasData = form.items.some(it => it.cylinder_id) || form.customer_id;
    if (hasData && !window.confirm(t('sales.confirmLeave'))) return;
    navigate(isSalesman ? '/dashboard' : '/sales');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    saleMutation.mutate({
      customer_id:  form.customer_id ? parseInt(form.customer_id) : null,
      sale_date:    form.sale_date,
      payment_type: form.payment_type,
      paid_amount:  paidAmount,
      items: form.items.map(it => ({
        cylinder_id: parseInt(it.cylinder_id),
        qty:         parseInt(it.qty),
        unit_price:  parseFloat(it.unit_price),
      })),
    });
  };

  if (allocLoading) return <LoadingSpinner text={t('common.loading')} />;

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>

      {/* Back link */}
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={handleCancel}>
          <ChevronLeft size={15} /> {isSalesman ? 'Dashboard' : t('sales.myDay')}
        </button>
      </div>

      {/* No-stock warning */}
      {cylinderList.length === 0 && (
        <div style={{ background:'var(--warning-bg,#fffbeb)', border:'1px solid var(--warning)', borderRadius:10, padding:'14px 18px', marginBottom:20, color:'var(--warning)', fontSize:13, fontWeight:500 }}>
          <AlertCircle size={15} style={{ marginRight:6, verticalAlign:'middle' }} />
          {t('sales.noStockAllocated')}
        </div>
      )}

      <ErrorBanner message={error} />

      <form onSubmit={handleSubmit}>
        <div style={{ display:'flex', gap:20, alignItems:'flex-start', flexWrap:'wrap' }}>

          {/* ── LEFT PANEL ──────────────────────────────────────────── */}
          <div style={{ flex:'1 1 560px', minWidth:0 }}>

            {/* Customer card */}
            <div className="card" style={{ padding:20, marginBottom:16 }}>
              <div className="section-title" style={{ marginBottom:12 }}>{t('nav.customers')}</div>

              {!form.customer_id ? (
                <div style={{ position:'relative' }}>
                  <input
                    className="input"
                    placeholder={t('sales.selectCustomer')}
                    value={custSearch}
                    onChange={e => { setCustSearch(e.target.value); setCustDropOpen(true); setShowCustInput(false); }}
                    onFocus={() => setCustDropOpen(true)}
                    autoComplete="off"
                  />
                  {custDropOpen && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:50, background:'var(--surface)', border:'1px solid var(--border-soft)', borderRadius:8, boxShadow:'0 4px 16px rgba(0,0,0,.12)', maxHeight:220, overflowY:'auto', marginTop:4 }}>
                      <div style={{ padding:'10px 14px', fontSize:13, cursor:'pointer', borderBottom:'1px solid var(--border-soft)', color:'var(--text-3)' }}
                        onMouseDown={() => { setCustDropOpen(false); setCustSearch(''); }}>
                        {t('sales.walkIn')}
                      </div>
                      {filteredCusts.slice(0, 8).map(c => (
                        <div key={c.id} style={{ padding:'10px 14px', fontSize:13, cursor:'pointer' }}
                          onMouseDown={() => { setForm(f => ({...f, customer_id: String(c.id)})); setCustSearch(c.name); setCustDropOpen(false); }}
                          onMouseEnter={e => e.currentTarget.style.background='var(--bg)'}
                          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          <div style={{ fontWeight:600 }}>{c.name}</div>
                          {c.phone && <div className="dim tiny">{c.phone}</div>}
                        </div>
                      ))}
                      {custSearch.trim() && !customerList.find(c => c.name.toLowerCase() === custSearch.toLowerCase()) && (
                        <div style={{ padding:'10px 14px', fontSize:13, cursor:'pointer', borderTop:'1px solid var(--border-soft)', color:'var(--primary)', display:'flex', alignItems:'center', gap:6 }}
                          onMouseDown={() => { setShowCustInput(true); setCustDropOpen(false); setNewCustForm({ name: custSearch.trim(), phone: '' }); }}>
                          <UserPlus size={14} /> {t('sales.quickAddCustomer')} &quot;{custSearch.trim()}&quot;
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--primary-soft)', borderRadius:8, padding:'10px 14px' }}>
                  <span style={{ fontWeight:600, fontSize:14 }}>{selectedCustomer?.name || t('sales.walkIn')}</span>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize:11 }}
                    onClick={() => { setForm(f => ({...f, customer_id:''})); setCustSearch(''); setCustDropOpen(false); setShowCustInput(false); }}>
                    ✕ {t('sales.walkIn')}
                  </button>
                </div>
              )}

              {showCustInput && (
                <div style={{ marginTop:10, background:'var(--bg)', borderRadius:8, padding:14, border:'1px dashed var(--primary)' }}>
                  <div style={{ fontSize:12, color:'var(--primary)', fontWeight:600, marginBottom:8 }}>New customer</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    <input className="input" placeholder={t('sales.addCustomerName') + ' *'}
                      value={newCustForm.name} onChange={e => setNewCustForm(f => ({...f, name: e.target.value}))} />
                    <input className="input" placeholder={t('sales.addCustomerPhone')}
                      value={newCustForm.phone} onChange={e => setNewCustForm(f => ({...f, phone: e.target.value}))} />
                  </div>
                  <div style={{ display:'flex', gap:8, marginTop:8 }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowCustInput(false); setCustSearch(''); }}>
                      {t('common.cancel')}
                    </button>
                    <button type="button" className="btn btn-primary btn-sm"
                      disabled={!newCustForm.name.trim() || addCustomerMutation.isPending}
                      onClick={() => addCustomerMutation.mutate({ name: newCustForm.name.trim(), phone: newCustForm.phone || undefined })}>
                      {addCustomerMutation.isPending ? t('common.saving') : t('common.add')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Items card */}
            <div className="card" style={{ padding:20, marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <div className="section-title" style={{ marginBottom:0 }}>{t('sales.items')}</div>
                <button type="button" className="btn btn-soft btn-sm" onClick={addItem}>
                  <Plus size={13} /> {t('common.addItem')}
                </button>
              </div>

              {form.items.map((item, i) => {
                const alloc   = allocMap[item.cylinder_id];
                const maxQty  = alloc?.remaining ?? '';
                const lineTot = lineItems[i]?.lineTotal || 0;
                return (
                  <div key={i} style={{ background:'var(--bg)', borderRadius:10, padding:14, marginBottom:10 }}>
                    {/* Cylinder selector */}
                    <div style={{ marginBottom:10 }}>
                      <label className="label">{t('inventory.cylinderTypes')}</label>
                      <select className="select" value={item.cylinder_id}
                        onChange={e => setItem(i, 'cylinder_id', e.target.value)} required>
                        <option value="">Select cylinder...</option>
                        {cylinderList.map(c => {
                          const rem = allocMap[c.id]?.remaining ?? 0;
                          return (
                            <option key={c.id} value={c.id} disabled={rem === 0}>
                              {c.name} {c.size} ({rem} {t('allocation.remaining')})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Qty | Price | Line total */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                      <div>
                        <label className="label">{t('common.qty')}</label>
                        <input type="number" className="input" min="1"
                          max={maxQty || undefined}
                          value={item.qty}
                          onChange={e => setItem(i, 'qty', e.target.value)} required />
                        {item.cylinder_id && maxQty !== '' && (
                          <div className="dim tiny" style={{ marginTop:4 }}>{maxQty} {t('allocation.available', 'available')}</div>
                        )}
                      </div>
                      <div>
                        <label className="label">{t('sales.unitPrice')}</label>
                        <input type="number" className="input" value={item.unit_price}
                          readOnly
                          style={{ background:'var(--bg)', cursor:'default' }}
                          placeholder="—" />
                      </div>
                      <div>
                        <label className="label">Line Total</label>
                        <div style={{ height:42, display:'flex', alignItems:'center', paddingLeft:12, fontWeight:700, fontSize:15, color: lineTot > 0 ? 'var(--primary)' : 'var(--text-3)' }}>
                          {lineTot > 0 ? TK(lineTot) : '—'}
                        </div>
                      </div>
                    </div>

                    {form.items.length > 1 && (
                      <div style={{ marginTop:8, textAlign:'right' }}>
                        <button type="button" className="btn btn-ghost btn-sm" style={{ color:'var(--error)', fontSize:12 }}
                          onClick={() => removeItem(i)}>
                          <Trash2 size={12} /> {t('common.remove')}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Payment card */}
            <div className="card" style={{ padding:20 }}>
              <div className="section-title" style={{ marginBottom:14 }}>{t('sales.paymentType')}</div>

              {/* 3 toggle options */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
                {[
                  { key:'cash',    label: t('sales.paymentCash'),    desc: 'Full amount now' },
                  { key:'partial', label: t('sales.paymentPartial'), desc: 'Some now, rest later' },
                  { key:'due',     label: t('sales.paymentDue'),     desc: 'Collect later' },
                ].map(opt => (
                  <button type="button" key={opt.key}
                    onClick={() => setForm(f => ({ ...f, payment_type: opt.key, paid_amount: '' }))}
                    style={{
                      padding:'12px 8px', borderRadius:10, border:'2px solid',
                      borderColor: form.payment_type === opt.key ? 'var(--primary)' : 'var(--border-soft)',
                      background:  form.payment_type === opt.key ? 'var(--primary-soft)' : 'var(--bg)',
                      cursor:'pointer', textAlign:'center', transition:'all .15s',
                    }}>
                    <div style={{ fontWeight:700, fontSize:14, color: form.payment_type === opt.key ? 'var(--primary)' : 'var(--text-1)', marginBottom:3 }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize:11, color:'var(--text-3)' }}>{opt.desc}</div>
                  </button>
                ))}
              </div>

              {/* Partial amount input */}
              {form.payment_type === 'partial' && (
                <div>
                  <label className="label">{t('sales.partialAmountNow')}</label>
                  <input type="number" className="input" min="0.01" step="0.01"
                    max={totalAmount || undefined} placeholder="0"
                    value={form.paid_amount}
                    onChange={e => setForm(f => ({ ...f, paid_amount: e.target.value }))} required />
                  {(() => {
                    const paid = parseFloat(form.paid_amount || 0);
                    if (paid <= 0) return <div className="dim tiny" style={{ marginTop:5 }}>{t('sales.partialPaidHint')}</div>;
                    const due = Math.max(0, totalAmount - paid);
                    if (due <= 0) return <div style={{ color:'var(--success)', fontSize:12, fontWeight:600, marginTop:5 }}>{t('common.fullySettled')}</div>;
                    return <div style={{ color:'var(--accent)', fontSize:12, marginTop:5 }}>{TK(due)} {t('sales.dueAfterSale')}</div>;
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL — sticky summary ─────────────────────── */}
          <div style={{ flex:'0 0 300px', position:'sticky', top:80 }}>
            <div className="card" style={{ padding:24 }}>
              <div className="section-title" style={{ marginBottom:16 }}>{t('sales.orderSummary')}</div>

              {/* Line items */}
              {lineItems.some(it => it.cylinder && it.lineTotal > 0) ? (
                <div style={{ marginBottom:16 }}>
                  {lineItems.map((it, i) => it.cylinder && it.lineTotal > 0 && (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border-soft)', fontSize:13 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0, flex:1 }}>
                        <CylBadge cylinder={it.cylinder} size="sm" />
                        <span style={{ color:'var(--text-2)' }}>{it.cylinder.name} {it.cylinder.size} × {it.qty}</span>
                      </div>
                      <span style={{ fontWeight:600, marginLeft:8, flexShrink:0 }}>{TK(it.lineTotal)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dim tiny" style={{ textAlign:'center', padding:'16px 0', marginBottom:16 }}>
                  Select items to see summary
                </div>
              )}

              {/* Totals */}
              <div style={{ marginBottom:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:18, fontWeight:800, marginBottom:10, paddingBottom:10, borderBottom:'2px solid var(--border-soft)' }}>
                  <span>{t('common.total')}</span>
                  <span style={{ color:'var(--primary)' }}>{TK(totalAmount)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, fontWeight:600, color:'var(--success)', marginBottom:6 }}>
                  <span>{t('common.paid')}</span>
                  <span>{TK(paidAmount)}</span>
                </div>
                {dueAmount > 0 && (
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, fontWeight:700, color:'var(--accent)' }}>
                    <span>{t('common.due')}</span>
                    <span>{TK(dueAmount)}</span>
                  </div>
                )}
              </div>

              {/* Payment status badge */}
              <div style={{ marginBottom:16 }}>
                <StatusPill status={form.payment_type} />
              </div>

              {/* Submit */}
              <button type="submit"
                style={{ width:'100%', justifyContent:'center', marginBottom:8 }}
                className="btn btn-primary"
                disabled={saleMutation.isPending || !isValid}>
                {saleMutation.isPending ? t('sales.saving') : t('sales.recordSale')}
              </button>

              <button type="button" className="btn btn-ghost" style={{ width:'100%', justifyContent:'center' }}
                onClick={handleCancel}>
                {t('common.cancel')}
              </button>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}
