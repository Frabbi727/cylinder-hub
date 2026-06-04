import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { salesmanService } from '../services/salesmanService';
import CylBadge from '../components/ui/CylBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { CheckCircle, AlertCircle, Moon, Banknote, TrendingUp } from 'lucide-react';

const TK      = (n) => '৳' + Number(n || 0).toLocaleString('en-US');
const todayStr = new Date().toISOString().split('T')[0];
const today    = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

function ReconcileForm({ alloc, onSuccess, onCancel }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    sold_qty:         String(alloc.sold_qty ?? 0),
    collected_amount: String(alloc.collected_amount ?? ''),
  });
  const [error, setError] = useState('');

  const reconcileMutation = useMutation({
    mutationFn: (data) => salesmanService.reconcile(alloc.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-allocations'] });
      onSuccess();
    },
    onError: (e) => setError(e.response?.data?.message || 'Failed to reconcile'),
  });

  const sold         = parseInt(form.sold_qty) || 0;
  const autoReturned = Math.max(0, alloc.qty - sold);
  const overLimit    = sold > alloc.qty;
  const expectedCash = sold * parseFloat(alloc.sale_price || 0);

  // Auto-fill cash whenever sold qty changes
  const handleSoldChange = (val) => {
    const qty  = parseInt(val) || 0;
    const cash = qty * parseFloat(alloc.sale_price || 0);
    setForm(f => ({ ...f, sold_qty: val, collected_amount: String(cash) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (overLimit) { setError(`Sold (${sold}) cannot exceed allocated (${alloc.qty}).`); return; }
    setError('');
    reconcileMutation.mutate({
      sold_qty:         sold,
      collected_amount: parseFloat(form.collected_amount) || 0,
    });
  };

  return (
    <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 20, border: '1px dashed var(--primary)', marginTop: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 12, color: 'var(--primary)' }}>
        Reconcile: {alloc.cylinder?.name} {alloc.cylinder?.size}
      </div>

      {/* Allocation summary */}
      <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 22 }}>{alloc.qty}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Allocated</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--success)' }}>{alloc.sold_qty || 0}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Sales recorded</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--primary)' }}>{TK(alloc.sale_price)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Price/pcs</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: '#A85200' }}>{TK(expectedCash)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Expected cash ({sold} × {TK(alloc.sale_price)})</div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, display: 'flex', gap: 8 }}>
          <AlertCircle size={15} style={{ marginTop: 1 }} />{error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {/* Field 1: Sold qty */}
          <div>
            <label className="label">How many did you sell? *</label>
            <input type="number" className="input" min="0" max={alloc.qty}
              value={form.sold_qty}
              onChange={e => handleSoldChange(e.target.value)}
              required />
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
              Max: {alloc.qty} · Price: {TK(alloc.sale_price)}/pcs
            </div>
          </div>

          {/* Field 2: Cash — auto-filled, salesman can adjust if needed */}
          <div>
            <label className="label">Cash submitted ৳ *</label>
            <input type="number" className="input" min="0" step="0.01"
              value={form.collected_amount}
              onChange={e => setForm(f => ({ ...f, collected_amount: e.target.value }))}
              required />
            <div style={{ fontSize: 11, color: expectedCash === parseFloat(form.collected_amount || 0) ? 'var(--success)' : '#A85200', marginTop: 4, fontWeight: 500 }}>
              {expectedCash === parseFloat(form.collected_amount || 0)
                ? `✓ Matches: ${sold} × ${TK(alloc.sale_price)}`
                : `Expected: ${TK(expectedCash)} — adjust if partial collected`}
            </div>
          </div>
        </div>

        {/* Auto-calculated summary — read only */}
        <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10, fontWeight: 600 }}>
            Automatic calculation:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
            <div style={{ background: '#E6F8EC', borderRadius: 8, padding: '10px 8px' }}>
              <div style={{ fontWeight: 800, fontSize: 20, color: '#176B3A' }}>{sold}</div>
              <div style={{ fontSize: 11, color: '#176B3A', marginTop: 2 }}>Sold ✓</div>
            </div>
            <div style={{ background: '#FFF1DD', borderRadius: 8, padding: '10px 8px' }}>
              <div style={{ fontWeight: 800, fontSize: 20, color: '#A85200' }}>{autoReturned}</div>
              <div style={{ fontSize: 11, color: '#A85200', marginTop: 2 }}>Return to warehouse</div>
            </div>
            <div style={{ background: overLimit ? '#FFE5E3' : '#E6F0F1', borderRadius: 8, padding: '10px 8px' }}>
              <div style={{ fontWeight: 800, fontSize: 20, color: overLimit ? '#B83030' : 'var(--primary)' }}>
                {overLimit ? '⚠' : '✓'}
              </div>
              <div style={{ fontSize: 11, color: overLimit ? '#B83030' : 'var(--primary)', marginTop: 2 }}>
                {overLimit ? 'Exceeds limit!' : `${sold} + ${autoReturned} = ${alloc.qty}`}
              </div>
            </div>
          </div>
        </div>

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

  const { data: dueData } = useQuery({
    queryKey: ['daily-collections', user?.id, todayStr],
    queryFn:  () => salesmanService.getDailyCollections(user.id),
    enabled:  !!user?.id,
    refetchInterval: 30_000,
  });

  const allocations       = myData?.data?.salesman?.allocations || [];
  const allReconciled     = allocations.length > 0 && allocations.every(a => a.is_reconciled);
  const apiStats          = myData?.data?.stats ?? {};
  const dueCollections    = dueData?.data?.collections || [];
  const dueCollectedTotal = dueData?.data?.total ?? 0;

  const stats = {
    totalSold:         apiStats.total_sold       ?? 0,
    totalReturned:     apiStats.total_returned   ?? 0,
    totalCash:         apiStats.cash_collected   ?? 0,
    totalAllocated:    apiStats.total_allocated  ?? 0,
    dueCollected:      apiStats.due_collected_today ?? dueCollectedTotal,
    totalCashToHandIn: apiStats.total_cash_to_hand_in ?? ((apiStats.cash_collected ?? 0) + dueCollectedTotal),
  };

  if (isLoading) return <LoadingSpinner text="Loading allocations..." />;

  if (allReconciled) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center' }}>
        <CheckCircle size={72} style={{ color: 'var(--success)', marginBottom: 20 }} />
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>All Done!</div>
        <div style={{ color: 'var(--text-3)', marginBottom: 32, fontSize: 15 }}>All allocations reconciled for today.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Total Sold',     value: `${stats.totalSold} pcs` },
            { label: 'Total Returned', value: `${stats.totalReturned} pcs` },
          ].map(({ label, value }) => (
            <div key={label} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12, fontWeight: 600 }}>Cash Summary</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span>Cylinder sales collected</span>
              <strong>{TK(stats.totalCash)}</strong>
            </div>
            {stats.dueCollected > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span>Previous dues collected</span>
                <strong style={{ color: 'var(--success)' }}>{TK(stats.dueCollected)}</strong>
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800 }}>
              <span>Total to hand in</span>
              <span style={{ color: 'var(--primary)' }}>{TK(stats.totalCashToHandIn)}</span>
            </div>
          </div>
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

      {allocations.some(a => !a.is_reconciled && a.allocation_date < todayStr) && (
        <div style={{ background: '#FEF2F2', border: '1px solid #B83030', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#B83030', display: 'flex', gap: 8 }}>
          <AlertCircle size={15} style={{ marginTop: 1, flexShrink: 0 }} />
          <span><strong>Overdue:</strong> You have unreconciled allocations from previous days. Please reconcile them below.</span>
        </div>
      )}

      {/* Daily cash summary */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <TrendingUp size={15} style={{ color: 'var(--primary)' }} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Today's Cash Accountability</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-3)' }}>From today's cylinder sales</span>
            <strong>{TK(stats.totalCash)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-3)' }}>From previous due collections today</span>
            <strong style={{ color: stats.dueCollected > 0 ? 'var(--success)' : 'var(--text-3)' }}>
              {TK(stats.dueCollected)}
            </strong>
          </div>
          <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15 }}>
            <span>Total cash to hand in</span>
            <span style={{ color: 'var(--primary)' }}>{TK(stats.totalCashToHandIn)}</span>
          </div>
        </div>
        {dueCollections.length > 0 && (
          <details style={{ marginTop: 12 }}>
            <summary style={{ fontSize: 12, color: 'var(--text-3)', cursor: 'pointer' }}>
              View {dueCollections.length} due collection{dueCollections.length > 1 ? 's' : ''} today
            </summary>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {dueCollections.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border-soft)' }}>
                  <span>{c.customer?.name || 'Unknown'} <span style={{ color: 'var(--text-3)' }}>(Sale #{c.sale_id})</span></span>
                  <strong style={{ color: 'var(--success)' }}>{TK(c.amount)}</strong>
                </div>
              ))}
            </div>
          </details>
        )}
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
                    {a.allocation_date && a.allocation_date < todayStr && (
                      <div style={{ fontSize: 11, color: '#B83030', fontWeight: 600, marginTop: 2 }}>
                        ⚠ From {a.allocation_date}
                      </div>
                    )}
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
