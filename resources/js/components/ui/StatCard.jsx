import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ icon: Icon, tone = 'primary', label, value, delta, deltaDir = 'up', foot }) {
  return (
    <div className="scard">
      <span className={`ico ico-${tone}`}><Icon size={20} /></span>
      <div className="lbl">{label}</div>
      <div className="val">{value}</div>
      {delta != null && (
        <div className={`delta ${deltaDir}`}>
          {deltaDir === 'down' ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
          {delta}
        </div>
      )}
      {foot && <div className="tiny dim" style={{ marginTop: 8 }}>{foot}</div>}
    </div>
  );
}
