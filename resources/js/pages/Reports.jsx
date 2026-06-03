import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { salesmanService } from '../services/salesmanService';
import { saleService } from '../services/saleService';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, Legend,
} from 'recharts';
import { TrendingUp, DollarSign, ShoppingCart, AlertCircle, Download } from 'lucide-react';

const TK    = (n) => '৳' + Number(n || 0).toLocaleString('en-US');
const PCT   = (n) => (n * 100).toFixed(1) + '%';
const today = new Date().toISOString().split('T')[0];
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

const PERIODS = [
  { key: 'today',  label: 'Today',      from: today,      to: today },
  { key: 'week',   label: 'This Week',  from: (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split('T')[0]; })(), to: today },
  { key: 'month',  label: 'This Month', from: monthStart, to: today },
  { key: 'custom', label: 'Custom' },
];

const PIE_COLORS = { cash: '#176B3A', partial: '#A85200', due: '#B83030' };

export default function Reports() {
  const { user } = useAuth();
  const [period, setPeriod]     = useState('month');
  const [customFrom, setFrom]   = useState(monthStart);
  const [customTo, setTo]       = useState(today);

  const activePeriod = PERIODS.find(p => p.key === period);
  const from = period === 'custom' ? customFrom : activePeriod?.from;
  const to   = period === 'custom' ? customTo   : activePeriod?.to;

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['salesman-report', user?.id, from, to],
    queryFn:  () => salesmanService.getReport(user.id, from, to),
    enabled:  !!user?.id && !!from && !!to,
  });

  const { data: salesData } = useQuery({
    queryKey: ['sales-period', from, to],
    queryFn:  () => saleService.getAll({ from, to }),
    enabled:  !!from && !!to,
  });

  const report = reportData?.data;
  const sales  = salesData?.data || [];

  // Payment type breakdown for pie chart
  const payBreakdown = sales.reduce((acc, s) => {
    const type = s.payment_type || 'due';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(payBreakdown).map(([name, value]) => ({ name, value }));

  // Daily revenue for bar chart (group by date)
  const dailyRevenue = sales.reduce((acc, s) => {
    const d = s.sale_date;
    acc[d] = (acc[d] || 0) + parseFloat(s.total_amount || 0);
    return acc;
  }, {});
  const barData = Object.entries(dailyRevenue)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date: date.slice(5), revenue }));

  const exportCSV = () => {
    const rows = [['Date', 'Customer', 'Total', 'Paid', 'Due', 'Type']];
    sales.forEach(s => rows.push([s.sale_date, s.customer?.name || 'Walk-in', s.total_amount, s.paid_amount, s.due_amount, s.payment_type]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv);
    a.download = `report-${from}-${to}.csv`; a.click();
  };

  if (isLoading) return <LoadingSpinner text="Loading report..." />;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>My Reports</h2>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>Personal performance overview</div>
        </div>
        <button className="btn btn-soft btn-sm" onClick={exportCSV}>
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Period selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {PERIODS.map(p => (
          <button key={p.key} className={`tab-btn${period === p.key ? ' active' : ''}`} onClick={() => setPeriod(p.key)}>
            {p.label}
          </button>
        ))}
        {period === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
            <input type="date" className="input" style={{ width: 145 }} value={customFrom} onChange={e => setFrom(e.target.value)} />
            <span style={{ color: 'var(--text-3)' }}>→</span>
            <input type="date" className="input" style={{ width: 145 }} value={customTo} onChange={e => setTo(e.target.value)} />
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Revenue', value: TK(report?.total_revenue), icon: DollarSign, color: '#0B6E75' },
          { label: 'Units Sold', value: `${report?.total_sold || 0} pcs`, icon: ShoppingCart, color: '#176B3A' },
          { label: 'Cash Collected', value: TK(report?.total_cash_collected), icon: TrendingUp, color: '#A85200' },
          { label: 'Outstanding', value: TK(report?.still_outstanding), icon: AlertCircle, color: '#B83030' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)' }}>{value || '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, marginBottom: 20 }}>
        {/* Bar chart */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Daily Sales Revenue</div>
          {barData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No sales data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => '৳' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                <Tooltip formatter={v => TK(v)} />
                <Bar dataKey="revenue" fill="#0B6E75" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Payment Types</div>
          {pieData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={PIE_COLORS[entry.name] || '#667085'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pieData.map(({ name, value }) => (
                  <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: PIE_COLORS[name] || '#667085' }} />
                      <span style={{ textTransform: 'capitalize' }}>{name}</span>
                    </div>
                    <span style={{ fontWeight: 700 }}>{value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Summary stats */}
      {report && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Performance Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
            {[
              { label: 'Total Allocated', value: `${report.total_allocated} pcs` },
              { label: 'Total Sold', value: `${report.total_sold} pcs` },
              { label: 'Total Returned', value: `${report.total_returned} pcs` },
              { label: 'Sell-through', value: PCT(report.sell_through_rate || 0) },
              { label: 'Dues Created', value: TK(report.total_dues_created) },
              { label: 'Dues Collected', value: TK(report.total_dues_collected) },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-soft)' }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sales table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-soft)', fontWeight: 700, fontSize: 14 }}>
          Sales in Period ({sales.length})
        </div>
        {sales.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No sales in this period</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>Paid</th>
                  <th style={{ textAlign: 'right' }}>Due</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{s.sale_date}</td>
                    <td style={{ fontWeight: 600 }}>{s.customer?.name || 'Walk-in'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{TK(s.total_amount)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--success)' }}>{TK(s.paid_amount)}</td>
                    <td style={{ textAlign: 'right', color: s.due_amount > 0 ? '#B83030' : undefined, fontWeight: s.due_amount > 0 ? 700 : 400 }}>
                      {TK(s.due_amount)}
                    </td>
                    <td>
                      <span className={`pill ${s.payment_type === 'cash' ? 'pill-green' : s.payment_type === 'partial' ? 'pill-amber' : 'pill-coral'}`} style={{ fontSize: 11 }}>
                        {s.payment_type?.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
