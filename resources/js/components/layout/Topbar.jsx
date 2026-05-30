import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Bell, Plus } from 'lucide-react';

const PAGE_META = {
  '/':           ['Dashboard',       `Today · ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}`],
  '/inventory':  ['Inventory & Stock','Cylinder types · filled & empty tracking'],
  '/purchases':  ['Purchases & Lots', 'FIFO lot queue & profit'],
  '/sales':      ['Sales',            'Record and track sales'],
  '/allocation': ['Salesman Stock',   'Allocate & reconcile daily'],
  '/customers':  ['Customers',        'Customer accounts & collections'],
  '/suppliers':  ['Suppliers',        'Supplier accounts & payments'],
  '/expenses':   ['Expenses',         'Track business expenses'],
};

export default function Topbar({ onQuickSale }) {
  const location = useLocation();
  const path     = location.pathname;
  const [title, subtitle] = PAGE_META[path] || ['CylinderHub', ''];

  return (
    <header className="topbar">
      <div>
        <div className="page-title">{title}</div>
        <div className="crumb-sub">{subtitle}</div>
      </div>
      <div className="topbar-right">
        <div className="date-chip">
          <Calendar size={14} />
          {new Date().toLocaleDateString('en-US',{weekday:'short', month:'short', day:'numeric'})}
        </div>
        <button className="icon-btn" title="Notifications"><Bell size={18} /></button>
        <button className="btn btn-primary btn-sm" onClick={onQuickSale}>
          <Plus size={16} /> Quick Sale
        </button>
      </div>
    </header>
  );
}
