import React from 'react';
import { useSales } from '../hooks/useSales';
import StatusPill from '../components/ui/StatusPill';
import CylCell    from '../components/ui/CylCell';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const TK = (n) => '৳' + Number(n || 0).toLocaleString('en-US');

export default function Sales() {
  const { sales, isLoading, deleteSale, isDeleting } = useSales();
  const { isAdmin } = useAuth();

  if (isLoading) return <LoadingSpinner text="Loading sales..." />;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p className="dim tiny">All sales records. Use Quick Sale from the top bar to record a new sale.</p>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="tbl" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Due</th>
              <th>Payment</th>
              <th>Salesman</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40 }} className="dim">No sales yet. Use Quick Sale to record one.</td></tr>
            )}
            {sales.map(s => (
              <tr key={s.id}>
                <td>{s.sale_date}</td>
                <td style={{ fontWeight: 600 }}>{s.customer?.name || 'Walk-in'}</td>
                <td>
                  {s.items?.map((it, i) => (
                    <span key={i} style={{ display: 'block', fontSize: 12 }}>
                      {it.cylinder?.name} {it.cylinder?.size} ×{it.qty}
                    </span>
                  ))}
                </td>
                <td style={{ fontWeight: 600 }}>{TK(s.total_amount)}</td>
                <td style={{ color: 'var(--success)' }}>{TK(s.paid_amount)}</td>
                <td style={{ color: s.due_amount > 0 ? 'var(--accent)' : 'inherit' }}>{TK(s.due_amount)}</td>
                <td><StatusPill status={s.payment_type} /></td>
                <td className="dim">{s.salesman?.name}</td>
                {isAdmin && (
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => window.confirm('Delete this sale? Stock will be restored.') && deleteSale(s.id)}
                      disabled={isDeleting}
                      title="Delete sale (restores stock)"
                    >
                      <Trash2 size={14} style={{ color: 'var(--error)' }} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
