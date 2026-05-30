import React from 'react';

const STATUS_MAP = {
  active:   'pill-green',
  Active:   'pill-green',
  pending:  'pill-amber',
  Pending:  'pill-amber',
  done:     'pill-teal',
  Done:     'pill-teal',
  inactive: 'pill',
  Inactive: 'pill',
  cash:     'pill-green',
  Cash:     'pill-green',
  due:      'pill-coral',
  Due:      'pill-coral',
  partial:  'pill-amber',
  Partial:  'pill-amber',
};

export default function StatusPill({ status }) {
  const cls = STATUS_MAP[status] || 'pill';
  return <span className={`pill ${cls}`}>{status}</span>;
}
