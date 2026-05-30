// ============ Dashboard ============
function Dashboard() {
  const totalFilled = STOCK.reduce((a, s) => a + s.filled, 0);
  const custDue = 48650, supDue = 21200, monthExp = 32400;
  const todaySales = 9800 + 800 + 3400 + 4350 + 420; // sum of recent demo
  return (
    <div className="content">
      <div className="content-head">
        <div>
          <h2>Good afternoon, Abdul 👋</h2>
          <p>Here's how the business is doing today.</p>
        </div>
        <div className="seg2">
          <button className="active">Today</button>
          <button>This week</button>
          <button>This month</button>
        </div>
      </div>

      <div className="stat-cards">
        <StatCard icon="Dollar"  tone="green" label="Today's Sales"  value={TK(18770)} delta="12.4% vs yest." deltaDir="up" />
        <StatCard icon="Flame"   tone="teal"  label="Today's Profit (FIFO)" value={TK(4120)} delta="8.1%" deltaDir="up" foot="Net of cost basis" />
        <StatCard icon="Package" tone="amber" label="Filled Stock" value={totalFilled + ' pcs'} foot="across 4 types" />
        <StatCard icon="Wallet"  tone="coral" label="Customer Due" value={TK(custDue)} foot="receivable" />
      </div>

      <div className="grid-dash" style={{ marginTop: 16 }}>
        {/* sales chart + recent */}
        <div className="col gap-4">
          <div className="panel">
            <div className="panel-head">
              <h3><Ic.BarChart size={17} style={{ color: 'var(--primary)' }} /> Sales this week</h3>
              <span className="sub">৳315,300 total · best day Sat</span>
            </div>
            <div className="panel-body"><MiniBars data={WEEK} /></div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3><Ic.Receipt size={17} style={{ color: 'var(--primary)' }} /> Recent sales</h3>
              <button className="btn btn-ghost btn-sm">View all <Ic.ChevronRight size={15} /></button>
            </div>
            <div className="panel-body flush">
              <table className="dtable">
                <thead><tr>
                  <th>Time</th><th>Cylinder</th><th className="num">Qty</th>
                  <th className="num">Amount</th><th>Payment</th><th>By</th>
                </tr></thead>
                <tbody>
                  {RECENT_SALES.map((s, i) => (
                    <tr key={i}>
                      <td className="dim tiny">{s.time}</td>
                      <td><CylCell c={s.cyl} /></td>
                      <td className="num">{s.qty}</td>
                      <td className="num strong taka">{TK(s.qty * s.price)}</td>
                      <td><StatusPill s={s.pay} /></td>
                      <td className="muted">{s.by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* right rail */}
        <div className="col gap-4">
          <div className="panel">
            <div className="panel-head"><h3><Ic.Package size={17} style={{ color: 'var(--primary)' }} /> Live stock</h3></div>
            <div className="panel-body col gap-4">
              {STOCK.map((s) => {
                const cyl = cylById(s.cyl);
                const low = s.filled <= s.reorder;
                return (
                  <div key={s.cyl}>
                    <div className="row gap-3" style={{ justifyContent: 'space-between', marginBottom: 7 }}>
                      <div className="row gap-2">
                        <CylBadge c={cyl} size="sm" />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{cyl.name} <span className="dim tiny">{cyl.size}</span></div>
                          <div className="tiny muted">{s.filled} filled · {s.empty} empty</div>
                        </div>
                      </div>
                      {low && <span className="pill pill-coral"><Ic.Alert size={12} /> Low</span>}
                    </div>
                    <StockBar filled={s.filled} empty={s.empty} cap={s.cap} />
                  </div>
                );
              })}
              <div className="row gap-4 tiny muted" style={{ marginTop: 2 }}>
                <span className="row gap-2"><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--primary)' }}></span> Filled</span>
                <span className="row gap-2"><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--warning)' }}></span> Empty</span>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><h3><Ic.Wallet size={17} style={{ color: 'var(--primary)' }} /> Money snapshot</h3></div>
            <div className="panel-body col gap-3">
              <DueRow icon="ArrowDownLeft" tone="green" label="Customer due (receivable)" val={TK(48650)} />
              <DueRow icon="ArrowUpRight" tone="coral" label="Supplier due (payable)" val={TK(21200)} />
              <DueRow icon="Receipt" tone="amber" label="Expenses this month" val={TK(32400)} />
              <div style={{ height: 1, background: 'var(--border-soft)' }}></div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div className="tiny dim">Real profit this month</div>
                  <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Sales profit − expenses</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1A8C3F' }}>{TK(86200)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* daily workflow */}
      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel-head"><h3><Ic.Clock size={17} style={{ color: 'var(--primary)' }} /> Today's checklist</h3><span className="sub">Daily routine</span></div>
        <div className="panel-body grid-3">
          <Routine title="Morning" done items={['Open dashboard — check stock & dues','Allocate stock to salesmen','Enter new purchase lots']} />
          <Routine title="During the day" items={['Record sales (cash / due)','Collect customer dues','Log empty cylinder returns']} />
          <Routine title="End of day" items={['Reconcile salesman sales & collection','Review daily profit report','Enter expenses']} />
        </div>
      </div>
    </div>
  );
}

function DueRow({ icon, tone, label, val }) {
  return (
    <div className="row gap-3" style={{ justifyContent: 'space-between' }}>
      <div className="row gap-3">
        <span className={'ico ' + tone} style={{ width: 34, height: 34, marginBottom: 0, borderRadius: 9 }}>{React.createElement(Ic[icon], { size: 16 })}</span>
        <span style={{ fontSize: 13 }}>{label}</span>
      </div>
      <span className="strong taka">{val}</span>
    </div>
  );
}

function Routine({ title, items, done }) {
  return (
    <div>
      <div className="row gap-2" style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)' }}>{title}</span>
      </div>
      <div className="col gap-2">
        {items.map((it, i) => (
          <div key={i} className="row gap-2" style={{ fontSize: 13, color: done ? 'var(--text-3)' : 'var(--text-1)' }}>
            <span style={{ width: 18, height: 18, borderRadius: 6, flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: done ? 'var(--success-bg)' : 'var(--border-soft)', color: '#1E8C3F' }}>
              {done ? <Ic.Check size={12} /> : ''}
            </span>
            <span style={{ textDecoration: done ? 'line-through' : 'none' }}>{it}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

window.Dashboard = Dashboard;
