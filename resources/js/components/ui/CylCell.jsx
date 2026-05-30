import React from 'react';
import CylBadge from './CylBadge';

export default function CylCell({ cylinder }) {
  if (!cylinder) return null;
  return (
    <div className="row gap-3">
      <CylBadge cylinder={cylinder} size="sm" />
      <div>
        <div className="cell-main">{cylinder.name}</div>
        <div className="cell-sub">{cylinder.size}</div>
      </div>
    </div>
  );
}
