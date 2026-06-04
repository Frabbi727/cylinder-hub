import React from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '../services/reportService';
import StatCard    from '../components/ui/StatCard';
import MiniBars    from '../components/ui/MiniBars';
import StatusPill  from '../components/ui/StatusPill';
import CylCell     from '../components/ui/CylCell';
import StockBar    from '../components/ui/StockBar';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { TrendingUp, Package, CreditCard, ShoppingCart, BarChart2, TrendingDown } from 'lucide-react';

const TK = (n) => '৳' + Number(n || 0).toLocaleString('en-US');

export default function Dashboard() {
  const { t } = useTranslation();
  const {
    summary, weeklyChart, recentSales, liveStock, isLoading,
    period, setPeriod, customFrom, setCustomFrom, customTo, setCustomTo,
  } = useDashboard();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dashboard.greetingMorning')
    : hour < 17 ? t('dashboard.greetingAfternoon')
    : t('dashboard.greetingEvening');

  const pnlParams = period === 'custom'
    ? [undefined, customFrom, customTo]
    : [period, undefined, undefined];

  const { data: pnlData } = useQuery({
    queryKey: ['dashboard-pnl', period, customFrom, customTo],
    queryFn:  () => reportService.pnl(...pnlParams),
    enabled:  period !== 'custom' || (!!customFrom && !!customTo),
    refetchInterval: 60_000,
  });
  const pnl = pnlData?.data ?? {};

  const PERIODS = ['today', 'week', 'month', 'custom'];
  const PERIOD_BTN_LABELS = {
    today:  t('common.today'),
    week:   t('common.thisWeek'),
    month:  t('common.thisMonth'),
    custom: t('common.custom'),
  };
  const periodLabel = {
    today:  t('common.today'),
    week:   t('common.thisWeek'),
    month:  t('common.thisMonth'),
    custom: `${customFrom} – ${customTo}`,
  }[period] || t('common.today');

  if (isLoading) return <LoadingSpinner text={t('common.loading')} />;

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          {greeting}, {summary.today_sales_count !== undefined ? 'Admin' : '...'}
        </h2>
        <p className="dim" style={{ margin: '4px 0 0' }}>{t('dashboard.subtitle')}</p>
      </div>

      {/* Period selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {PERIODS.map(p => (
          <button key={p} className={`tab-btn${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>
            {PERIOD_BTN_LABELS[p]}
          </button>
        ))}
        {period === 'custom' && (
          <>
            <input type="date" className="input" style={{ width: 145, marginLeft: 8 }}
              value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            <span className="dim" style={{ padding: '0 4px' }}>→</span>
            <input type="date" className="input" style={{ width: 145 }}
              value={customTo} onChange={e => setCustomTo(e.target.value)} />
          </>
        )}
      </div>

      {/* Stat Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <StatCard
          icon={ShoppingCart} tone="primary"
          label={`${periodLabel} ${t('dashboard.todaySales')}`}
          value={TK(summary.today_sales_amount)}
          foot={`${summary.today_sales_count || 0} ${t('dashboard.transactions')}`}
        />
        <StatCard
          icon={TrendingUp} tone="success"
          label={`${periodLabel} ${t('dashboard.todayProfit')}`}
          value={TK(summary.today_profit)}
          foot={t('dashboard.fifoBasis')}
        />
        <StatCard
          icon={Package} tone="warning"
          label={t('dashboard.filledStock')}
          value={`${summary.total_filled_stock || 0} ${t('common.pcs')}`}
          foot={t('dashboard.acrossAllTypes')}
        />
        <StatCard
          icon={CreditCard} tone="coral"
          label={t('dashboard.customerDue')}
          value={TK(summary.customer_due)}
          foot={t('dashboard.totalReceivable')}
        />
      </div>

      {/* Profit & Loss */}
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div className="section-title" style={{ marginBottom: 2 }}>Profit & Loss</div>
            <div className="dim tiny">{periodLabel} · FIFO basis</div>
          </div>
          {pnl.net_profit !== undefined && (
            <div style={{
              padding: '4px 14px', borderRadius: 20, fontWeight: 700, fontSize: 13,
              background: pnl.net_profit >= 0 ? '#E6F8EC' : '#FEF2F2',
              color:      pnl.net_profit >= 0 ? '#176B3A'  : '#B83030',
            }}>
              {pnl.net_profit >= 0 ? '▲ Profit' : '▼ Loss'}
            </div>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {[
            { label: 'Revenue',       value: TK(pnl.total_revenue),  color: 'var(--primary)', sub: '100%' },
            { label: 'Cost of Goods', value: TK(pnl.total_cogs),     color: '#A85200',        sub: pnl.total_revenue > 0 ? `${((pnl.total_cogs / pnl.total_revenue) * 100).toFixed(1)}%` : '—' },
            { label: 'Gross Profit',  value: TK(pnl.gross_profit),   color: pnl.gross_profit  >= 0 ? '#176B3A' : '#B83030', sub: `${pnl.gross_margin_pct ?? 0}%` },
            { label: 'Expenses',      value: TK(pnl.total_expenses), color: '#B83030',        sub: 'All categories' },
            { label: 'Net Profit',    value: TK(pnl.net_profit),     color: pnl.net_profit    >= 0 ? '#176B3A' : '#B83030', sub: `${pnl.net_margin_pct ?? 0}%` },
          ].map(({ label, value, color, sub }) => (
            <div key={label} style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 17, fontWeight: 800, color }}>{value ?? '—'}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', marginTop: 3 }}>{label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart + Stock */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, marginBottom: 24 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div className="section-title" style={{ marginBottom: 2 }}>{t('dashboard.salesThisWeek')}</div>
              <div className="dim tiny">{t('dashboard.dailyRevenueTrend')}</div>
            </div>
            <BarChart2 size={18} style={{ color: 'var(--text-3)' }} />
          </div>
          {weeklyChart.length > 0
            ? <MiniBars data={weeklyChart} />
            : <div className="dim tiny" style={{ textAlign: 'center', padding: 40 }}>{t('dashboard.noSalesData')}</div>
          }
        </div>

        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>{t('dashboard.liveStock')}</div>
          {liveStock.length === 0 && <div className="dim tiny">{t('dashboard.noStockData')}</div>}
          {liveStock.map((s) => (
            <div key={s.cylinder_id} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <CylCell cylinder={s} />
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.total_filled_qty} {t('dashboard.filledLabel')}</div>
                  {s.with_salesman_qty > 0 && (
                    <div className="dim tiny">{s.filled_qty} warehouse + {s.with_salesman_qty} out</div>
                  )}
                  <div className="dim tiny">{s.empty_qty} {t('dashboard.emptyLabel')}</div>
                </div>
              </div>
              <StockBar filled={s.total_filled_qty} empty={s.empty_qty} capacity={s.capacity} />
            </div>
          ))}
        </div>
      </div>

      {/* Recent Sales + Money Snapshot */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>{t('dashboard.recentSales')}</div>
          {recentSales.length === 0 && (
            <div className="dim tiny" style={{ textAlign:'center', padding: 40 }}>{t('dashboard.noSalesYet')}</div>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>{t('nav.customers')}</th>
                  <th>{t('inventory.cylinderTypes').split(' ')[0]}</th>
                  <th>{t('common.amount')}</th>
                  <th>{t('sales.paymentType')}</th>
                  <th>{t('nav.salesman')}</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((s) => (
                  <tr key={s.id}>
                    <td>{s.customer?.name || t('sales.walkIn')}</td>
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

        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>{t('dashboard.moneySnapshot')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              [t('dashboard.customerDue'), summary.customer_due, t('dashboard.toCollect'), 'var(--accent)'],
              [t('dashboard.supplierDue'), summary.supplier_due, t('dashboard.toPay'), 'var(--warning)'],
              [t('dashboard.inventoryValue'), summary.inventory_value, t('dashboard.stockAtCost'), 'var(--text-1)'],
              [t('dashboard.monthlyExpenses'), summary.monthly_expenses, t('dashboard.thisMonth'), 'var(--text-1)'],
            ].map(([label, val, sub, color]) => (
              <React.Fragment key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>{label}</div>
                    <div className="dim tiny">{sub}</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color }}>{TK(val)}</div>
                </div>
                <div style={{ borderTop: '1px solid var(--border-soft)' }} />
              </React.Fragment>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 8, background: summary.net_position >= 0 ? '#176B3A18' : '#B8303018' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>{t('dashboard.netPosition')}</div>
                <div className="dim tiny">{t('dashboard.netPositionHint')}</div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: summary.net_position >= 0 ? '#176B3A' : '#B83030' }}>
                {TK(summary.net_position)}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
