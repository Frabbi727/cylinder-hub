import React from 'react';
import { useAllocation } from '../hooks/useAllocation';
import { useAuth } from '../contexts/AuthContext';
import CylBadge   from '../components/ui/CylBadge';
import Modal      from '../components/ui/Modal';
import StatusPill from '../components/ui/StatusPill';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Plus, Truck, CheckCircle, UserPlus, Edit2, Power, AlertCircle, RotateCcw } from 'lucide-react';

const TK = (n) => '৳' + Number(n || 0).toLocaleString('en-US');

function ErrorBanner({ error }) {
  if (!error) return null;
  const msg = error.response?.data?.message || error.response?.data?.error || error.message || 'Something went wrong.';
  return (
    <div style={{
      background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 8,
      padding: '10px 14px', marginBottom: 16, fontSize: 13, display: 'flex', gap: 8, alignItems: 'flex-start'
    }}>
      <AlertCircle size={15} style={{ marginTop: 1, flexShrink: 0 }} />
      <span>{msg}</span>
    </div>
  );
}

export default function Allocation() {
  const { isAdmin } = useAuth();

  const {
    salesmen, cylinders, isLoading,
    // Allocate
    showAllocate, setShowAllocate, allocForm, setAllocForm,
    selectedSalesman, openAllocate,
    allocate, isAllocating, allocateError,
    // Add salesman
    showAddSalesman, setShowAddSalesman,
    salesmanForm, setSalesmanForm,
    createSalesman, isCreatingSalesman, createSalesmanError,
    // Edit salesman
    showEditSalesman, setShowEditSalesman,
    openEditSalesman,
    updateSalesman, isUpdatingSalesman, updateSalesmanError,
    toggleActive,
    // Reconcile
    showReconcile, setShowReconcile,
    selectedAllocation,
    reconcileForm, setReconcileForm,
    openReconcile,
    reconcile, isReconciling, reconcileError,
  } = useAllocation();

  // ---- Summary stats ----
  const activeSalesmen   = salesmen.filter(s => s.is_active).length;
  const totalAllocated   = salesmen.reduce((s, sm) =>
    s + (sm.allocations?.reduce((a, al) => a + al.qty, 0) || 0), 0);
  const totalCollected   = salesmen.reduce((s, sm) =>
    s + (sm.allocations?.reduce((a, al) => a + parseFloat(al.collected_amount || 0), 0) || 0), 0);

  if (isLoading) return <LoadingSpinner text="Loading salesmen..." />;

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div className="stats-grid" style={{ flex: 1, marginRight: 16 }}>
          <div className="scard">
            <span className="ico ico-primary"><Truck size={20} /></span>
            <div className="lbl">Active Salesmen</div>
            <div className="val">{activeSalesmen}</div>
          </div>
          <div className="scard">
            <span className="ico ico-warning"><Truck size={20} /></span>
            <div className="lbl">Allocated Today</div>
            <div className="val">{totalAllocated} pcs</div>
          </div>
          <div className="scard">
            <span className="ico ico-success"><CheckCircle size={20} /></span>
            <div className="lbl">Collected Today</div>
            <div className="val">{TK(totalCollected)}</div>
          </div>
        </div>
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddSalesman(true)}>
            <UserPlus size={16} /> Add Salesman
          </button>
        )}
      </div>

      {/* Salesman cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {salesmen.length === 0 && (
          <div className="dim" style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60 }}>
            No salesmen yet.{isAdmin && ' Click "Add Salesman" to create one.'}
          </div>
        )}

        {salesmen.map(sm => {
          const todayAllocs      = sm.allocations || [];
          const totalAllocQty    = todayAllocs.reduce((s, a) => s + a.qty, 0);
          const totalSoldQty     = todayAllocs.reduce((s, a) => s + (a.sold_qty    || 0), 0);
          const totalReturnedQty = todayAllocs.reduce((s, a) => s + (a.returned_qty|| 0), 0);
          const withSalesman     = Math.max(0, totalAllocQty - totalSoldQty - totalReturnedQty);
          const collectedAmt     = todayAllocs.reduce((s, a) => s + parseFloat(a.collected_amount || 0), 0);
          const hasUnreconciled  = todayAllocs.some(a => !a.is_reconciled && a.qty > 0);

          return (
            <div key={sm.id} className="card" style={{ opacity: sm.is_active ? 1 : 0.6 }}>

              {/* Card header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: sm.is_active ? 'var(--primary)' : 'var(--text-3)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 15, flexShrink: 0
                  }}>
                    {sm.avatar_initials || sm.name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{sm.name}</div>
                    <div className="dim tiny">{sm.phone || sm.email}</div>
                    {!sm.is_active && <span className="pill" style={{ fontSize: 10, marginTop: 2 }}>Inactive</span>}
                  </div>
                </div>

                {/* Card action buttons */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {sm.is_active && (
                    <button className="btn btn-primary btn-sm" onClick={() => openAllocate(sm)}>
                      <Plus size={13} /> Allocate
                    </button>
                  )}
                  {isAdmin && (
                    <>
                      <button className="btn btn-ghost btn-sm" title="Edit salesman" onClick={() => openEditSalesman(sm)}>
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        title={sm.is_active ? 'Deactivate' : 'Activate'}
                        onClick={() => window.confirm(`${sm.is_active ? 'Deactivate' : 'Activate'} ${sm.name}?`) && toggleActive(sm.id)}
                      >
                        <Power size={14} style={{ color: sm.is_active ? 'var(--error)' : 'var(--success)' }} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Today's allocations list */}
              {todayAllocs.length > 0 ? (
                <div style={{ marginBottom: 12 }}>
                  <div className="dim tiny" style={{ marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today's Allocations</div>
                  {todayAllocs.map(alloc => (
                    <div key={alloc.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 10px', borderRadius: 8, background: 'var(--bg)', marginBottom: 4
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {alloc.cylinder && <CylBadge cylinder={alloc.cylinder} size="sm" />}
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>
                            {alloc.cylinder?.name} {alloc.cylinder?.size}
                          </div>
                          <div className="dim tiny">
                            {alloc.qty} allocated · {alloc.sold_qty || 0} sold · {alloc.returned_qty || 0} returned
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {alloc.is_reconciled
                          ? <span className="pill pill-teal" style={{ fontSize: 11 }}>✓ Reconciled</span>
                          : (
                            <button
                              className="btn btn-soft btn-sm"
                              style={{ fontSize: 12, padding: '4px 10px' }}
                              onClick={() => openReconcile(sm, alloc)}
                            >
                              <RotateCcw size={12} /> Reconcile
                            </button>
                          )
                        }
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dim tiny" style={{ textAlign: 'center', padding: '10px 0 14px', borderBottom: '1px solid var(--border-soft)', marginBottom: 12 }}>
                  No allocations today
                </div>
              )}

              {/* Summary metrics row */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {[
                  { label: 'Allocated', value: totalAllocQty,    color: 'var(--text-1)'  },
                  { label: 'Sold',      value: totalSoldQty,     color: 'var(--success)' },
                  { label: 'Returned',  value: totalReturnedQty, color: 'var(--warning)' },
                  { label: 'With him',  value: withSalesman,     color: 'var(--primary)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
                    <div className="dim tiny">{label}</div>
                  </div>
                ))}
              </div>

              {collectedAmt > 0 && (
                <div style={{ textAlign: 'center', marginTop: 10, padding: '8px', background: 'var(--primary-soft)', borderRadius: 8 }}>
                  <span className="dim tiny">Collected: </span>
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{TK(collectedAmt)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ===== ALLOCATE STOCK MODAL ===== */}
      {showAllocate && selectedSalesman && (
        <Modal title={`Allocate Stock — ${selectedSalesman.name}`} onClose={() => setShowAllocate(false)}>
          <ErrorBanner error={allocateError} />
          <form onSubmit={e => {
            e.preventDefault();
            allocate({ salesmanId: selectedSalesman.id, data: {
              cylinder_id: parseInt(allocForm.cylinder_id),
              qty: parseInt(allocForm.qty),
            }});
          }}>
            <div style={{ marginBottom: 16 }}>
              <label className="label">Cylinder Type *</label>
              <select
                className="select"
                value={allocForm.cylinder_id}
                onChange={e => setAllocForm(f => ({...f, cylinder_id: e.target.value}))}
                required
              >
                <option value="">Select cylinder type...</option>
                {cylinders.map(c => (
                  <option key={c.id} value={c.id} disabled={(c.stock?.filled_qty || 0) === 0}>
                    {c.name} {c.size} — {c.stock?.filled_qty || 0} filled available
                    {(c.stock?.filled_qty || 0) === 0 ? ' (out of stock)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="label">Quantity *</label>
              <input
                type="number" className="input" min="1"
                value={allocForm.qty}
                onChange={e => setAllocForm(f => ({...f, qty: e.target.value}))}
                required
              />
              {allocForm.cylinder_id && (
                <div className="dim tiny" style={{ marginTop: 4 }}>
                  Available:{' '}
                  {cylinders.find(c => c.id === parseInt(allocForm.cylinder_id))?.stock?.filled_qty || 0} pcs
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAllocate(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isAllocating}>
                {isAllocating ? 'Allocating...' : 'Confirm Allocation'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ===== ADD SALESMAN MODAL ===== */}
      {showAddSalesman && (
        <Modal title="Add New Salesman" onClose={() => setShowAddSalesman(false)}>
          <ErrorBanner error={createSalesmanError} />
          <form onSubmit={e => { e.preventDefault(); createSalesman(salesmanForm); }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label className="label">Full Name *</label>
                <input className="input" placeholder="Karim Uddin" value={salesmanForm.name}
                  onChange={e => setSalesmanForm(f => ({...f, name: e.target.value}))} required />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" placeholder="01711-000000" value={salesmanForm.phone}
                  onChange={e => setSalesmanForm(f => ({...f, phone: e.target.value}))} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Email *</label>
              <input type="email" className="input" placeholder="karim@cylinderhub.com" value={salesmanForm.email}
                onChange={e => setSalesmanForm(f => ({...f, email: e.target.value}))} required />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="label">Password *</label>
              <input type="password" className="input" placeholder="Min 6 characters" value={salesmanForm.password}
                onChange={e => setSalesmanForm(f => ({...f, password: e.target.value}))} required minLength={6} />
              <div className="dim tiny" style={{ marginTop: 4 }}>The salesman will use this to log in on the mobile app</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAddSalesman(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isCreatingSalesman}>
                {isCreatingSalesman ? 'Creating...' : 'Create Salesman'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ===== EDIT SALESMAN MODAL ===== */}
      {showEditSalesman && selectedSalesman && (
        <Modal title={`Edit Salesman — ${selectedSalesman.name}`} onClose={() => setShowEditSalesman(false)}>
          <ErrorBanner error={updateSalesmanError} />
          <form onSubmit={e => {
            e.preventDefault();
            updateSalesman({ id: selectedSalesman.id, data: salesmanForm });
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label className="label">Full Name *</label>
                <input className="input" value={salesmanForm.name}
                  onChange={e => setSalesmanForm(f => ({...f, name: e.target.value}))} required />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={salesmanForm.phone}
                  onChange={e => setSalesmanForm(f => ({...f, phone: e.target.value}))} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Email *</label>
              <input type="email" className="input" value={salesmanForm.email}
                onChange={e => setSalesmanForm(f => ({...f, email: e.target.value}))} required />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="label">New Password <span className="dim">(leave blank to keep current)</span></label>
              <input type="password" className="input" placeholder="Leave blank to keep current"
                value={salesmanForm.password}
                onChange={e => setSalesmanForm(f => ({...f, password: e.target.value}))} minLength={6} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowEditSalesman(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isUpdatingSalesman}>
                {isUpdatingSalesman ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ===== RECONCILE MODAL ===== */}
      {showReconcile && selectedSalesman && selectedAllocation && (
        <Modal title="End-of-Day Reconcile" onClose={() => setShowReconcile(false)} size="md">
          <ErrorBanner error={reconcileError} />

          {/* Allocation summary banner */}
          <div style={{ background: 'var(--primary-soft)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {selectedAllocation.cylinder && <CylBadge cylinder={selectedAllocation.cylinder} size="sm" />}
                <div>
                  <div style={{ fontWeight: 600 }}>{selectedAllocation.cylinder?.name} {selectedAllocation.cylinder?.size}</div>
                  <div className="dim tiny">Salesman: {selectedSalesman.name}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>{selectedAllocation.qty}</div>
                <div className="dim tiny">Total allocated</div>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
            <div className="dim tiny" style={{ marginBottom: 4 }}>Currently recorded (from sales entries):</div>
            <div style={{ display: 'flex', gap: 20 }}>
              <div><span style={{ fontWeight: 600, color: 'var(--success)' }}>{selectedAllocation.sold_qty || 0}</span> <span className="dim tiny">sold</span></div>
              <div><span style={{ fontWeight: 600, color: 'var(--warning)' }}>{selectedAllocation.returned_qty || 0}</span> <span className="dim tiny">returned</span></div>
            </div>
          </div>

          <form onSubmit={e => {
            e.preventDefault();
            reconcile({
              allocationId: selectedAllocation.id,
              data: {
                sold_qty:         parseInt(reconcileForm.sold_qty)          || 0,
                returned_qty:     parseInt(reconcileForm.returned_qty)      || 0,
                collected_amount: parseFloat(reconcileForm.collected_amount)|| 0,
              },
            });
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label className="label">Actual Sold Qty *</label>
                <input type="number" className="input" min="0" max={selectedAllocation.qty}
                  value={reconcileForm.sold_qty}
                  onChange={e => setReconcileForm(f => ({...f, sold_qty: e.target.value}))} required />
                <div className="dim tiny" style={{ marginTop: 4 }}>
                  Max: {selectedAllocation.qty}
                </div>
              </div>
              <div>
                <label className="label">Empty Cylinders Returned *</label>
                <input type="number" className="input" min="0"
                  value={reconcileForm.returned_qty}
                  onChange={e => setReconcileForm(f => ({...f, returned_qty: e.target.value}))} required />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="label">Cash Collected ৳ *</label>
              <input type="number" className="input" min="0" step="0.01"
                placeholder="Total cash collected from customers"
                value={reconcileForm.collected_amount}
                onChange={e => setReconcileForm(f => ({...f, collected_amount: e.target.value}))} required />
            </div>

            {/* Preview */}
            {reconcileForm.sold_qty !== '' && (
              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                <div className="dim tiny" style={{ marginBottom: 6 }}>After reconcile:</div>
                <div style={{ display: 'flex', gap: 20 }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>
                      {Math.max(0, selectedAllocation.qty - parseInt(reconcileForm.sold_qty || 0) - parseInt(reconcileForm.returned_qty || 0))}
                    </span>
                    <span className="dim tiny"> unsold (will restore to stock)</span>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowReconcile(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isReconciling}>
                {isReconciling ? 'Reconciling...' : 'Confirm Reconcile'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
