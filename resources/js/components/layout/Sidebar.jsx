import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Gauge, Package, Layers, Truck, ShoppingCart,
  Users, Building2, Receipt, Flame, LogOut
} from 'lucide-react';

const NAV = [
  { group: 'Overview', items: [
    { path: '/',          label: 'Dashboard',       icon: Gauge },
  ]},
  { group: 'Operations', items: [
    { path: '/inventory', label: 'Inventory & Stock', icon: Package },
    { path: '/purchases', label: 'Purchases & Lots',  icon: Layers, badge: 'FIFO' },
    { path: '/sales',     label: 'Sales',             icon: ShoppingCart },
    { path: '/allocation',label: 'Salesman Stock',    icon: Truck },
  ]},
  { group: 'People', items: [
    { path: '/customers', label: 'Customers',   icon: Users },
    { path: '/suppliers', label: 'Suppliers',   icon: Building2 },
  ]},
  { group: 'Finance', items: [
    { path: '/expenses',  label: 'Expenses',    icon: Receipt },
  ]},
];

export default function Sidebar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path) => path === '/'
    ? location.pathname === '/'
    : location.pathname.startsWith(path);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar-nav">
      <div className="sidebar-brand">
        <span className="mark"><Flame size={21} /></span>
        <div>
          <div className="name">Cylinder<span style={{ color: 'var(--primary)' }}>Hub</span></div>
          <div className="sub">Admin Console</div>
        </div>
      </div>

      <nav className="nav-scroll">
        {NAV.map((group) => (
          <div key={group.group}>
            <div className="nav-group-label">{group.group}</div>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  className={`nav-item${isActive(item.path) ? ' active' : ''}`}
                  onClick={() => navigate(item.path)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                  {item.badge && <span className="nav-count">{item.badge}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="sb-user">
          <span className="avatar">{user?.avatar_initials || '?'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name}</div>
            <div className="tiny dim">{user?.role === 'admin' ? 'Owner · Admin' : 'Salesman'}</div>
          </div>
          <button className="icon-btn" onClick={handleLogout} title="Logout">
            <LogOut size={16} style={{ color: 'var(--text-3)' }} />
          </button>
        </div>
      </div>
    </aside>
  );
}
