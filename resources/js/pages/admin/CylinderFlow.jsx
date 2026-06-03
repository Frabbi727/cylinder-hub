import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '../../services/reportService';
import { salesmanService } from '../../services/salesmanService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Download, TrendingDown, TrendingUp, Package, RotateCcw } from 'lucide-react';

const todayStr     = new Date().toISOString().split('T')[0];
const weekStart    = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().split('T')[0]; })();
const monthStart   = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

const PERIODS = [
  { key: 'today',  label: 'Today' },
  { key: 'week',   label: 'This Week' },
  { key: 'month',  label: 'This Month' },
  { key: 'custom', label: 'Custom' },
];

function FlowBar({ sold, returnedUnsold, withSalesman, allocated }) {
  if (!allocated) return <div style={{ height: 8, background: 'var(--border-soft)', borderRadius: 4 }} />;
  const soldPct   = Math.round(sold / allocated * 100);
  const retPct    = Math.round(returnedUnsold / allocated * 100);
  const withPct   = Math.round(withSalesman / allocated * 100);
  return (
    <div style={{ height: 8, background: 'var(--border-soft)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
      <div title={`Sold: ${soldPct}%`}  style={{ width: `${soldPct}%`,  background: '#176B3A', height: '100%' }} />
      <div title={`Returned: ${retPct}%`} style={{ width: `${retPct}%`, background: '#A85200', height: '100%' }} />
      <div title={`With salesman: ${withPct}%`} style={{ width: `${withPct}%`, background: '#0B6E75', height: '100%' }} />
    </div>
  );
}

function SummaryCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function CylinderFlow() {
  const [period, setPeriod]   = useState('today');
  const [from, setFrom]       = useState(todayStr);
  const [to, setTo]           = useState(todayStr);
  const [salesmanFilter, setSalesmanFilter] = useState('');

  const { data: flowData, isLoading } = useQuery({
    queryKey: ['cylinder-flow', period, from, to, salesmanFilter],
    queryFn:  () => reportService.cylinderFlow(
      period === 'custom' ? undefined : period,
      period === 'custom' ? from : undefined,
      period === 'custom' ? to   : undefined,
      salesmanFilter || undefined
    ),
  });

  const { data: salesmenData } = useQuery({
    queryKey: ['salesmen-list'],
    queryFn:  () => salesmanService.getAll(),
  });

  const flow      = flowData?.data;
  const summary   = flow?.summary   || {};
  const bySalesman= flow?.by_salesman || [];
  const byCylinder= flow?.by_cylinder || [];
  const salesmen  = Array.isArray(salesmenData) ? salesmenData : [];

  const exportCSV = () => {
    const rows = [['Salesman', 'Allocated', 'Sold', 'Returned Unsold', 'With Salesman', 'Empties Collected', 'Sell-through %']];
    bySalesman.forEach(r => rows.push([r.salesman_name, r.allocated, r.sold, r.returned_unsold, r.with_salesman, r.empties_collected, r.sell_through_rate + '%']));
    rows.push([]);
    rows.push(['Cylinder', 'Allocated', 'Sold', 'Returned Unsold', 'With Salesmen', 'Empties Collected']);
    byCylinder.forEach(r => rows.push([`${r.cylinder_name} ${r.cylinder_size}`, r.allocated, r.sold, r.returned_unsold, r.with_salesmen, r.empties_collected]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv);
    a.download = `cylinder-flow-${todayStr}.csv`; a.click();
  };

  if (isLoading) return <LoadingSpinner text="Loading cylinder flow..." />;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Cylinder Flow</h2>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
            Allocated → Sold → Returned · Empty collections tracker
          </div>
        </div>
        <button className="btn btn-soft btn-sm" onClick={exportCSV}>
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Period + salesman filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {PERIODS.map(p => (
          <button key={p.key} className={`tab-btn${period === p.key ? ' active' : ''}`} onClick={() => setPeriod(p.key)}>
            {p.label}
          </button>
        ))}
        {period === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="date" className="input" style={{ width: 145 }} value={from} onChange={e => setFrom(e.target.value)} />
            <span style={{ color: 'var(--text-3)' }}>→</span>
            <input type="date" className="input" style={{ width: 145 }} value={to} onChange={e => setTo(e.target.value)} />
          </div>
        )}
        <select className="select" style={{ width: 'auto', minWidth: 160 }} value={salesmanFilter} onChange={e => setSalesmanFilter(e.target.value)}>
          <option value="">All Salesmen</option>
          {salesmen.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Summary KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12, marginBottom: 24 }}>
        <SummaryCard icon={Package}     label="Total Allocated"        value={summary.total_allocated ?? 0}        sub="Cylinders sent out"         color="#0B6E75" />
        <SummaryCard icon={TrendingDown} label="Total Sold"            value={summary.total_sold ?? 0}             sub="Cylinders sold to customers" color="#176B3A" />
        <SummaryCard icon={TrendingUp}   label="Returned Unsold"       value={summary.total_returned_unsold ?? 0}  sub="Back to filled stock"        color="#A85200" />
        <SummaryCard icon={Package}      label="Still With Salesmen"   value={summary.total_with_salesman ?? 0}    sub="Not yet sold or returned"    color="#5B2D8E" />
        <SummaryCard icon={RotateCcw}    label="Empties Collected"     value={summary.total_empties_collected ?? 0} sub={`${summary.total_empties_normal ?? 0} normal · ${summary.total_empties_extra ?? 0} extra`} color="#1D6FD1" />
      </div>

      {/* Flow legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 12, flexWrap: 'wrap' }}>
        {[['#176B3A','Sold'],['#A85200','Returned Unsold'],['#0B6E75','With Salesman']].map(([c,l]) => (
          <span key={l} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:10, height:10, borderRadius:2, background:c, flexShrink:0 }} />
            {l}
          </span>
        ))}
      </div>

      {/* Per-salesman table */}
      <div className="card" style={{ padding: 0, marginBottom: 20 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-soft)', fontWeight: 700, fontSize: 15 }}>
          By Salesman
        </div>
        {bySalesman.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>No allocation data for this period.</div>
        ) : (
          <table className="tbl" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Salesman</th>
                <th style={{ textAlign: 'center' }}>Allocated</th>
                <th style={{ textAlign: 'center' }}>Sold</th>
                <th style={{ textAlign: 'center' }}>Returned (Unsold)</th>
                <th style={{ textAlign: 'center' }}>With Salesman</th>
                <th style={{ textAlign: 'center' }}>Empties Collected</th>
                <th style={{ textAlign: 'center' }}>Sell-through</th>
                <th style={{ minWidth: 120 }}>Flow</th>
              </tr>
            </thead>
            <tbody>
              {bySalesman.map(r => (
                <tr key={r.salesman_id}>
                  <td style={{ fontWeight: 600 }}>{r.salesman_name}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.allocated}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#176B3A' }}>{r.sold}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#A85200' }}>{r.returned_unsold}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: r.with_salesman > 0 ? '#5B2D8E' : 'var(--text-3)' }}>{r.with_salesman}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#1D6FD1' }}>{r.empties_collected}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontWeight: 700, color: r.sell_through_rate >= 90 ? '#176B3A' : r.sell_through_rate >= 60 ? '#A85200' : '#B83030' }}>
                      {r.sell_through_rate}%
                    </span>
                  </td>
                  <td style={{ minWidth: 120 }}>
                    <FlowBar sold={r.sold} returnedUnsold={r.returned_unsold} withSalesman={r.with_salesman} allocated={r.allocated} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--bg)', fontWeight: 700 }}>
                <td style={{ padding: '10px 16px', fontSize: 13 }}>Total</td>
                <td style={{ textAlign: 'center', padding: '10px 16px' }}>{summary.total_allocated ?? 0}</td>
                <td style={{ textAlign: 'center', padding: '10px 16px', color: '#176B3A' }}>{summary.total_sold ?? 0}</td>
                <td style={{ textAlign: 'center', padding: '10px 16px', color: '#A85200' }}>{summary.total_returned_unsold ?? 0}</td>
                <td style={{ textAlign: 'center', padding: '10px 16px', color: '#5B2D8E' }}>{summary.total_with_salesman ?? 0}</td>
                <td style={{ textAlign: 'center', padding: '10px 16px', color: '#1D6FD1' }}>{summary.total_empties_collected ?? 0}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Per-cylinder table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-soft)', fontWeight: 700, fontSize: 15 }}>
          By Cylinder Type
        </div>
        {byCylinder.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>No data for this period.</div>
        ) : (
          <table className="tbl" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Cylinder</th>
                <th style={{ textAlign: 'center' }}>Allocated</th>
                <th style={{ textAlign: 'center' }}>Sold</th>
                <th style={{ textAlign: 'center' }}>Returned (Unsold)</th>
                <th style={{ textAlign: 'center' }}>With Salesmen</th>
                <th style={{ textAlign: 'center' }}>Empties Collected</th>
                <th style={{ minWidth: 120 }}>Flow</th>
              </tr>
            </thead>
            <tbody>
              {byCylinder.map(r => (
                <tr key={r.cylinder_id}>
                  <td style={{ fontWeight: 600 }}>{r.cylinder_name} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>{r.cylinder_size}</span></td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.allocated}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#176B3A' }}>{r.sold}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#A85200' }}>{r.returned_unsold}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: r.with_salesmen > 0 ? '#5B2D8E' : 'var(--text-3)' }}>{r.with_salesmen}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#1D6FD1' }}>{r.empties_collected}</td>
                  <td>
                    <FlowBar sold={r.sold} returnedUnsold={r.returned_unsold} withSalesman={r.with_salesmen} allocated={r.allocated} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
