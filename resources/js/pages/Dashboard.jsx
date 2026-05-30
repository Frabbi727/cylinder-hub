import React from 'react';
import { useDashboard } from '../hooks/useDashboard';
import StatCard    from '../components/ui/StatCard';
import MiniBars    from '../components/ui/MiniBars';
import StatusPill  from '../components/ui/StatusPill';
import CylCell     from '../components/ui/CylCell';
import StockBar    from '../components/ui/StockBar';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  TrendingUp, Package, Users, CreditCard, ShoppingCart, BarChart2
} from 'lucide-react';

const TK = (n) => '৳' + Number(n || 0).toLocaleString('en-US');
const hour = new Date().getHours();
const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

export default function Dashboard() {
  const { summary, weeklyChart, recentSales, liveStock, isLoading } = useDashboard();

  if (isLoading) return <LoadingSpinner text="Loading dashboard..." />;

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          {greeting}, {summary.today_sales_count !== undefined ? 'Admin' : '...'}
        </h2>
        <p className="dim" style={{ margin: '4px 0 0' }}>
          Here's what's happening today
        </p>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <StatCard
          icon={ShoppingCart} tone="primary"
          label="Today's Sales" value={TK(summary.today_sales_amount)}
          foot={`${summary.today_sales_count || 0} transactions`}
        />
        <StatCard
          icon={TrendingUp} tone="success"
          label="Today's Profit" value={TK(summary.today_profit)}
          foot="FIFO basis"
        />
        <StatCard
          icon={Package} tone="warning"
          label="Filled Stock" value={`${summary.total_filled_stock || 0} pcs`}
          foot="across all types"
        />
        <StatCard
          icon={CreditCard} tone="coral"
          label="Customer Due" value={TK(summary.customer_due)}
          foot="total receivable"
        />
      </div>

      {/* Chart + Stock panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, marginBottom: 24 }}>
        {/* Weekly chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div className="section-title" style={{ marginBottom: 2 }}>Sales This Week</div>
              <div className="dim tiny">Daily revenue trend</div>
            </div>
            <BarChart2 size={18} style={{ color: 'var(--text-3)' }} />
          </div>
          {weeklyChart.length > 0
            ? <MiniBars data={weeklyChart} />
            : <div className="dim tiny" style={{ textAlign: 'center', padding: 40 }}>No sales data yet</div>
          }
        </div>

        {/* Live stock */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>Live Stock</div>
          {liveStock.length === 0 && <div className="dim tiny">No stock data</div>}
          {liveStock.map((s) => (
            <div key={s.cylinder_id} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <CylCell cylinder={s} />
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.filled_qty} filled</div>
                  <div className="dim tiny">{s.empty_qty} empty</div>
                </div>
              </div>
              <StockBar filled={s.filled_qty} empty={s.empty_qty} capacity={s.capacity} />
            </div>
          ))}
        </div>
      </div>

      {/* Recent Sales + Money Snapshot */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        {/* Recent sales */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>Recent Sales</div>
          {recentSales.length === 0 && <div className="dim tiny" style={{ textAlign:'center', padding: 40 }}>No sales yet today</div>}
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Cylinder</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Salesman</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((s) => (
                  <tr key={s.id}>
                    <td>{s.customer?.name || 'Walk-in'}</td>
                    <td>
                      {s.items?.map((it, i) => (
                        <span key={i} className="dim tiny">{it.cylinder?.name} {it.cylinder?.size} ×{it.qty} </span>
                      ))}
                    </td>
                    <td style={{ fontWeight: 600 }}>{TK(s.total_amount)}</td>
                    <td><StatusPill status={s.payment_type} /></td>
                    <td className="dim">{s.salesman?.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Money snapshot */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>Money Snapshot</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>Customer Due</div>
                <div className="dim tiny">To collect</div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{TK(summary.customer_due)}</div>
            </div>
            <div style={{ borderTop: '1px solid var(--border-soft)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>Supplier Due</div>
                <div className="dim tiny">To pay</div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--warning)' }}>{TK(summary.supplier_due)}</div>
            </div>
            <div style={{ borderTop: '1px solid var(--border-soft)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>Monthly Expenses</div>
                <div className="dim tiny">This month</div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{TK(summary.monthly_expenses)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
