import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  Gauge, Package, Layers, Truck, ShoppingCart,
  Users, Building2, Receipt, Flame, LogOut
} from 'lucide-react';

export default function Sidebar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout, isSalesman } = useAuth();
  const { t } = useTranslation();

  const NAV_ADMIN = [
    { group: t('nav.overview'), items: [
      { path: '/',           label: t('nav.dashboard'),  icon: Gauge },
    ]},
    { group: t('nav.operations'), items: [
      { path: '/inventory',  label: t('nav.inventory'),  icon: Package },
      { path: '/purchases',  label: t('nav.purchases'),  icon: Layers, badge: 'FIFO' },
      { path: '/sales',      label: t('nav.sales'),      icon: ShoppingCart },
      { path: '/allocation', label: t('nav.allocation'), icon: Truck },
    ]},
    { group: t('nav.people'), items: [
      { path: '/customers',  label: t('nav.customers'),  icon: Users },
      { path: '/suppliers',  label: t('nav.suppliers'),  icon: Building2 },
    ]},
    { group: t('nav.finance'), items: [
      { path: '/expenses',   label: t('nav.expenses'),   icon: Receipt },
    ]},
  ];

  const NAV_SALESMAN = [
    { group: t('nav.sales'), items: [
      { path: '/sales', label: t('nav.sales'), icon: ShoppingCart },
    ]},
  ];

  const NAV = isSalesman ? NAV_SALESMAN : NAV_ADMIN;

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
          <div className="sub">{isSalesman ? t('nav.salesman') : t('nav.adminConsole')}</div>
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
            <div className="tiny dim">{user?.role === 'admin' ? t('nav.ownerAdmin') : t('nav.salesman')}</div>
          </div>
          <button className="icon-btn" onClick={handleLogout} title={t('common.logout')}>
            <LogOut size={16} style={{ color: 'var(--text-3)' }} />
          </button>
        </div>
      </div>
    </aside>
  );
}
