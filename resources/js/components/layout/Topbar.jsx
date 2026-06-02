import React from 'react';
import { useLocation } from 'react-router-dom';
import { Calendar, Bell, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import i18n from '../../i18n';

export default function Topbar({ onQuickSale }) {
  const location  = useLocation();
  const { t }     = useTranslation();
  const { isSalesman } = useAuth();
  const path      = location.pathname;

  const ADMIN_META = {
    '/':           [t('nav.dashboard'),   `${t('common.today')} · ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}`],
    '/inventory':  [t('nav.inventory'),   t('inventory.stockOverview') + ' · ' + t('inventory.cylinderTypes')],
    '/purchases':  [t('nav.purchases'),   t('purchases.subtitle')],
    '/sales':      [t('nav.sales'),       t('sales.allSales')],
    '/allocation': [t('nav.allocation'),  t('allocation.allocatedToday') + ' · ' + t('allocation.reconcile')],
    '/customers':  [t('nav.customers'),   t('customers.totalDue')],
    '/suppliers':  [t('nav.suppliers'),   t('suppliers.totalDue')],
    '/expenses':   [t('nav.expenses'),    t('expenses.thisMonthExpenses')],
  };

  const SALESMAN_META = {
    '/sales': [t('sales.myDaySummary'), t('sales.todaySales') + ' · ' + t('allocation.myAllocations')],
  };

  const META = isSalesman ? SALESMAN_META : ADMIN_META;
  const [title, subtitle] = META[path] || ['CylinderHub', ''];

  const toggleLang = () => {
    const next = i18n.language === 'en' ? 'bn' : 'en';
    i18n.changeLanguage(next);
    localStorage.setItem('cylinderhub_lang', next);
  };

  return (
    <header className="topbar">
      <div>
        <div className="page-title">{title}</div>
        {subtitle && <div className="crumb-sub">{subtitle}</div>}
      </div>
      <div className="topbar-right">
        <div className="date-chip">
          <Calendar size={14} />
          {new Date().toLocaleDateString('en-US',{weekday:'short', month:'short', day:'numeric'})}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={toggleLang} title="Switch Language" style={{ fontSize: 13, gap: 4 }}>
          {i18n.language === 'en' ? '🇧🇩 বাংলা' : '🇬🇧 English'}
        </button>
        <button className="icon-btn" title={t('common.close')}><Bell size={18} /></button>
        <button className="btn btn-primary btn-sm" onClick={onQuickSale}>
          <Plus size={16} /> {t('sales.quickSale')}
        </button>
      </div>
    </header>
  );
}
