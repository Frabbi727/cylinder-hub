// ============ Cylinder Admin — shared components ============
const { useState, useEffect, useRef } = React;
const Ic = window.Icons;

// ---- Cylinder avatar (little gas bottle) ----
function CylBadge({ c, size }) {
  const cyl = typeof c === 'string' ? cylById(c) : c;
  if (!cyl) return null;
  return (
    <span className="cyl-ava" style={{ '--cyl-c1': cyl.c1, '--cyl-c2': cyl.c2,
      transform: size === 'sm' ? 'scale(0.82)' : 'none' }}>
      {cyl.short}
    </span>
  );
}

function CylCell({ c }) {
  const cyl = typeof c === 'string' ? cylById(c) : c;
  return (
    <div className="row gap-3">
      <CylBadge c={cyl} size="sm" />
      <div>
        <div className="cell-main">{cyl.name}</div>
        <div className="cell-sub">{cyl.size}</div>
      </div>
    </div>
  );
}

// ---- status pill ----
const STATUS_MAP = {
  Active:   { cls: 'pill-green',  icon: '🟢' },
  Pending:  { cls: 'pill-amber',  icon: '⏳' },
  Done:     { cls: 'pill-teal',   icon: '✓' },
  Inactive: { cls: 'pill',        icon: '⏸' },
  Cash:     { cls: 'pill-green' },
  Due:      { cls: 'pill-coral' },
  Partial:  { cls: 'pill-amber' },
};
function StatusPill({ s, withIcon }) {
  const m = STATUS_MAP[s] || { cls: 'pill' };
  return <span className={'pill ' + m.cls}>{withIcon && m.icon ? m.icon + ' ' : ''}{s}</span>;
}

// ---- stat card ----
function StatCard({ icon, tone, label, value, delta, deltaDir, foot }) {
  const Icon = Ic[icon];
  return (
    <div className="scard">
      <span className={'ico ' + tone}><Icon size={20} /></span>
      <div className="lbl">{label}</div>
      <div className="val">{value}</div>
      {delta != null && (
        <div className={'delta ' + (deltaDir || 'up')}>
          {React.createElement(Ic[deltaDir === 'down' ? 'TrendDown' : 'TrendUp'], { size: 13 })}
          {delta}
        </div>
      )}
      {foot && <div className="tiny dim" style={{ marginTop: 8 }}>{foot}</div>}
    </div>
  );
}

// ---- sidebar ----
const NAV = [
  { group: 'Overview', items: [
    { id: 'dashboard', label: 'Dashboard', icon: 'Gauge' },
  ]},
  { group: 'Operations', items: [
    { id: 'inventory', label: 'Inventory & Stock', icon: 'Package' },
    { id: 'purchase',  label: 'Purchases & Lots', icon: 'Layers', count: 'FIFO' },
    { id: 'allocation',label: 'Salesman Stock',  icon: 'Truck' },
  ]},
  { group: 'People', items: [
    { id: 'salesman',  label: 'Salesman App', icon: 'Phone' },
  ]},
];

function Sidebar({ route, setRoute }) {
  return (
    <aside className="sidebar-nav">
      <div className="sidebar-brand">
        <span className="mark"><Ic.Flame size={21} /></span>
        <div>
          <div className="name">Cylinder<span style={{ color: 'var(--primary)' }}>Hub</span></div>
          <div className="sub">Admin Console</div>
        </div>
      </div>
      <nav className="nav-scroll">
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="nav-group-label">{g.group}</div>
            {g.items.map((it) => (
              <button key={it.id}
                className={'nav-item' + (route === it.id ? ' active' : '')}
                onClick={() => setRoute(it.id)}>
                {React.createElement(Ic[it.icon], { size: 18 })}
                <span>{it.label}</span>
                {it.count && <span className="nav-count">{it.count}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="sb-user">
          <span className="avatar">AH</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Abdul Hakim</div>
            <div className="tiny dim">Owner · Admin</div>
          </div>
          <Ic.LogOut size={16} style={{ color: 'var(--text-3)' }} />
        </div>
      </div>
    </aside>
  );
}

// ---- topbar ----
const TITLES = {
  dashboard:  ['Dashboard', "Today · " + new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})],
  inventory:  ['Inventory & Stock', 'Cylinder types · filled & empty tracking'],
  purchase:   ['Purchases & Lots', 'FIFO lot queue & profit'],
  allocation: ['Salesman Stock', 'Allocate & reconcile daily'],
  salesman:   ['Salesman Mobile App', 'A peek at the field experience'],
};
function Topbar({ route }) {
  const [title, sub] = TITLES[route] || ['', ''];
  return (
    <header className="topbar">
      <div>
        <div className="page-title">{title}</div>
        <div className="crumb-sub">{sub}</div>
      </div>
      <div className="topbar-right">
        <div className="date-chip"><Ic.Calendar size={14} /> {new Date().toLocaleDateString('en-US',{weekday:'short', month:'short', day:'numeric'})}</div>
        <button className="icon-btn"><Ic.RefreshCw size={18} /></button>
        <button className="icon-btn"><Ic.Bell size={18} /><span className="dot"></span></button>
        <button className="btn btn-primary btn-sm"><Ic.Plus size={16} /> Quick Sale</button>
      </div>
    </header>
  );
}

// ---- simple bar chart ----
function MiniBars({ data, max }) {
  const m = max || Math.max(...data.map(d => d.amt));
  return (
    <div className="bars">
      {data.map((d, i) => (
        <div className="bar-col" key={d.d}>
          <div className="bar" style={{ height: (d.amt / m * 100) + '%',
            background: i === data.length - 2 ? 'var(--primary)' : 'var(--primary-soft)' }}
            title={TK(d.amt)}></div>
          <div className="bar-lbl">{d.d}</div>
        </div>
      ))}
    </div>
  );
}

// ---- stock dual bar ----
function StockBar({ filled, empty, cap }) {
  const fp = Math.min(100, filled / cap * 100);
  const ep = Math.min(100 - fp, empty / cap * 100);
  return (
    <div className="stock-bar">
      <div style={{ width: fp + '%', background: 'var(--primary)', display: 'inline-block', height: '100%' }}></div>
      <div style={{ width: ep + '%', background: 'var(--warning)', display: 'inline-block', height: '100%' }}></div>
    </div>
  );
}

Object.assign(window, { CylBadge, CylCell, StatusPill, StatCard, Sidebar, Topbar, MiniBars, StockBar });
