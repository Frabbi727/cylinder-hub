import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesmanService } from '../services/salesmanService';
import { cylinderService } from '../services/cylinderService';
import { saleService } from '../services/saleService';
import StatusPill from '../components/ui/StatusPill';
import CylBadge from '../components/ui/CylBadge';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip,
} from 'recharts';
import {
  ChevronLeft, Plus, CreditCard, AlertCircle, TrendingUp,
  Users, DollarSign, CheckCircle, Pencil,
} from 'lucide-react';

const TK       = (n) => '৳' + Number(n || 0).toLocaleString('en-US');
const todayStr = new Date().toISOString().split('T')[0];
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
const weekStart  = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split('T')[0]; })();

const PERIODS = [
  { key: 'today', label: 'Today',      from: todayStr,   to: todayStr },
  { key: 'week',  label: 'This Week',  from: weekStart,  to: todayStr },
  { key: 'month', label: 'This Month', from: monthStart, to: todayStr },
  { key: 'custom', label: 'Custom' },
];

function KpiCard({ icon, label, value, color = 'var(--text-1)', sub }) {
  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

export default function SalesmanDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const qc       = useQueryClient();

  const [period,     setPeriod]     = useState('month');
  const [customFrom, setCustomFrom] = useState(monthStart);
  const [customTo,   setCustomTo]   = useState(todayStr);

  const [showAllocate, setShowAllocate] = useState(false);
  const [allocForm,    setAllocForm]    = useState({ cylinder_id: '', qty: 1, sale_price: '' });
  const [allocError,   setAllocError]   = useState('');

  const [payTarget, setPayTarget] = useState(null);
  const [payForm,   setPayForm]   = useState({ amount: '', date: todayStr, notes: '' });
  const [payError,  setPayError]  = useState('');

  const [editAllocTarget, setEditAllocTarget] = useState(null);
  const [editAllocForm,   setEditAllocForm]   = useState({ sold_qty: '', collected_amount: '' });
  const [editAllocError,  setEditAllocError]  = useState('');

  const [editPreAllocTarget, setEditPreAllocTarget] = useState(null);
  const [editPreAllocForm,   setEditPreAllocForm]   = useState({ qty: '', sale_price: '' });
  const [editPreAllocError,  setEditPreAllocError]  = useState('');

  const activePeriod = PERIODS.find(p => p.key === period);
  const from = period === 'custom' ? customFrom : activePeriod?.from;
  const to   = period === 'custom' ? customTo   : activePeriod?.to;

  const { data: liveData } = useQuery({
    queryKey: ['salesman-live', id],
    queryFn:  () => salesmanService.getById(id),
    refetchInterval: 60_000,
  });

  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ['salesman-report-detail', id, from, to],
    queryFn:  () => salesmanService.getReport(id, from, to),
    enabled:  !!from && !!to,
  });

  const { data: cylData } = useQuery({
    queryKey: ['cylinders'],
    queryFn:  cylinderService.getAll,
    enabled:  showAllocate,
  });

  const allocateMutation = useMutation({
    mutationFn: (data) => salesmanService.allocate(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['salesman-live', id] });
      qc.invalidateQueries({ queryKey: ['salesman-report-detail'] }); // prefix match — all periods
      qc.invalidateQueries({ queryKey: ['salesmen'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      qc.invalidateQueries({ queryKey: ['cylinders'] });
      setShowAllocate(false);
      setAllocForm({ cylinder_id: '', qty: 1, sale_price: '' });
      setAllocError('');
    },
    onError: (e) => setAllocError(e.response?.data?.message || 'Allocation failed'),
  });

  const payMutation = useMutation({
    mutationFn: ({ sid, data }) => saleService.payBalance(sid, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['salesman-report-detail', id, from, to] });
      qc.invalidateQueries({ queryKey: ['salesman-live', id] });
      setPayTarget(null);
      setPayError('');
    },
    onError: (e) => setPayError(e.response?.data?.message || 'Failed to record payment'),
  });

  const editPreAllocMutation = useMutation({
    mutationFn: ({ allocId, data }) => salesmanService.updateAllocation(allocId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['salesman-report-detail'] });
      qc.invalidateQueries({ queryKey: ['salesman-live', id] });
      qc.invalidateQueries({ queryKey: ['salesmen'] });
      qc.invalidateQueries({ queryKey: ['cylinders'] });
      setEditPreAllocTarget(null);
      setEditPreAllocError('');
    },
    onError: (e) => setEditPreAllocError(e.response?.data?.message || 'Update failed'),
  });

  const editReconcileMutation = useMutation({
    mutationFn: ({ allocId, data }) => salesmanService.updateReconcile(allocId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['salesman-report-detail', id, from, to] });
      qc.invalidateQueries({ queryKey: ['salesmen'] });
      setEditAllocTarget(null);
      setEditAllocError('');
    },
    onError: (e) => setEditAllocError(e.response?.data?.message || 'Update failed'),
  });

  const report    = reportData?.data;
  const sm        = report?.salesman ?? liveData?.data?.salesman;
  const sales     = report?.sales     || [];
  const allocs    = report?.allocations || [];
  const liveStats = liveData?.data?.stats ?? {};
  const cylinders = Array.isArray(cylData) ? cylData : (cylData?.data || []);

  if (!sm && reportLoading) return <LoadingSpinner text="Loading salesman..." />;
  if (!sm) return <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Salesman not found.</div>;

  const barData = Object.entries(report?.daily_revenue || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date: date.slice(5), revenue }));

  const selectedCyl  = cylinders.find(c => String(c.id) === String(allocForm.cylinder_id));
  const fifoCost     = selectedCyl?.fifo_cost ?? null;
  const salePriceNum = parseFloat(allocForm.sale_price) || 0;
  const priceDiff    = fifoCost !== null && salePriceNum > 0 ? salePriceNum - fifoCost : null;
  const isLoss       = priceDiff !== null && priceDiff < 0;

  return (
    <div>
      {/* Back + Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/allocation')}>
            <ChevronLeft size={16} /> Salesman Stock
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: sm.is_active !== false ? 'var(--primary)' : 'var(--text-3)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>
              {sm.avatar_initials || sm.name?.[0]}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{sm.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{sm.phone}</div>
            </div>
            {sm.is_active === false && <span className="pill" style={{ fontSize: 11 }}>Inactive</span>}
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setAllocError(''); setShowAllocate(true); }}>
          <Plus size={15} /> Allocate Stock
        </button>
      </div>

      {/* Live pending dues banner */}
      {liveStats.pending_due_collections > 0 && (
        <div style={{ background: '#FFF8E1', border: '1px solid #FF9500', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#A85200', display: 'flex', gap: 8 }}>
          <AlertCircle size={15} style={{ marginTop: 1, flexShrink: 0 }} />
          <span><strong>{TK(liveStats.pending_due_collections)}</strong> in pending due collections not yet submitted at EOD.</span>
        </div>
      )}

      {/* Period selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {PERIODS.map(p => (
          <button key={p.key}
            className={`tab-btn${period === p.key ? ' active' : ''}`}
            onClick={() => setPeriod(p.key)}>
            {p.label}
          </button>
        ))}
        {period === 'custom' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="date" className="input" style={{ width: 145 }}
              value={customFrom} max={todayStr}
              onChange={e => setCustomFrom(e.target.value)} />
            <span className="dim tiny">to</span>
            <input type="date" className="input" style={{ width: 145 }}
              value={customTo} min={customFrom} max={todayStr}
              onChange={e => setCustomTo(e.target.value)} />
          </div>
        )}
      </div>

      {reportLoading ? <LoadingSpinner text="Loading report..." /> : (
        <>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
            <KpiCard icon={<DollarSign size={18} />} label="Revenue"
              value={TK(report?.total_revenue)} color="var(--primary)"
              sub={`${report?.total_sold ?? 0} pcs sold`} />
            <KpiCard icon={<CheckCircle size={18} />} label="Cash Collected"
              value={TK(report?.total_cash_collected)} color="var(--success)"
              sub={`Rate: ${((report?.sell_through_rate ?? 0) * 100).toFixed(0)}%`} />
            <KpiCard icon={<AlertCircle size={18} />} label="Still Outstanding"
              value={TK(report?.still_outstanding)} color={report?.still_outstanding > 0 ? '#B83030' : 'var(--text-3)'}
              sub={`Dues created: ${TK(report?.total_dues_created)}`} />
            <KpiCard icon={<TrendingUp size={18} />} label="Units Sold"
              value={`${report?.total_sold ?? 0} pcs`}
              sub={`of ${report?.total_allocated ?? 0} allocated`} />
            <KpiCard icon={<Users size={18} />} label="Customers Reached"
              value={report?.customers_reached ?? 0}
              sub={`${sales.length} sales total`} />
          </div>

          {/* Daily revenue bar chart */}
          {barData.length > 1 && (
            <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Daily Revenue</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={barData} barSize={20}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => '৳' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} />
                  <Tooltip formatter={v => TK(v)} />
                  <Bar dataKey="revenue" fill="var(--primary)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Allocations */}
          {allocs.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Allocations ({allocs.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {allocs.map(a => (
                  <div key={a.id} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderLeft: a.is_reconciled ? '4px solid var(--success)' : '4px solid var(--warning)' }}>
                    {a.cylinder && <CylBadge cylinder={a.cylinder} size="sm" />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{a.cylinder?.name} {a.cylinder?.size}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{a.allocation_date} · {TK(a.sale_price)}/pcs</div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, textAlign: 'center' }}>
                      {[['Allocated', a.qty, 'var(--text-1)'], ['Sold', a.sold_qty||0, 'var(--success)'], ['Returned', a.returned_qty||0, 'var(--warning)']].map(([lbl, val, col]) => (
                        <div key={lbl}><div style={{ fontWeight: 700, color: col }}>{val}</div><div style={{ color: 'var(--text-3)' }}>{lbl}</div></div>
                      ))}
                    </div>
                    {a.is_reconciled ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="pill pill-teal" style={{ fontSize: 11 }}>✓ Reconciled · {TK(a.collected_amount)}</span>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px' }}
                          title="Edit reconciliation"
                          onClick={() => {
                            setEditAllocTarget(a);
                            setEditAllocForm({ sold_qty: String(a.sold_qty ?? 0), collected_amount: String(a.collected_amount ?? 0) });
                            setEditAllocError('');
                          }}>
                          <Pencil size={12} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="pill pill-amber" style={{ fontSize: 11 }}>Pending EOD</span>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px' }}
                          title="Edit allocation"
                          onClick={() => {
                            setEditPreAllocTarget(a);
                            setEditPreAllocForm({ qty: String(a.qty), sale_price: String(a.sale_price) });
                            setEditPreAllocError('');
                          }}>
                          <Pencil size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sales list */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Sales ({sales.length})</div>
            {sales.length === 0
              ? <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>No sales in this period.</div>
              : (
                <div className="card" style={{ padding: 0 }}>
                  <table className="tbl" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Items</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                        <th style={{ textAlign: 'right' }}>Paid</th>
                        <th style={{ textAlign: 'right' }}>Due</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map(s => (
                        <tr key={s.id}>
                          <td className="dim tiny">{s.sale_date}</td>
                          <td style={{ fontWeight: 600 }}>{s.customer?.name || 'Walk-in'}</td>
                          <td style={{ fontSize: 12 }}>
                            {(s.items || []).map((it, i) => (
                              <span key={i} style={{ display: 'block' }}>{it.cylinder?.name} {it.cylinder?.size} ×{it.qty}</span>
                            ))}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{TK(s.total_amount)}</td>
                          <td style={{ textAlign: 'right', color: 'var(--success)' }}>{TK(s.paid_amount)}</td>
                          <td style={{ textAlign: 'right', color: s.due_amount > 0 ? 'var(--accent)' : 'inherit', fontWeight: s.due_amount > 0 ? 700 : 400 }}>
                            {TK(s.due_amount)}
                          </td>
                          <td><StatusPill status={s.payment_type} /></td>
                          <td>
                            {s.due_amount > 0 && (
                              <button className="btn btn-soft btn-sm"
                                onClick={() => { setPayForm({ amount: s.due_amount, date: todayStr, notes: '' }); setPayTarget(s); setPayError(''); }}>
                                <CreditCard size={13} /> Collect
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </>
      )}

      {/* Allocate modal */}
      {showAllocate && (
        <Modal title={`Allocate Stock — ${sm.name}`} onClose={() => setShowAllocate(false)}>
          {allocError && (
            <div style={{ background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, display: 'flex', gap: 8 }}>
              <AlertCircle size={15} style={{ marginTop: 1 }} />{allocError}
            </div>
          )}
          <form onSubmit={e => {
            e.preventDefault();
            setAllocError('');
            allocateMutation.mutate({
              cylinder_id: parseInt(allocForm.cylinder_id),
              qty:         parseInt(allocForm.qty),
              sale_price:  parseFloat(allocForm.sale_price || 0),
            });
          }}>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Cylinder Type *</label>
              <select className="select" value={allocForm.cylinder_id}
                onChange={e => setAllocForm(f => ({ ...f, cylinder_id: e.target.value, sale_price: '' }))} required>
                <option value="">Select...</option>
                {cylinders.map(c => (
                  <option key={c.id} value={c.id} disabled={(c.stock?.filled_qty || 0) === 0}>
                    {c.name} {c.size} — {c.stock?.filled_qty || 0} available
                    {(c.stock?.filled_qty || 0) === 0 ? ' (out of stock)' : ''}
                  </option>
                ))}
              </select>
              {fifoCost !== null && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>FIFO cost: {TK(fifoCost)}</div>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label className="label">Quantity *</label>
                <input type="number" className="input" min="1" max={selectedCyl?.stock?.filled_qty}
                  value={allocForm.qty} onChange={e => setAllocForm(f => ({ ...f, qty: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Sale Price/pcs *</label>
                <input type="number" className="input" min="0.01" step="0.01"
                  style={isLoss ? { borderColor: 'var(--error)' } : {}}
                  value={allocForm.sale_price} onChange={e => setAllocForm(f => ({ ...f, sale_price: e.target.value }))} required />
                {priceDiff !== null && salePriceNum > 0 && (
                  <div style={{ fontSize: 11, color: isLoss ? 'var(--error)' : 'var(--success)', marginTop: 3 }}>
                    {isLoss ? `⚠ Loss of ${TK(Math.abs(priceDiff))}/pcs` : `+${TK(priceDiff)} profit/pcs`}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAllocate(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={allocateMutation.isPending}>
                {allocateMutation.isPending ? 'Allocating...' : 'Confirm Allocation'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit allocation modal (before EOD) */}
      {editPreAllocTarget && (
        <Modal title={`Edit Allocation — ${editPreAllocTarget.cylinder?.name} ${editPreAllocTarget.cylinder?.size}`} onClose={() => setEditPreAllocTarget(null)}>
          {editPreAllocError && (
            <div style={{ background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, display: 'flex', gap: 8 }}>
              <AlertCircle size={15} style={{ marginTop: 1 }} />{editPreAllocError}
            </div>
          )}
          <div style={{ background: 'var(--primary-soft)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
            <div style={{ display: 'flex', gap: 20 }}>
              <div><strong>{editPreAllocTarget.qty}</strong> <span className="dim">Current qty</span></div>
              <div><strong style={{ color: 'var(--success)' }}>{editPreAllocTarget.sold_qty || 0}</strong> <span className="dim">Already sold (minimum)</span></div>
              <div><strong style={{ color: 'var(--primary)' }}>{TK(editPreAllocTarget.sale_price)}</strong> <span className="dim">Current price</span></div>
            </div>
          </div>
          <form onSubmit={e => {
            e.preventDefault();
            editPreAllocMutation.mutate({
              allocId: editPreAllocTarget.id,
              data: {
                qty:        parseInt(editPreAllocForm.qty),
                sale_price: parseFloat(editPreAllocForm.sale_price),
              },
            });
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label className="label">Qty *</label>
                <input type="number" className="input" min={Math.max(1, editPreAllocTarget.sold_qty || 0)} step="1"
                  value={editPreAllocForm.qty}
                  onChange={e => setEditPreAllocForm(f => ({ ...f, qty: e.target.value }))} required />
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
                  {editPreAllocTarget.sold_qty > 0
                    ? `Min: ${editPreAllocTarget.sold_qty} (${editPreAllocTarget.sold_qty} already sold)`
                    : 'Min: 1'}
                </div>
              </div>
              <div>
                <label className="label">Sale Price/pcs ৳ *</label>
                <input type="number" className="input" min="0.01" step="0.01"
                  value={editPreAllocForm.sale_price}
                  onChange={e => setEditPreAllocForm(f => ({ ...f, sale_price: e.target.value }))} required />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setEditPreAllocTarget(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={editPreAllocMutation.isPending}>
                {editPreAllocMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit reconciliation modal (admin only) */}
      {editAllocTarget && (
        <Modal title={`Edit Reconciliation — ${editAllocTarget.cylinder?.name} ${editAllocTarget.cylinder?.size}`} onClose={() => setEditAllocTarget(null)}>
          <div style={{ background: '#FFF8E1', border: '1px solid #FF9500', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#A85200', display: 'flex', gap: 8 }}>
            <AlertCircle size={15} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>Admin edit — changes will adjust warehouse stock accordingly.</span>
          </div>
          {editAllocError && (
            <div style={{ background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, display: 'flex', gap: 8 }}>
              <AlertCircle size={15} style={{ marginTop: 1 }} />{editAllocError}
            </div>
          )}
          <div style={{ background: 'var(--primary-soft)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
            <div style={{ display: 'flex', gap: 20 }}>
              <div><strong>{editAllocTarget.qty}</strong> <span className="dim">Allocated</span></div>
              <div><strong style={{ color: 'var(--success)' }}>{editAllocTarget.sold_qty}</strong> <span className="dim">Currently sold</span></div>
              <div><strong style={{ color: 'var(--warning)' }}>{editAllocTarget.returned_qty}</strong> <span className="dim">Returned</span></div>
            </div>
          </div>
          <form onSubmit={e => {
            e.preventDefault();
            const soldVal = parseInt(editAllocForm.sold_qty) || 0;
            editReconcileMutation.mutate({
              allocId: editAllocTarget.id,
              data: { sold_qty: soldVal, collected_amount: parseFloat(editAllocForm.collected_amount) || 0 },
            });
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label className="label">Sold Qty *</label>
                <input type="number" className="input" min="0" max={editAllocTarget.qty}
                  value={editAllocForm.sold_qty}
                  onChange={e => {
                    const qty  = parseInt(e.target.value) || 0;
                    const cash = qty * parseFloat(editAllocTarget.sale_price || 0);
                    setEditAllocForm(f => ({ ...f, sold_qty: e.target.value, collected_amount: String(cash) }));
                  }} required />
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>Max: {editAllocTarget.qty}</div>
              </div>
              <div>
                <label className="label">Cash Collected ৳ *</label>
                <input type="number" className="input" min="0" step="0.01"
                  value={editAllocForm.collected_amount}
                  onChange={e => setEditAllocForm(f => ({ ...f, collected_amount: e.target.value }))} required />
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
                  Expected: {TK((parseInt(editAllocForm.sold_qty)||0) * parseFloat(editAllocTarget.sale_price||0))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setEditAllocTarget(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={editReconcileMutation.isPending}>
                {editReconcileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Collect payment modal */}
      {payTarget && (
        <Modal title={`Collect Payment — ${payTarget.customer?.name || 'Walk-in'}`} onClose={() => setPayTarget(null)}>
          {payError && (
            <div style={{ background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, display: 'flex', gap: 8 }}>
              <AlertCircle size={15} style={{ marginTop: 1 }} />{payError}
            </div>
          )}
          <div style={{ background: 'var(--primary-soft)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>Total</span><strong>{TK(payTarget.total_amount)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>Paid</span><strong style={{ color: 'var(--success)' }}>{TK(payTarget.paid_amount)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
              <span>Remaining</span><span style={{ color: 'var(--accent)' }}>{TK(payTarget.due_amount)}</span>
            </div>
          </div>
          <form onSubmit={e => {
            e.preventDefault();
            payMutation.mutate({ sid: payTarget.id, data: payForm });
          }}>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Amount *</label>
              <input type="number" className="input" min="0.01" step="0.01" max={payTarget.due_amount}
                value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Date *</label>
              <input type="date" className="input" max={todayStr}
                value={payForm.date} onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="label">Notes</label>
              <input className="input" value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setPayTarget(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={payMutation.isPending}>
                {payMutation.isPending ? 'Saving...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
