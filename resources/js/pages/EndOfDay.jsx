import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { salesmanService } from '../services/salesmanService';
import { stockService } from '../services/stockService';
import CylBadge from '../components/ui/CylBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { CheckCircle, AlertCircle, Moon, Info } from 'lucide-react';

const TK      = (n) => '৳' + Number(n || 0).toLocaleString('en-US');
const todayStr = new Date().toISOString().split('T')[0];
const today    = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

function ReconcileForm({ alloc, onSuccess, onCancel }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    sold_qty:         String(alloc.sold_qty     ?? 0),
    returned_qty:     String(alloc.returned_qty ?? 0),
    collected_amount: String(alloc.collected_amount ?? ''),
  });
  const [error, setError] = useState('');

  // Fetch logged returns for this allocation to pre-fill returned_qty
  const { data: returnsData } = useQuery({
    queryKey: ['allocation-returns', alloc.id],
    queryFn:  () => stockService.getReturns({ allocation_id: alloc.id }),
    enabled:  !!alloc.id,
  });

  const loggedReturns = returnsData?.data || [];
  const loggedNormal  = loggedReturns.filter(r => !r.is_extra);
  const loggedExtra   = loggedReturns.filter(r => r.is_extra && r.is_verified !== false);
  const loggedTotal   = loggedReturns
    .filter(r => r.is_verified !== false)
    .reduce((s, r) => s + (r.qty || 0), 0);
  const hasLoggedReturns = loggedTotal > 0;

  // Pre-fill returned_qty once returns are loaded (only if field is still at default)
  useEffect(() => {
    if (hasLoggedReturns && form.returned_qty === String(alloc.returned_qty ?? 0)) {
      setForm(f => ({ ...f, returned_qty: String(loggedTotal) }));
    }
  }, [loggedTotal]); // eslint-disable-line

  const reconcileMutation = useMutation({
    mutationFn: (data) => salesmanService.reconcile(alloc.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-allocations'] });
      onSuccess();
    },
    onError: (e) => setError(e.response?.data?.message || 'Failed to reconcile'),
  });

  const sold      = parseInt(form.sold_qty)     || 0;
  const returned  = parseInt(form.returned_qty) || 0;
  const unsold    = Math.max(0, alloc.qty - sold - returned);
  const overLimit = sold + returned > alloc.qty;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (overLimit) { setError(`Sold (${sold}) + returned (${returned}) cannot exceed allocated (${alloc.qty}).`); return; }
    setError('');
    reconcileMutation.mutate({ sold_qty: sold, returned_qty: returned, collected_amount: parseFloat(form.collected_amount) || 0 });
  };

  return (
    <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 20, border: '1px dashed var(--primary)', marginTop: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 12, color: 'var(--primary)' }}>Reconcile: {alloc.cylinder?.name} {alloc.cylinder?.size}</div>

      {/* Allocation summary */}
      <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 20 }}>
        <div><div style={{ fontWeight: 700, fontSize: 18 }}>{alloc.qty}</div><div style={{ fontSize: 11, color: 'var(--text-3)' }}>Allocated</div></div>
        <div><div style={{ fontWeight: 700, fontSize: 18, color: 'var(--success)' }}>{alloc.sold_qty || 0}</div><div style={{ fontSize: 11, color: 'var(--text-3)' }}>Recorded sold</div></div>
        <div><div style={{ fontWeight: 700, fontSize: 18, color: 'var(--primary)' }}>{TK(alloc.sale_price)}</div><div style={{ fontSize: 11, color: 'var(--text-3)' }}>Sale price</div></div>
      </div>

      {error && (
        <div style={{ background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, display: 'flex', gap: 8 }}>
          <AlertCircle size={15} style={{ marginTop: 1 }} />{error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
          <div>
            <label className="label">Actual Sold *</label>
            <input type="number" className="input" min="0" max={alloc.qty}
              value={form.sold_qty} onChange={e => setForm(f => ({ ...f, sold_qty: e.target.value }))} required />
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Recorded: {alloc.sold_qty || 0}</div>
          </div>
          <div>
            <label className="label">Empties Returned *</label>
            <input type="number" className="input" min="0"
              value={form.returned_qty} onChange={e => setForm(f => ({ ...f, returned_qty: e.target.value }))} required />
            {hasLoggedReturns && (
              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Info size={11} />
                {loggedTotal} logged ({loggedNormal.length > 0 ? `${loggedNormal.reduce((s,r)=>s+r.qty,0)} normal` : ''}
                {loggedNormal.length > 0 && loggedExtra.length > 0 ? ' + ' : ''}
                {loggedExtra.length > 0 ? `${loggedExtra.reduce((s,r)=>s+r.qty,0)} extra` : ''})
                {parseInt(form.returned_qty) !== loggedTotal && (
                  <span style={{ color: '#A85200', marginLeft: 4 }}>⚠ differs from logged</span>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="label">Cash Submitted ৳ *</label>
            <input type="number" className="input" min="0" step="0.01"
              value={form.collected_amount} onChange={e => setForm(f => ({ ...f, collected_amount: e.target.value }))} required />
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
              Expected: {TK((alloc.sold_qty || 0) * parseFloat(alloc.sale_price || 0))}
            </div>
          </div>
        </div>

        {/* Preview */}
        {form.sold_qty !== '' && (
          <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>After reconciliation:</div>
            <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
              <span>Unsold: <strong style={{ color: unsold > 0 ? 'var(--warning)' : 'var(--success)' }}>{unsold} pcs</strong> (returns to stock)</span>
              {overLimit && <span style={{ color: 'var(--error)', fontWeight: 600 }}>⚠ Exceeds allocation!</span>}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={reconcileMutation.isPending || overLimit}>
            {reconcileMutation.isPending ? 'Submitting...' : 'Submit Reconciliation'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function EndOfDay() {
  const { user } = useAuth();
  const [activeAlloc, setActiveAlloc] = useState(null);

  const { data: myData, isLoading } = useQuery({
    queryKey: ['my-allocations', user?.id],
    queryFn:  () => salesmanService.getById(user.id),
    enabled:  !!user?.id,
  });

  const allocations    = myData?.data?.salesman?.allocations || [];
  const allReconciled  = allocations.length > 0 && allocations.every(a => a.is_reconciled);

  const stats = useMemo(() => {
    const totalSold      = allocations.reduce((s, a) => s + (a.sold_qty || 0), 0);
    const totalReturned  = allocations.reduce((s, a) => s + (a.returned_qty || 0), 0);
    const totalCash      = allocations.reduce((s, a) => s + parseFloat(a.collected_amount || 0), 0);
    const totalAllocated = allocations.reduce((s, a) => s + a.qty, 0);
    return { totalSold, totalReturned, totalCash, totalAllocated };
  }, [allocations]);

  if (isLoading) return <LoadingSpinner text="Loading allocations..." />;

  if (allReconciled) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center' }}>
        <CheckCircle size={72} style={{ color: 'var(--success)', marginBottom: 20 }} />
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>All Done!</div>
        <div style={{ color: 'var(--text-3)', marginBottom: 32, fontSize: 15 }}>All allocations reconciled for today.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Total Sold', value: `${stats.totalSold} pcs` },
            { label: 'Total Returned', value: `${stats.totalReturned} pcs` },
            { label: 'Cash Submitted', value: TK(stats.totalCash) },
          ].map(({ label, value }) => (
            <div key={label} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Moon size={22} style={{ color: 'var(--primary)' }} />
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>End of Day</h2>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{today}</div>
        </div>
      </div>

      <div style={{ background: '#FFF1DD', border: '1px solid #FF9500', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#A85200', display: 'flex', gap: 8 }}>
        <AlertCircle size={15} style={{ marginTop: 1, flexShrink: 0 }} />
        <span>Reconcile each allocation by confirming sold qty, empty returns, and cash collected. This cannot be undone.</span>
      </div>

      {allocations.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
          No allocations for today.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {allocations.map(a => {
            const isActive = activeAlloc === a.id;
            return (
              <div key={a.id} className="card" style={{ padding: 20, borderLeft: a.is_reconciled ? '4px solid var(--success)' : isActive ? '4px solid var(--primary)' : '4px solid var(--border-soft)' }}>
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {a.cylinder && <CylBadge cylinder={a.cylinder} size="sm" />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{a.cylinder?.name} {a.cylinder?.size}</div>
                    <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>{TK(a.sale_price)}/pcs</div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, textAlign: 'center', fontSize: 12 }}>
                    <div><div style={{ fontWeight: 700, fontSize: 16 }}>{a.qty}</div><div style={{ color: 'var(--text-3)' }}>Allocated</div></div>
                    <div><div style={{ fontWeight: 700, fontSize: 16, color: 'var(--success)' }}>{a.sold_qty || 0}</div><div style={{ color: 'var(--text-3)' }}>Sold</div></div>
                    <div><div style={{ fontWeight: 700, fontSize: 16, color: 'var(--warning)' }}>{a.returned_qty || 0}</div><div style={{ color: 'var(--text-3)' }}>Returned</div></div>
                  </div>
                  {a.is_reconciled ? (
                    <span className="pill pill-teal" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={12} /> Reconciled
                    </span>
                  ) : (
                    <button className="btn btn-primary btn-sm"
                      onClick={() => setActiveAlloc(isActive ? null : a.id)}>
                      {isActive ? 'Cancel' : 'Reconcile'}
                    </button>
                  )}
                </div>

                {/* Reconcile form (inline, not modal) */}
                {isActive && !a.is_reconciled && (
                  <ReconcileForm
                    alloc={a}
                    onSuccess={() => setActiveAlloc(null)}
                    onCancel={() => setActiveAlloc(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
