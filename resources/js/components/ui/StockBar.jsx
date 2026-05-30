import React from 'react';

export default function StockBar({ filled, empty, capacity }) {
  const cap = capacity || 1;
  const fp  = Math.min(100, (filled / cap) * 100);
  const ep  = Math.min(100 - fp, (empty / cap) * 100);
  return (
    <div className="stock-bar">
      <div style={{ width: `${fp}%`, background: 'var(--primary)', display: 'inline-block', height: '100%' }} />
      <div style={{ width: `${ep}%`, background: 'var(--warning)', display: 'inline-block', height: '100%' }} />
    </div>
  );
}
