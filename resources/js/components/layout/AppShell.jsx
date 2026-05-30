import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import QuickSaleModal from '../ui/QuickSaleModal';

export default function AppShell({ children }) {
  const [showQuickSale, setShowQuickSale] = useState(false);

  return (
    <div className="admin-shell">
      <Sidebar />
      <div className="main-col">
        <Topbar onQuickSale={() => setShowQuickSale(true)} />
        <main style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          {children}
        </main>
      </div>
      {showQuickSale && <QuickSaleModal onClose={() => setShowQuickSale(false)} />}
    </div>
  );
}
