import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { salesmanService } from '../services/salesmanService';
import { saleService } from '../services/saleService';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip,
} from 'recharts';
import { TrendingUp, DollarSign, ShoppingCart, AlertCircle, Download, Package, RotateCcw } from 'lucide-react';

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

  const { data: flowData } = useQuery({
    queryKey: ['my-cylinder-flow', user?.id, from, to],
    queryFn:  () => salesmanService.getCylinderFlow(user.id, from, to),
    enabled:  !!user?.id && !!from && !!to,
  });

  const report   = reportData?.data;
  const sales    = salesData?.data   || [];
  const flow     = flowData?.data;
  const flowCyls = flow?.by_cylinder || [];

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

      {/* Cylinder Flow section */}
      <div className="card" style={{ padding: 0, marginBottom: 20 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-soft)' }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Cylinder Flow</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Allocated → Sold → Returned (unsold) + Empties collected</div>
        </div>

        {/* Mini KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0, borderBottom: '1px solid var(--border-soft)' }}>
          {[
            { label: 'Allocated',       value: flow?.summary?.total_allocated        ?? 0, color: '#0B6E75' },
            { label: 'Sold',            value: flow?.summary?.total_sold             ?? 0, color: '#176B3A' },
            { label: 'Returned Unsold', value: flow?.summary?.total_returned_unsold  ?? 0, color: '#A85200' },
            { label: 'With You',        value: flow?.summary?.total_with_salesman    ?? 0, color: '#5B2D8E' },
            { label: 'Empties Back',    value: flow?.summary?.total_empties_collected?? 0, color: '#1D6FD1' },
          ].map(({ label, value, color }, i) => (
            <div key={label} style={{ textAlign: 'center', padding: '14px 8px', borderRight: i < 4 ? '1px solid var(--border-soft)' : undefined }}>
              <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Per cylinder */}
        {flowCyls.length > 0 && (
          <table className="tbl" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Cylinder</th>
                <th style={{ textAlign: 'center' }}>Allocated</th>
                <th style={{ textAlign: 'center' }}>Sold</th>
                <th style={{ textAlign: 'center' }}>Returned Unsold</th>
                <th style={{ textAlign: 'center' }}>Empties Collected</th>
              </tr>
            </thead>
            <tbody>
              {flowCyls.map(r => (
                <tr key={r.cylinder_id}>
                  <td style={{ fontWeight: 600 }}>{r.cylinder_name} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>{r.cylinder_size}</span></td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.allocated}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#176B3A' }}>{r.sold}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#A85200' }}>{r.returned_unsold}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#1D6FD1' }}>{r.empties_collected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
