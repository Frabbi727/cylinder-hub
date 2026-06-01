import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supplierService } from '../services/supplierService';
import { useTranslation } from 'react-i18next';
import Modal    from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Plus, CreditCard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const TK = (n) => '৳' + Number(n || 0).toLocaleString('en-US');
const todayStr = new Date().toISOString().split('T')[0];

export default function Suppliers() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const { t } = useTranslation();
  const [showAdd, setShowAdd]     = useState(false);
  const [showPay, setShowPay]     = useState(false);
  const [selected, setSelected]   = useState(null);
  const [addForm, setAddForm]     = useState({ name: '', type: 'dealer', phone: '', address: '' });
  const [payForm, setPayForm]     = useState({ amount: '', payment_date: todayStr, notes: '' });

  const { data: suppliers, isLoading } = useQuery({ queryKey: ['suppliers'], queryFn: () => supplierService.getAll() });
  const createMutation = useMutation({ mutationFn: supplierService.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); setShowAdd(false); } });
  const payMutation    = useMutation({ mutationFn: ({ id, data }) => supplierService.pay(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setShowPay(false); } });

  const supplierList = suppliers?.data || [];
  const totalDue = supplierList.reduce((s, sp) => s + parseFloat(sp.total_due || 0), 0);

  if (isLoading) return <LoadingSpinner text={t('common.loading')} />;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div className="dim tiny">{t('suppliers.totalDue')}: <strong style={{ color:'var(--warning)' }}>{TK(totalDue)}</strong></div>
        {isAdmin && <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}><Plus size={16} /> {t('suppliers.addSupplier')}</button>}
      </div>
      <div className="card" style={{ padding:0 }}>
        <table className="tbl" style={{ width:'100%' }}>
          <thead>
            <tr><th>{t('common.name')}</th><th>{t('common.type')}</th><th>{t('common.phone')}</th><th>{t('suppliers.totalDue')}</th><th>{t('common.actions')}</th></tr>
          </thead>
          <tbody>
            {supplierList.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign:'center', padding:40 }} className="dim">{t('suppliers.noSuppliers')}</td></tr>
            )}
            {supplierList.map(s => (
              <tr key={s.id}>
                <td style={{ fontWeight:600 }}>{s.name}</td>
                <td><span className="pill">{s.type === 'dealer' ? t('suppliers.dealerAgent') : t('suppliers.self')}</span></td>
                <td className="dim">{s.phone || '—'}</td>
                <td style={{ fontWeight:700, color: s.total_due > 0 ? 'var(--warning)' : 'var(--success)' }}>{TK(s.total_due)}</td>
                <td>
                  {s.total_due > 0 && (
                    <button className="btn btn-soft btn-sm" onClick={() => { setSelected(s); setPayForm({ amount: s.total_due, payment_date: todayStr, notes: '' }); setShowPay(true); }}>
                      <CreditCard size={14} /> {t('suppliers.paySup')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <Modal title={t('suppliers.addSupplier')} onClose={() => setShowAdd(false)}>
          <form onSubmit={e => { e.preventDefault(); createMutation.mutate(addForm); }}>
            <div style={{ marginBottom:12 }}><label className="label">{t('common.name')} *</label><input className="input" value={addForm.name} onChange={e => setAddForm(f => ({...f, name: e.target.value}))} required /></div>
            <div style={{ marginBottom:12 }}>
              <label className="label">{t('common.type')}</label>
              <select className="select" value={addForm.type} onChange={e => setAddForm(f => ({...f, type: e.target.value}))}>
                <option value="dealer">{t('suppliers.dealerAgent')}</option>
                <option value="self">{t('suppliers.self')}</option>
              </select>
            </div>
            <div style={{ marginBottom:12 }}><label className="label">{t('common.phone')}</label><input className="input" value={addForm.phone} onChange={e => setAddForm(f => ({...f, phone: e.target.value}))} /></div>
            <div style={{ marginBottom:12 }}><label className="label">{t('common.address')}</label><input className="input" value={addForm.address} onChange={e => setAddForm(f => ({...f, address: e.target.value}))} /></div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:20 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>{createMutation.isPending ? t('common.saving') : t('suppliers.addSupplier')}</button>
            </div>
          </form>
        </Modal>
      )}

      {showPay && selected && (
        <Modal title={`${t('suppliers.paySup')} — ${selected.name}`} onClose={() => setShowPay(false)}>
          <form onSubmit={e => { e.preventDefault(); payMutation.mutate({ id: selected.id, data: payForm }); }}>
            <div style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                <label className="label" style={{ margin:0 }}>{t('common.amount')} ৳ *</label>
                <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize:11, padding:'2px 8px' }}
                  onClick={() => setPayForm(f => ({...f, amount: selected.total_due}))}>
                  {t('common.payInFull')}
                </button>
              </div>
              <input type="number" className="input" min="0.01" step="0.01" max={selected.total_due}
                value={payForm.amount} onChange={e => setPayForm(f => ({...f, amount: e.target.value}))} required />
              {(() => {
                const entered = parseFloat(payForm.amount || 0);
                const remaining = Math.round((selected.total_due - entered) * 100) / 100;
                if (entered <= 0) return <div className="dim tiny" style={{ marginTop:5 }}>{t('suppliers.totalDue')}: {TK(selected.total_due)}</div>;
                if (remaining <= 0) return <div style={{ color:'var(--success)', fontSize:12, fontWeight:600, marginTop:5 }}>{t('common.fullySettled')}</div>;
                return <div style={{ color:'var(--warning)', fontSize:12, marginTop:5 }}>{TK(remaining)} {t('common.afterPayment')}</div>;
              })()}
            </div>
            <div style={{ marginBottom:12 }}><label className="label">{t('common.date')} *</label><input type="date" className="input" value={payForm.payment_date} onChange={e => setPayForm(f => ({...f, payment_date: e.target.value}))} required /></div>
            <div style={{ marginBottom:12 }}><label className="label">{t('common.notes')}</label><input className="input" value={payForm.notes} onChange={e => setPayForm(f => ({...f, notes: e.target.value}))} /></div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:20 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowPay(false)}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-primary" disabled={payMutation.isPending}>{payMutation.isPending ? t('common.saving') : t('suppliers.recordPayment')}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
