import React, { useState } from 'react';
import { usePurchases } from '../hooks/usePurchases';
import { useTranslation } from 'react-i18next';
import CylCell    from '../components/ui/CylCell';
import StatusPill from '../components/ui/StatusPill';
import Modal      from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Plus, Zap, AlertCircle, CreditCard } from 'lucide-react';

const TK = (n) => '৳' + Number(n || 0).toLocaleString('en-US');
const todayStr = new Date().toISOString().split('T')[0];
const defaultForm = { supplier_id: '', purchase_date: todayStr, paid_amount: '', notes: '', items: [{ cylinder_id: '', qty: 1, unit_cost: '' }] };

function ErrorBanner({ error }) {
  if (!error) return null;
  const msg = error.response?.data?.message || error.message || 'Error';
  return (
    <div style={{ background:'var(--error-bg)',color:'var(--error)',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:13,display:'flex',gap:8,alignItems:'flex-start' }}>
      <AlertCircle size={15} style={{ marginTop:1,flexShrink:0 }} /><span>{msg}</span>
    </div>
  );
}

export default function Purchases() {
  const { t } = useTranslation();
  const {
    purchases, isLoading, cylinders, suppliers,
    showAdd, setShowAdd, createPurchase, isCreating, createError,
    payTarget, setPayTarget, payBalance, isPaying, payError,
    simulation, simulateSale, simLoading,
  } = usePurchases();

  const [form, setForm]   = useState(defaultForm);
  const [simForm, setSimForm] = useState({ cylinder_id: '', qty: 1, unit_price: '' });
  const [payForm, setPayForm] = useState({ amount: '', date: todayStr, notes: '' });

  const setItem = (i, field, val) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: val };
    setForm(f => ({...f, items}));
  };

  // Smart copy: new item inherits cylinder_id from last item
  const addItem = () => setForm(f => {
    const last = f.items[f.items.length - 1];
    return { ...f, items: [...f.items, { cylinder_id: last?.cylinder_id || '', qty: 1, unit_cost: '' }] };
  });

  const handleCreate = (e) => {
    e.preventDefault();
    createPurchase({
      ...form,
      paid_amount: parseFloat(form.paid_amount || 0),
      items: form.items.map(it => ({
        cylinder_id: parseInt(it.cylinder_id),
        qty: parseInt(it.qty),
        unit_cost: parseFloat(it.unit_cost),
      })),
    });
  };

  const handleClose = () => {
    const hasData = form.items.some(i => i.cylinder_id || i.unit_cost) || form.supplier_id;
    if (hasData && !window.confirm(t('common.discardChanges'))) return;
    setForm(defaultForm);
    setShowAdd(false);
  };

  const openPay = (purchase) => {
    setPayForm({ amount: purchase.due_amount || '', date: todayStr, notes: '' });
    setPayTarget(purchase);
  };

  const totalAmount = form.items.reduce((s, it) => s + (parseInt(it.qty||0) * parseFloat(it.unit_cost||0)), 0);

  if (isLoading) return <LoadingSpinner text={t('common.loading')} />;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h3 style={{ margin:0 }}>{t('purchases.title')}</h3>
          <p className="dim tiny" style={{ marginTop:4 }}>{t('purchases.subtitle')}</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> {t('purchases.addPurchase')}
        </button>
      </div>

      {/* FIFO Simulator */}
      <div className="card" style={{ marginBottom:24, background:'var(--primary-soft)', border:'1px solid var(--primary)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
          <Zap size={18} style={{ color:'var(--primary)' }} />
          <div className="section-title" style={{ marginBottom:0, color:'var(--primary)' }}>{t('purchases.fifoSimulator')}</div>
        </div>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div style={{ flex:2, minWidth:160 }}>
            <label className="label">{t('inventory.cylinderTypes')}</label>
            <select className="select" value={simForm.cylinder_id} onChange={e => setSimForm(f => ({...f, cylinder_id: e.target.value}))}>
              <option value="">{t('purchases.selectCylinder')}</option>
              {cylinders.map(c => <option key={c.id} value={c.id}>{c.name} {c.size}</option>)}
            </select>
          </div>
          <div style={{ flex:1, minWidth:100 }}>
            <label className="label">{t('common.qty')}</label>
            <input type="number" className="input" min="1" value={simForm.qty} onChange={e => setSimForm(f => ({...f, qty: parseInt(e.target.value)}))} />
          </div>
          <div style={{ flex:1, minWidth:120 }}>
            <label className="label">{t('purchases.salePrice')}</label>
            <input type="number" className="input" min="0" step="0.01" value={simForm.unit_price} onChange={e => setSimForm(f => ({...f, unit_price: e.target.value}))} />
          </div>
          <button className="btn btn-primary btn-sm"
            disabled={!simForm.cylinder_id || !simForm.unit_price || simLoading}
            onClick={() => simulateSale(parseInt(simForm.cylinder_id), simForm.qty, parseFloat(simForm.unit_price))}
          >
            {simLoading ? t('purchases.simulating') : t('purchases.simulateFifo')}
          </button>
        </div>

        {simulation && (
          <div style={{ marginTop:16, background:'#fff', borderRadius:10, padding:16 }}>
            <div style={{ display:'flex', gap:24, marginBottom:12 }}>
              <div><div className="dim tiny">{t('purchases.revenue')}</div><div style={{ fontWeight:700, color:'var(--primary)' }}>{TK(simulation.total_revenue)}</div></div>
              <div><div className="dim tiny">{t('purchases.totalCost')}</div><div style={{ fontWeight:700 }}>{TK(simulation.total_cost)}</div></div>
              <div><div className="dim tiny">{t('purchases.profit')}</div><div style={{ fontWeight:700, color:'var(--success)' }}>{TK(simulation.total_profit)}</div></div>
              <div><div className="dim tiny">{t('purchases.lotsUsed')}</div><div style={{ fontWeight:700 }}>{simulation.lots_consumed}</div></div>
            </div>
            <div className="dim tiny" style={{ marginBottom:8 }}>{t('purchases.lotBreakdown')}</div>
            {simulation.breakdown?.map((b, i) => (
              <div key={i} style={{ display:'flex', gap:16, padding:'6px 0', borderTop:'1px solid var(--border-soft)', fontSize:13 }}>
                <span style={{ fontWeight:600 }}>{b.lot_id_label}</span>
                <span className="dim">×{b.qty} @ {TK(b.unit_cost)}</span>
                <span style={{ color:'var(--success)' }}>= {TK(b.profit)} {t('purchases.profit').toLowerCase()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Purchases table */}
      <div className="card" style={{ padding:0 }}>
        <table className="tbl" style={{ width:'100%' }}>
          <thead>
            <tr>
              <th>#</th>
              <th>{t('common.date')}</th>
              <th>{t('purchases.supplier')}</th>
              <th>{t('common.qty')}</th>
              <th>{t('common.total')}</th>
              <th>{t('common.paid')}</th>
              <th>{t('common.due')}</th>
              <th>{t('common.status')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign:'center', padding:40 }} className="dim">{t('purchases.noPurchases')}</td></tr>
            )}
            {purchases.map(p => (
              <tr key={p.id}>
                <td className="dim tiny">#{p.id}</td>
                <td>{p.purchase_date}</td>
                <td style={{ fontWeight:600 }}>{p.supplier?.name}</td>
                <td>{p.items?.reduce((s, it) => s + it.qty, 0)} {t('common.pcs')}</td>
                <td style={{ fontWeight:600 }}>{TK(p.total_amount)}</td>
                <td style={{ color:'var(--success)' }}>{TK(p.paid_amount)}</td>
                <td style={{ color: p.due_amount > 0 ? 'var(--accent)' : 'inherit', fontWeight: p.due_amount > 0 ? 700 : 400 }}>
                  {TK(p.due_amount)}
                </td>
                <td>{p.items?.map((it, i) => <StatusPill key={i} status={it.status} />)}</td>
                <td>
                  {p.due_amount > 0 && (
                    <button className="btn btn-soft btn-sm" onClick={() => openPay(p)}>
                      <CreditCard size={13} /> {t('purchases.payBalance')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Purchase Modal */}
      {showAdd && (
        <Modal title={t('purchases.addPurchase')} onClose={handleClose} size="lg">
          <ErrorBanner error={createError} />
          <form onSubmit={handleCreate}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label className="label">{t('purchases.supplier')} *</label>
                <select className="select" value={form.supplier_id} onChange={e => setForm(f => ({...f, supplier_id: e.target.value}))} required>
                  <option value="">{t('purchases.selectSupplier')}</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t('purchases.purchaseDate')} *</label>
                <input type="date" className="input" value={form.purchase_date} onChange={e => setForm(f => ({...f, purchase_date: e.target.value}))} required />
              </div>
            </div>

            <div className="section-title" style={{ fontSize:13, marginBottom:8 }}>{t('common.addItem').replace('+','').trim()}</div>
            {form.items.map((item, i) => (
              <div key={i} style={{ display:'flex', gap:8, marginBottom:8, alignItems:'flex-end' }}>
                <div style={{ flex:2 }}>
                  {i === 0 && <label className="label">{t('inventory.cylinderTypes')}</label>}
                  <select className="select" value={item.cylinder_id} onChange={e => setItem(i, 'cylinder_id', e.target.value)} required>
                    <option value="">Select...</option>
                    {cylinders.map(c => <option key={c.id} value={c.id}>{c.name} {c.size}</option>)}
                  </select>
                </div>
                <div style={{ flex:1 }}>
                  {i === 0 && <label className="label">{t('common.qty')}</label>}
                  <input type="number" className="input" min="1" value={item.qty} onChange={e => setItem(i, 'qty', e.target.value)} required />
                </div>
                <div style={{ flex:1 }}>
                  {i === 0 && <label className="label">{t('purchases.unitCost')}</label>}
                  <input type="number" className="input" min="0" step="0.01" value={item.unit_cost} onChange={e => setItem(i, 'unit_cost', e.target.value)} required />
                </div>
                {form.items.length > 1 && (
                  <button type="button" className="btn btn-ghost btn-sm"
                    onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))}>✕</button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}>{t('common.addItem')}</button>

            <div style={{ marginTop:12, marginBottom:12 }}>
              <label className="label">{t('common.paid')} ৳</label>
              <input type="number" className="input" min="0" step="0.01" max={totalAmount || undefined}
                value={form.paid_amount} placeholder={totalAmount}
                onChange={e => setForm(f => ({...f, paid_amount: e.target.value}))} />
            </div>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:20 }}>
              <div>
                <div className="dim tiny">{t('common.total')}</div>
                <div style={{ fontSize:18, fontWeight:700, color:'var(--primary)' }}>{TK(totalAmount)}</div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button type="button" className="btn btn-ghost" onClick={handleClose}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={isCreating}>
                  {isCreating ? t('purchases.addingPurchase') : t('purchases.addPurchase')}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Pay Remaining Modal */}
      {payTarget && (
        <Modal title={t('purchases.payRemaining')} onClose={() => setPayTarget(null)}>
          <ErrorBanner error={payError} />
          <div style={{ background:'var(--warning-bg)', borderRadius:10, padding:'12px 16px', marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:600 }}>{payTarget.supplier?.name}</div>
                <div className="dim tiny">{t('common.date')}: {payTarget.purchase_date}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:18, fontWeight:700, color:'var(--warning)' }}>{TK(payTarget.due_amount)}</div>
                <div className="dim tiny">{t('purchases.remainingDue')}</div>
              </div>
            </div>
          </div>
          <div style={{ background:'var(--bg)', borderRadius:8, padding:'8px 14px', marginBottom:16 }}>
            <span className="dim tiny">{t('purchases.alreadyPaid')}: </span>
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
                if (entered <= 0) return <div className="dim tiny" style={{ marginTop:5 }}>{t('purchases.remainingDue')}: {TK(payTarget.due_amount)}</div>;
                if (remaining <= 0) return <div style={{ color:'var(--success)', fontSize:12, fontWeight:600, marginTop:5 }}>{t('common.fullySettled')}</div>;
                return <div style={{ color:'var(--warning)', fontSize:12, marginTop:5 }}>{TK(remaining)} {t('common.afterPayment')}</div>;
              })()}
            </div>
            <div style={{ marginBottom:12 }}>
              <label className="label">{t('purchases.paymentDate')} *</label>
              <input type="date" className="input" value={payForm.date}
                onChange={e => setPayForm(f => ({...f, date: e.target.value}))} required />
            </div>
            <div style={{ marginBottom:12 }}>
              <label className="label">{t('common.notes')}</label>
              <input className="input" value={payForm.notes}
                onChange={e => setPayForm(f => ({...f, notes: e.target.value}))} />
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:20 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setPayTarget(null)}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary" disabled={isPaying}>
                {isPaying ? t('common.saving') : t('purchases.payBalance')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
