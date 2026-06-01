import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cylinderService }  from '../../services/cylinderService';
import { customerService }  from '../../services/customerService';
import { salesmanService }  from '../../services/salesmanService';
import { saleService }      from '../../services/saleService';
import { useAuth }          from '../../contexts/AuthContext';

const TK = (n) => '৳' + Number(n || 0).toLocaleString('en-US');
const todayStr = new Date().toISOString().split('T')[0];
const DEFAULT_FORM = {
  customer_id: '', sale_date: todayStr,
  payment_type: 'cash', paid_amount: '',
  items: [{ cylinder_id: '', qty: 1, unit_price: '' }],
};

export default function QuickSaleModal({ onClose }) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [error, setError] = useState('');

  const isSalesman = user?.role === 'salesman';

  // Admins see all cylinders; salesmen only see their today's allocations
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

  // Build allocMap: cylinder_id → { cylinder, remaining, sale_price }
  const allocMap = useMemo(() => {
    if (!isSalesman) return {};
    const allocs = myData?.salesman?.allocations || [];
    return allocs.reduce((acc, a) => {
      if (a.is_reconciled) return acc;
      const remaining = Math.max(0, (a.qty || 0) - (a.sold_qty || 0));
      if (!acc[a.cylinder_id]) acc[a.cylinder_id] = { cylinder: a.cylinder, remaining: 0, sale_price: a.sale_price || 0 };
      acc[a.cylinder_id].remaining += remaining;
      return acc;
    }, {});
  }, [isSalesman, myData]);

  const cylinderList = isSalesman
    ? Object.values(allocMap).map(e => e.cylinder).filter(Boolean)
    : (Array.isArray(cylinders) ? cylinders : (cylinders?.data || []));

  const customerList = customers?.data || [];

  const mutation = useMutation({
    mutationFn: saleService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['my-allocations'] });
      setForm(DEFAULT_FORM);
      onClose();
    },
    onError: (e) => setError(e.response?.data?.message || 'Failed to create sale'),
  });

  const setItem = (i, field, val) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: val };
    // When salesman changes cylinder, auto-fill price from allocation and cap qty
    if (field === 'cylinder_id' && isSalesman) {
      const alloc = allocMap[val];
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
    const data = {
      ...form,
      customer_id: form.customer_id || null,
      paid_amount: form.payment_type === 'cash' ? totalAmount : parseFloat(form.paid_amount || 0),
      items: form.items.map(it => ({
        cylinder_id: parseInt(it.cylinder_id),
        qty:         parseInt(it.qty),
        unit_price:  parseFloat(it.unit_price),
      })),
    };
    mutation.mutate(data);
  };

  return (
    <Modal title={t('sales.quickSale')} onClose={handleClose} size="md">
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ background:'var(--error-bg)',color:'var(--error)',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:13 }}>{error}</div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div>
            <label className="label">{t('nav.customers')}</label>
            <select className="select" value={form.customer_id} onChange={e => setForm(f => ({...f, customer_id: e.target.value}))}>
              <option value="">{t('sales.walkIn')}</option>
              {customerList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t('sales.saleDate')}</label>
            <input type="date" className="input" value={form.sale_date}
              readOnly={isSalesman}
              style={isSalesman ? { background:'var(--bg)', cursor:'default' } : {}}
              onChange={e => !isSalesman && setForm(f => ({...f, sale_date: e.target.value}))} required />
          </div>
        </div>

        <div style={{ marginBottom:12 }}>
          <label className="label">{t('sales.paymentType')}</label>
          <select className="select" value={form.payment_type} onChange={e => setForm(f => ({...f, payment_type: e.target.value}))}>
            <option value="cash">{t('status.cash')}</option>
            <option value="due">{t('status.due')}</option>
            <option value="partial">{t('status.partial')}</option>
          </select>
        </div>

        {form.payment_type === 'partial' && (
          <div style={{ marginBottom:12 }}>
            <label className="label">{t('sales.paidAmount')} ৳</label>
            <input type="number" className="input" placeholder="0" min="0" step="0.01" max={totalAmount || undefined}
              value={form.paid_amount} onChange={e => setForm(f => ({...f, paid_amount: e.target.value}))} />
            {(() => {
              const paid = parseFloat(form.paid_amount || 0);
              const remaining = Math.round((totalAmount - paid) * 100) / 100;
              if (paid <= 0 || totalAmount <= 0) return <div className="dim tiny" style={{ marginTop:5 }}>{t('sales.partialPaidHint')}</div>;
              if (remaining <= 0) return <div style={{ color:'var(--success)', fontSize:12, fontWeight:600, marginTop:5 }}>{t('common.fullySettled')}</div>;
              return <div style={{ color:'var(--accent)', fontSize:12, marginTop:5 }}>{TK(remaining)} {t('common.afterPayment')}</div>;
            })()}
          </div>
        )}

        <div style={{ marginBottom:8 }}>
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
                    <div className="dim tiny" style={{ marginTop:3 }}>{maxQty} allocated</div>
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

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:20 }}>
          <div>
            <div className="dim tiny">{t('common.total')}</div>
            <div style={{ fontSize:18, fontWeight:700, color:'var(--primary)' }}>{TK(totalAmount)}</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button type="button" className="btn btn-ghost" onClick={handleClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? t('sales.saving') : t('sales.recordSale')}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
