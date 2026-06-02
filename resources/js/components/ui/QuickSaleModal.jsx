import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cylinderService }  from '../../services/cylinderService';
import { customerService }  from '../../services/customerService';
import { salesmanService }  from '../../services/salesmanService';
import { saleService }      from '../../services/saleService';
import { useAuth }          from '../../contexts/AuthContext';
import { UserPlus }         from 'lucide-react';

const TK       = (n) => '৳' + Number(n || 0).toLocaleString('en-US');
const todayStr = new Date().toISOString().split('T')[0];
const DEFAULT_FORM = {
  customer_id: '', sale_date: todayStr,
  payment_type: 'cash', paid_amount: '',
  items: [{ cylinder_id: '', qty: 1, unit_price: '' }],
};

export default function QuickSaleModal({ onClose }) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { user, isSalesman } = useAuth();

  const [form,          setForm]          = useState(DEFAULT_FORM);
  const [error,         setError]         = useState('');
  const [custSearch,    setCustSearch]    = useState('');
  const [showCustInput, setShowCustInput] = useState(false);
  const [newCustForm,   setNewCustForm]   = useState({ name: '', phone: '' });
  const [custDropOpen,  setCustDropOpen]  = useState(false);

  /* ── Data fetching ──────────────────────────────────────────────── */
  const { data: cylinders } = useQuery({
    queryKey: ['cylinders'],
    queryFn:  cylinderService.getAll,
    enabled:  !isSalesman,
  });

  const { data: myData } = useQuery({
    queryKey: ['my-allocations', user?.id],
    queryFn:  () => salesmanService.getById(user.id),
    enabled:  isSalesman && !!user?.id,
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn:  () => customerService.getAll(),
  });

  /* ── Allocation map for salesman ────────────────────────────────── */
  const allocMap = useMemo(() => {
    if (!isSalesman) return {};
    const allocs = myData?.salesman?.allocations || [];
    return allocs.reduce((acc, a) => {
      if (a.is_reconciled) return acc;
      const remaining = Math.max(0, (a.qty || 0) - (a.sold_qty || 0) - (a.returned_qty || 0));
      if (!acc[a.cylinder_id]) acc[a.cylinder_id] = { cylinder: a.cylinder, remaining: 0, sale_price: a.sale_price || 0 };
      acc[a.cylinder_id].remaining += remaining;
      return acc;
    }, {});
  }, [isSalesman, myData]);

  const cylinderList = isSalesman
    ? Object.values(allocMap).map(e => e.cylinder).filter(Boolean)
    : (Array.isArray(cylinders) ? cylinders : (cylinders?.data || []));

  const customerList  = customers?.data || [];
  const filteredCusts = custSearch.trim()
    ? customerList.filter(c => c.name.toLowerCase().includes(custSearch.toLowerCase()) || (c.phone || '').includes(custSearch))
    : customerList;

  const selectedCustomer = customerList.find(c => String(c.id) === String(form.customer_id));

  /* ── Mutations ──────────────────────────────────────────────────── */
  const saleMutation = useMutation({
    mutationFn: saleService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['sales-today'] });
      qc.invalidateQueries({ queryKey: ['my-allocations'] });
      setForm(DEFAULT_FORM);
      onClose();
    },
    onError: (e) => setError(e.response?.data?.message || 'Failed to create sale'),
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
    onError: () => {},
  });

  /* ── Item helpers ───────────────────────────────────────────────── */
  const setItem = (i, field, val) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: val };
    if (field === 'cylinder_id' && isSalesman) {
      const alloc   = allocMap[val];
      items[i].qty        = Math.min(parseInt(items[i].qty) || 1, alloc?.remaining || 1);
      items[i].unit_price = alloc?.sale_price ? String(alloc.sale_price) : '';
    }
    setForm(f => ({ ...f, items }));
  };

  const addItem = () => setForm(f => {
    const last = f.items[f.items.length - 1];
    return { ...f, items: [...f.items, { cylinder_id: last?.cylinder_id || '', qty: 1, unit_price: '' }] };
  });

  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const handleClose = () => {
    const hasData = form.items.some(i => i.cylinder_id || i.unit_price) || form.customer_id;
    if (hasData && !window.confirm(t('common.discardChanges'))) return;
    setForm(DEFAULT_FORM);
    onClose();
  };

  const totalAmount = form.items.reduce((s, it) =>
    s + (parseFloat(it.qty || 0) * parseFloat(it.unit_price || 0)), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    saleMutation.mutate({
      ...form,
      customer_id: form.customer_id ? parseInt(form.customer_id) : null,
      paid_amount: form.payment_type === 'cash' ? totalAmount : parseFloat(form.paid_amount || 0),
      items: form.items.map(it => ({
        cylinder_id: parseInt(it.cylinder_id),
        qty:         parseInt(it.qty),
        unit_price:  parseFloat(it.unit_price),
      })),
    });
  };

  const selectCustomer = (c) => {
    setForm(f => ({ ...f, customer_id: String(c.id) }));
    setCustSearch(c.name);
    setCustDropOpen(false);
  };

  const clearCustomer = () => {
    setForm(f => ({ ...f, customer_id: '' }));
    setCustSearch('');
    setCustDropOpen(false);
    setShowCustInput(false);
  };

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <Modal title={t('sales.quickSale')} onClose={handleClose} size="md">
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ background:'var(--error-bg)',color:'var(--error)',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:13 }}>{error}</div>
        )}

        {/* ── Customer with quick-add ─────────────────────────────── */}
        <div style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
            <label className="label" style={{ margin:0 }}>{t('nav.customers')}</label>
            {form.customer_id && (
              <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize:11 }} onClick={clearCustomer}>
                ✕ {t('sales.walkIn')}
              </button>
            )}
          </div>

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
                  {/* Walk-in option */}
                  <div style={{ padding:'10px 14px', fontSize:13, cursor:'pointer', borderBottom:'1px solid var(--border-soft)', color:'var(--text-3)' }}
                    onMouseDown={() => { setCustDropOpen(false); setCustSearch(''); }}>
                    {t('sales.walkIn')}
                  </div>

                  {/* Customer list */}
                  {filteredCusts.slice(0, 8).map(c => (
                    <div key={c.id} style={{ padding:'10px 14px', fontSize:13, cursor:'pointer' }}
                      onMouseDown={() => selectCustomer(c)}
                      onMouseEnter={e => e.currentTarget.style.background='var(--bg)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <div style={{ fontWeight:600 }}>{c.name}</div>
                      {c.phone && <div className="dim tiny">{c.phone}</div>}
                    </div>
                  ))}

                  {/* Quick-add if typed name has no full match */}
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
            <div style={{ background:'var(--primary-soft)', borderRadius:8, padding:'8px 14px', fontSize:13, fontWeight:600 }}>
              {selectedCustomer?.name || t('sales.walkIn')}
            </div>
          )}

          {/* Inline new customer form */}
          {showCustInput && (
            <div style={{ marginTop:8, background:'var(--bg)', borderRadius:8, padding:12, border:'1px dashed var(--primary)' }}>
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

        {/* ── Sale date ────────────────────────────────────────────── */}
        <div style={{ marginBottom:12 }}>
          <label className="label">{t('sales.saleDate')}</label>
          <input type="date" className="input" value={form.sale_date}
            readOnly={isSalesman}
            style={isSalesman ? { background:'var(--bg)', cursor:'default' } : {}}
            onChange={e => !isSalesman && setForm(f => ({...f, sale_date: e.target.value}))} required />
        </div>

        {/* ── Items (first — user picks what they're selling) ──────── */}
        <div style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div className="section-title" style={{ fontSize:13, marginBottom:0 }}>{t('sales.items')}</div>
            {isSalesman && cylinderList.length === 0 && (
              <span style={{ fontSize:12, color:'var(--accent)' }}>No stock allocated for today</span>
            )}
          </div>
          {form.items.map((item, i) => {
            const maxQty = isSalesman ? (allocMap[item.cylinder_id]?.remaining ?? '') : '';
            return (
              <div key={i} style={{ display:'flex', gap:8, marginBottom:8, alignItems:'flex-end' }}>
                <div style={{ flex:2 }}>
                  {i === 0 && <label className="label">{t('inventory.cylinderTypes')}</label>}
                  <select className="select" value={item.cylinder_id} onChange={e => setItem(i, 'cylinder_id', e.target.value)} required>
                    <option value="">Select...</option>
                    {cylinderList.map(c => {
                      const remaining = isSalesman ? allocMap[c.id]?.remaining : null;
                      return (
                        <option key={c.id} value={c.id} disabled={isSalesman && remaining === 0}>
                          {c.name} {c.size}{isSalesman && remaining != null ? ` (${remaining} left)` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div style={{ flex:1 }}>
                  {i === 0 && <label className="label">{t('common.qty')}</label>}
                  <input type="number" className="input" min="1" max={maxQty || undefined}
                    value={item.qty} onChange={e => setItem(i, 'qty', e.target.value)} required />
                  {isSalesman && maxQty !== '' && item.cylinder_id && (
                    <div className="dim tiny" style={{ marginTop:3 }}>{maxQty} {t('allocation.allocated')}</div>
                  )}
                </div>
                <div style={{ flex:1 }}>
                  {i === 0 && <label className="label">{t('sales.unitPrice')}</label>}
                  <input type="number" className="input" min="0" step="0.01"
                    value={item.unit_price}
                    readOnly={isSalesman}
                    style={isSalesman ? { background:'var(--bg)', cursor:'default' } : {}}
                    onChange={e => !isSalesman && setItem(i, 'unit_price', e.target.value)} required />
                </div>
                {form.items.length > 1 && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeItem(i)}>✕</button>
                )}
              </div>
            );
          })}
          <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}>{t('common.addItem')}</button>
        </div>

        {/* ── Total strip (visible before choosing payment) ─────────── */}
        {totalAmount > 0 && (
          <div style={{ background:'var(--primary-soft)', borderRadius:8, padding:'10px 16px', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span className="dim tiny">{t('common.total')}</span>
            <span style={{ fontSize:18, fontWeight:700, color:'var(--primary)' }}>{TK(totalAmount)}</span>
          </div>
        )}

        {/* ── Payment type ─────────────────────────────────────────── */}
        <div style={{ marginBottom:12 }}>
          <label className="label">{t('sales.paymentType')}</label>
          <select className="select" value={form.payment_type} onChange={e => setForm(f => ({...f, payment_type: e.target.value}))}>
            <option value="cash">{t('status.cash')}</option>
            <option value="due">{t('status.due')}</option>
            <option value="partial">{t('status.partial')}</option>
          </select>
        </div>

        {/* ── Partial amount (only when partial selected) ───────────── */}
        {form.payment_type === 'partial' && (
          <div style={{ marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
              <label className="label" style={{ margin:0 }}>{t('sales.paidAmount')} ৳</label>
              {totalAmount > 0 && <span className="dim tiny">Max: {TK(totalAmount)}</span>}
            </div>
            <input type="number" className="input" placeholder="0" min="0.01" step="0.01" max={totalAmount || undefined}
              value={form.paid_amount} onChange={e => setForm(f => ({...f, paid_amount: e.target.value}))} />
            {(() => {
              const paid = parseFloat(form.paid_amount || 0);
              const rem  = Math.round((totalAmount - paid) * 100) / 100;
              if (paid <= 0 || totalAmount <= 0) return <div className="dim tiny" style={{ marginTop:5 }}>{t('sales.partialPaidHint')}</div>;
              if (rem  <= 0) return <div style={{ color:'var(--success)', fontSize:12, fontWeight:600, marginTop:5 }}>{t('common.fullySettled')}</div>;
              return <div style={{ color:'var(--accent)', fontSize:12, marginTop:5 }}>{TK(rem)} {t('common.afterPayment')}</div>;
            })()}
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:20 }}>
          <button type="button" className="btn btn-ghost" onClick={handleClose}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={saleMutation.isPending}>
            {saleMutation.isPending ? t('sales.saving') : t('sales.recordSale')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
