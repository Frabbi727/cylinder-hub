import React from 'react';

const TK = (n) => '৳' + Number(n).toLocaleString('en-US');

export default function MiniBars({ data }) {
  const max = Math.max(...data.map(d => d.amt), 1);
  return (
    <div className="bars">
      {data.map((d, i) => (
        <div className="bar-col" key={d.d}>
          <div
            className="bar"
            style={{
              height: `${(d.amt / max) * 100}%`,
              background: i === data.length - 2 ? 'var(--primary)' : 'var(--primary-soft)',
            }}
            title={TK(d.amt)}
          />
          <div className="bar-lbl">{d.d}</div>
        </div>
      ))}
    </div>
  );
}
