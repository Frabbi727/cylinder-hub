// ============ Salesman Stock Allocation ============
function Allocation() {
  const [showAlloc, setShowAlloc] = useState(null); // salesman id

  return (
    <div className="content">
      <div className="content-head">
        <div>
          <h2>Salesman Stock Allocation</h2>
          <p>Hand out stock from the main inventory. Salesmen can only sell what they've been allocated.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAlloc('new')}><Ic.Plus size={16} /> Allocate stock</button>
      </div>

      <div className="stat-cards" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16 }}>
        <StatCard icon="Truck" tone="teal" label="Active salesmen" value={SALESMEN.length} foot="out on field today" />
        <StatCard icon="Package" tone="amber" label="Allocated today" value={SALESMEN.reduce((a,m)=>a+m.allocated.reduce((x,al)=>x+al.qty,0),0) + ' pcs'} foot="across all salesmen" />
        <StatCard icon="Dollar" tone="green" label="Collected today" value={TK(SALESMEN.reduce((a,m)=>a+m.collected,0))} foot="cash + due collection" />
      </div>

      <div className="col gap-4">
        {SALESMEN.map((m) => {
          const totalAlloc = m.allocated.reduce((a, al) => a + al.qty, 0);
          const remaining = totalAlloc - m.soldToday - m.returned;
          return (
            <div className="panel" key={m.id}>
              <div className="panel-body">
                <div className="row gap-4" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <span className="sm-ava" style={{ background: `linear-gradient(135deg, ${m.color}, ${m.color}cc)` }}>{m.avatar}</span>
                  <div className="flex-1" style={{ minWidth: 180 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{m.name}</div>
                    <div className="tiny muted row gap-2"><Ic.Phone size={12} /> {m.phone}</div>
                    <div className="row gap-2" style={{ marginTop: 10, flexWrap: 'wrap' }}>
                      {m.allocated.map((al) => {
                        const cyl = cylById(al.cyl);
                        return (
                          <span className="pill pill-teal" key={al.cyl}>
                            <CylBadge c={cyl} size="sm" />
                            <span style={{ marginLeft: 2 }}>{cyl.name} {cyl.size} · <b>{al.qty}</b></span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* day metrics */}
                  <div className="row gap-6" style={{ alignSelf: 'center' }}>
                    <DayMetric label="Allocated" val={totalAlloc} />
                    <DayMetric label="Sold" val={m.soldToday} tone="var(--primary)" />
                    <DayMetric label="Returned" val={m.returned} tone="var(--warning)" />
                    <DayMetric label="With him" val={remaining} tone={remaining > 0 ? 'var(--text-1)' : 'var(--success)'} />
                    <DayMetric label="Collected" val={TK(m.collected)} tone="#1A8C3F" money />
                  </div>

                  <div className="col gap-2" style={{ alignSelf: 'center' }}>
                    <button className="btn btn-soft btn-sm" onClick={() => setShowAlloc(m.id)}><Ic.Plus size={14} /> Allocate</button>
                    <button className="btn btn-ghost btn-sm"><Ic.RefreshCw size={14} /> Reconcile</button>
                  </div>
                </div>

                {/* progress of allocation sold */}
                <div style={{ marginTop: 16 }}>
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="tiny muted">Day progress</span>
                    <span className="tiny muted">{m.soldToday}/{totalAlloc} sold · {remaining} unsold to return</span>
                  </div>
                  <div className="stock-bar">
                    <div style={{ width: (m.soldToday/totalAlloc*100)+'%', background: 'var(--primary)', display:'inline-block', height:'100%' }}></div>
                    <div style={{ width: (m.returned/totalAlloc*100)+'%', background: 'var(--warning)', display:'inline-block', height:'100%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showAlloc && <AllocModal id={showAlloc} onClose={() => setShowAlloc(null)} />}
    </div>
  );
}

function DayMetric({ label, val, tone, money }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 56 }}>
      <div style={{ fontSize: money ? 16 : 20, fontWeight: 700, color: tone || 'var(--text-1)' }} className="taka">{val}</div>
      <div className="tiny dim" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, fontSize: 10 }}>{label}</div>
    </div>
  );
}

function AllocModal({ id, onClose }) {
  const sm = SALESMEN.find(s => s.id === id);
  const [rows, setRows] = useState([{ cyl: 'lpg12', qty: 10 }]);
  const addRow = () => setRows(r => [...r, { cyl: 'petro', qty: 5 }]);
  const setRow = (i, k, v) => setRows(r => r.map((row, idx) => idx === i ? { ...row, [k]: v } : row));
  const removeRow = (i) => setRows(r => r.filter((_, idx) => idx !== i));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Allocate stock {sm ? '— ' + sm.name : ''}</h3>
          <button className="icon-btn" onClick={onClose}><Ic.X size={18} /></button>
        </div>
        <div className="modal-body col gap-4">
          {!sm && (
            <label className="field"><span className="lbl">Salesman</span>
              <select className="select">{SALESMEN.map(s => <option key={s.id}>{s.name}</option>)}</select>
            </label>
          )}
          <div className="col gap-3">
            <span className="lbl">Stock to allocate</span>
            {rows.map((row, i) => {
              const stock = STOCK.find(s => s.cyl === row.cyl);
              return (
                <div className="row gap-3" key={i}>
                  <select className="select flex-1" value={row.cyl} onChange={e => setRow(i, 'cyl', e.target.value)}>
                    {CYLINDERS.filter(c=>c.status==='Active').map(c => <option key={c.id} value={c.id}>{c.name} · {c.size}</option>)}
                  </select>
                  <div className="stepper">
                    <button onClick={() => setRow(i, 'qty', Math.max(1, row.qty - 1))}><Ic.Minus size={14} /></button>
                    <span className="val">{row.qty}</span>
                    <button onClick={() => setRow(i, 'qty', row.qty + 1)}><Ic.Plus size={14} /></button>
                  </div>
                  <button className="icon-btn" onClick={() => removeRow(i)} disabled={rows.length === 1}><Ic.X size={16} /></button>
                  <span className="tiny dim" style={{ minWidth: 64 }}>of {stock ? stock.filled : 0} filled</span>
                </div>
              );
            })}
            <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={addRow}><Ic.Plus size={14} /> Add another type</button>
          </div>
          <div className="note"><Ic.Info size={15} /> Allocated stock is deducted from main filled stock immediately.</div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onClose}><Ic.Truck size={15} /> Allocate {rows.reduce((a,r)=>a+r.qty,0)} pcs</button>
        </div>
      </div>
    </div>
  );
}

window.Allocation = Allocation;
