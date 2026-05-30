import React from 'react';

export default function CylBadge({ cylinder, size = 'md' }) {
  if (!cylinder) return null;
  const scale = size === 'sm' ? 'scale(0.82)' : 'none';
  return (
    <span
      className="cyl-ava"
      style={{ '--cyl-c1': cylinder.color1, '--cyl-c2': cylinder.color2, transform: scale }}
    >
      {cylinder.short_code}
    </span>
  );
}
