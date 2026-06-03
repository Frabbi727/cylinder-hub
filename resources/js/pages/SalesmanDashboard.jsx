import React, { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { salesmanService } from '../services/salesmanService';
import { saleService } from '../services/saleService';
import CylBadge from '../components/ui/CylBadge';
import StatusPill from '../components/ui/StatusPill';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  LayoutDashboard, TrendingUp, DollarSign, AlertCircle,
  ShoppingCart, ChevronRight, Package, Moon,
} from 'lucide-react';

const TK = (n) => '৳' + Number(n || 0).toLocaleString('en-US');
const fmtTime = (dt) => {
  if (!dt) return '';
  try { return new Date(dt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }); }
  catch { return ''; }
};

function StatCard4({ icon: Icon, label, value, sub, tone }) {
  const tones = {
    primary: { bg: '#E6F0F1', color: '#0E484D' },
    success: { bg: '#E6F8EC', color: '#176B3A' },
    warning: { bg: '#FFF1DD', color: '#A85200' },
    danger:  { bg: '#FFE5E3', color: '#B83030' },
  };
  const t = tones[tone] || tones.primary;
  return (
    <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={22} color={t.color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function SalesmanDashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const { data: myData, isLoading } = useQuery({
    queryKey: ['my-allocations', user?.id],
    queryFn:  () => salesmanService.getById(user.id),
    enabled:  !!user?.id,
    refetchInterval: 30_000,
  });

  const { data: duesData } = useQuery({
    queryKey: ['sales-dues'],
    queryFn:  () => saleService.getAll({ has_due: true }),
    enabled:  !!user?.id,
  });

  const salesman   = myData?.data?.salesman;
  const todaySales = myData?.data?.today_sales || [];
  const allocations= salesman?.allocations || [];

  const totalDues   = (duesData?.data || []).reduce((s, x) => s + parseFloat(x.due_amount || 0), 0);
  const duesCount   = (duesData?.data || []).length;

  const stats = useMemo(() => {
    const totalAllocated  = allocations.reduce((s, a) => s + (a.qty || 0), 0);
    const totalSold       = allocations.reduce((s, a) => s + (a.sold_qty || 0), 0);
    const cashCollected   = todaySales.reduce((s, x) => s + parseFloat(x.paid_amount || 0), 0);
    return { totalAllocated, totalSold, cashCollected };
  }, [allocations, todaySales]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const needsReconcile = allocations.some(a => !a.is_reconciled);
  const lateHour = new Date().getHours() >= 19;

  if (isLoading) return <LoadingSpinner text="Loading your day..." />;

  return (
    <div>
      {/* Reconciliation alert */}
      {needsReconcile && lateHour && (
        <div style={{ background: '#FFF1DD', border: '1px solid #FF9500', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#A85200' }}>
          <AlertCircle size={16} />
          <span><strong>Reminder:</strong> You have unreconciled allocations. Please complete End of Day before midnight.</span>
          <button className="btn btn-soft btn-sm" style={{ marginLeft: 'auto' }} onClick={() => navigate('/eod')}>
            <Moon size={13} /> End of Day
          </button>
        </div>
      )}

      {/* Greeting */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{greeting}, {salesman?.name || user?.name} 👋</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--text-3)', fontSize: 13 }}>{today}</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard4 icon={Package}      label="Total Allocated" value={`${stats.totalAllocated} pcs`} sub="Today's load"         tone="primary" />
        <StatCard4 icon={ShoppingCart} label="Total Sold"      value={`${stats.totalSold} pcs`}      sub="From today's sales"   tone="success" />
        <StatCard4 icon={DollarSign}   label="Cash Collected"  value={TK(stats.cashCollected)}        sub="Today's payments"     tone="warning" />
        <StatCard4 icon={AlertCircle}  label="Outstanding Dues" value={TK(totalDues)}                sub={`${duesCount} sales due`} tone="danger" />
      </div>

      {/* Today's allocations */}
      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Today's Allocations</div>
          <Link to="/eod" style={{ fontSize: 12, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
            End of Day <ChevronRight size={13} />
          </Link>
        </div>

        {allocations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)', fontSize: 13 }}>
            No cylinders allocated today. Contact your admin.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {allocations.map(a => {
              const remaining = Math.max(0, a.qty - (a.sold_qty || 0) - (a.returned_qty || 0));
              const soldPct   = a.qty > 0 ? Math.round((a.sold_qty || 0) / a.qty * 100) : 0;
              return (
                <div key={a.id} style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, border: a.is_reconciled ? '1px solid var(--success)' : '1px solid var(--border-soft)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    {a.cylinder && <CylBadge cylinder={a.cylinder} size="sm" />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{a.cylinder?.name} {a.cylinder?.size}</div>
                      <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>{TK(a.sale_price)}/pcs</div>
                    </div>
                    {a.is_reconciled ? (
                      <span className="pill pill-teal" style={{ fontSize: 11 }}>✓ Done</span>
                    ) : (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: remaining === 0 ? 'var(--success)' : 'var(--text-1)' }}>{remaining}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)' }}>left</div>
                      </div>
                    )}
                  </div>
                  <div style={{ background: 'var(--border-soft)', borderRadius: 4, height: 5, marginBottom: 10, overflow: 'hidden' }}>
                    <div style={{ width: `${soldPct}%`, height: '100%', background: 'var(--success)', transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', fontSize: 11, textAlign: 'center' }}>
                    {[[a.qty, 'Alloc', 'var(--text-1)'], [a.sold_qty || 0, 'Sold', 'var(--success)'], [a.returned_qty || 0, 'Ret.', 'var(--warning)'], [remaining, 'With You', 'var(--primary)']].map(([v, l, c]) => (
                      <div key={l}>
                        <div style={{ fontWeight: 700, color: c, fontSize: 14 }}>{v}</div>
                        <div style={{ color: 'var(--text-3)', marginTop: 1 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Today's sales + dues summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginBottom: 20 }}>
        {/* Recent sales */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Today's Sales</div>
            <Link to="/sales" style={{ fontSize: 12, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
              See All <ChevronRight size={13} />
            </Link>
          </div>
          {todaySales.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-3)', fontSize: 13 }}>
              No sales recorded yet today.{' '}
              <Link to="/sales/new" style={{ color: 'var(--primary)', fontWeight: 600 }}>Record one →</Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {todaySales.slice(0, 5).map(s => (
                    <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/sales/${s.id}`)}>
                      <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{fmtTime(s.created_at)}</td>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{s.customer?.name || 'Walk-in'}</td>
                      <td style={{ fontSize: 12 }}>
                        {(s.items || []).map((it, i) => (
                          <span key={i} style={{ display: 'block', color: 'var(--text-2)' }}>{it.cylinder?.name} ×{it.qty}</span>
                        ))}
                      </td>
                      <td style={{ fontWeight: 700, fontSize: 13, textAlign: 'right' }}>{TK(s.total_amount)}</td>
                      <td><StatusPill status={s.payment_type} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Outstanding dues */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Outstanding Dues</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#B83030', marginBottom: 4 }}>{TK(totalDues)}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>{duesCount} sale{duesCount !== 1 ? 's' : ''} unpaid</div>
            <Link to="/dues" className="btn btn-outline btn-sm" style={{ display: 'flex', justifyContent: 'center', textDecoration: 'none' }}>
              View Collection List
            </Link>
          </div>

          {/* Quick actions */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to="/sales/new" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', justifyContent: 'center' }}>
                + New Sale
              </Link>
              <Link to="/empties" className="btn btn-soft btn-sm" style={{ textDecoration: 'none', justifyContent: 'center' }}>
                Log Empty Return
              </Link>
              <Link to="/eod" className="btn btn-soft btn-sm" style={{ textDecoration: 'none', justifyContent: 'center' }}>
                End of Day
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
