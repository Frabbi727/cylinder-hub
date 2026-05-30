// ============ Purchases & Lots + FIFO hero ============
function Purchases() {
  const [showAdd, setShowAdd] = useState(false);
  return (
    <div className="content">
      <div className="content-head">
        <div>
          <h2>Purchases & FIFO Lots</h2>
          <p>Every purchase is a <b>lot</b> with its own cost. Profit is calculated First-In-First-Out.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Ic.Plus size={16} /> New purchase lot</button>
      </div>

      <FifoHero />

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel-head">
          <h3><Ic.Layers size={17} style={{ color: 'var(--primary)' }} /> Recent purchase lots</h3>
          <span className="sub">{PURCHASES.length} lots</span>
        </div>
        <div className="panel-body flush">
          <table className="dtable">
            <thead><tr>
              <th>Lot</th><th>Date</th><th>Cylinder</th><th>Supplier</th>
              <th className="num">Qty</th><th className="num">Unit cost</th><th className="num">Total</th>
              <th className="num">Due</th><th>Status</th>
            </tr></thead>
            <tbody>
              {PURCHASES.map((p) => (
                <tr key={p.id}>
                  <td className="strong">{p.id}</td>
                  <td className="dim tiny">{p.date}</td>
                  <td><CylCell c={p.cyl} /></td>
                  <td className="muted">{p.supplier === 'Self' ? <span className="pill pill-purple">Self</span> : p.supplier}</td>
                  <td className="num">{p.qty}</td>
                  <td className="num taka">{TK(p.cost)}</td>
                  <td className="num strong taka">{TK(p.total)}</td>
                  <td className="num taka" style={{ color: p.due ? 'var(--error)' : 'var(--text-3)' }}>{p.due ? TK(p.due) : '—'}</td>
                  <td><StatusPill s={p.status} withIcon /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <AddLotModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

// ---- FIFO hero: queue + live sale simulator ----
function FifoHero() {
  const SELL = 200;
  const initial = LOTS.map(l => ({ ...l, remaining: l.qty - l.sold, sold0: l.sold }));
  const [lots, setLots] = useState(initial);
  const [qty, setQty] = useState(12);
  const [price, setPrice] = useState(SELL);
  const [breakdown, setBreakdown] = useState(null);
  const [consuming, setConsuming] = useState([]);

  const available = lots.reduce((a, l) => a + l.remaining, 0);

  function simulate() {
    let need = Math.min(qty, available);
    const rows = [];
    const touched = [];
    const next = lots.map(l => ({ ...l }));
    for (const l of next) {
      if (need <= 0) break;
      if (l.remaining <= 0) continue;
      const take = Math.min(l.remaining, need);
      l.remaining -= take;
      l.sold += take;
      if (l.remaining === 0) l.status = 'Done';
      else l.status = 'Active';
      rows.push({ id: l.id, take, cost: l.cost, sell: price, profit: take * (price - l.cost) });
      touched.push(l.id);
      need -= take;
    }
    // promote next pending lot to active if current done
    const firstWithStock = next.find(l => l.remaining > 0);
    next.forEach(l => { if (l.status !== 'Done') l.status = (l === firstWithStock ? 'Active' : (l.remaining > 0 ? 'Pending' : 'Done')); });
    setConsuming(touched);
    setLots(next);
    setBreakdown({ rows, total: rows.reduce((a, r) => a + r.profit, 0), units: rows.reduce((a, r) => a + r.take, 0), revenue: rows.reduce((a,r)=>a+r.take*price,0) });
    setTimeout(() => setConsuming([]), 900);
  }
  function reset() {
    setLots(initial.map(l => ({ ...l })));
    setBreakdown(null); setConsuming([]);
  }

  return (
    <div className="panel" style={{ overflow: 'hidden' }}>
      <div className="panel-head">
        <h3><Ic.Flame size={18} style={{ color: 'var(--primary)' }} /> FIFO Lot Queue — Petromax <span className="badge" style={{ marginLeft: 6 }}>★ CORE</span></h3>
        <span className="sub">Oldest stock sells first</span>
      </div>

      {/* queue */}
      <div className="panel-body" style={{ paddingBottom: 6 }}>
        <div className="fifo-queue">
          {lots.map((l, i) => {
            const pct = Math.round(l.sold / l.qty * 100);
            const isConsuming = consuming.includes(l.id);
            return (
              <React.Fragment key={l.id}>
                <div className={'lot-card ' + l.status.toLowerCase() + (isConsuming ? ' consuming' : '')}>
                  <div className="lot-head">
                    <span className="lot-id">{l.id}</span>
                    <StatusPill s={l.status} withIcon />
                  </div>
                  <div className="lot-date">Bought {l.date}</div>
                  <div className="lot-price">{TK(l.cost)}<span className="u"> /pc cost</span></div>
                  <div className="lot-meter"><div style={{ width: pct + '%', background: l.status === 'Done' ? 'var(--text-3)' : 'var(--success)' }}></div></div>
                  <div className="lot-qty"><span>Sold <b>{l.sold}</b>/{l.qty}</span><span>Left <b>{l.remaining}</b></span></div>
                </div>
                {i < lots.length - 1 && <span className="lot-arrow"><Ic.ArrowRight size={18} /></span>}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* simulator */}
      <div className="sim-wrap" style={{ borderTop: '1px solid var(--border-soft)' }}>
        <div className="sim-form">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Try a sale</div>
          <label className="field" style={{ marginBottom: 14 }}>
            <span className="lbl">Quantity to sell</span>
            <div className="stepper" style={{ width: '100%', justifyContent: 'space-between' }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))}><Ic.Minus size={15} /></button>
              <span className="val flex-1">{qty}</span>
              <button onClick={() => setQty(q => q + 1)}><Ic.Plus size={15} /></button>
            </div>
          </label>
          <label className="field" style={{ marginBottom: 16 }}>
            <span className="lbl">Sell price (per piece)</span>
            <div className="input-group">
              <span className="input-icon" style={{ fontWeight: 600 }}>৳</span>
              <input className="input" type="number" value={price} onChange={(e) => setPrice(+e.target.value || 0)} />
            </div>
          </label>
          <div className="note" style={{ marginBottom: 14, fontSize: 12 }}>
            <Ic.Info size={14} /> {available} pcs available across active lots
          </div>
          <button className="btn btn-primary btn-block" onClick={simulate} disabled={available === 0}>
            <Ic.Flame size={16} /> Simulate FIFO sale
          </button>
          <button className="btn btn-ghost btn-block btn-sm" style={{ marginTop: 8 }} onClick={reset}>
            <Ic.RefreshCw size={14} /> Reset queue
          </button>
        </div>

        <div className="sim-result">
          {!breakdown ? (
            <div className="empty-hint">
              <Ic.Layers size={28} style={{ color: 'var(--text-3)', marginBottom: 8 }} />
              <div>Run a sale to see how profit is split across lots, oldest first.</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Profit breakdown</div>
              <div className="tiny muted" style={{ marginBottom: 14 }}>Sold {breakdown.units} pcs @ {TK(price)} · revenue {TK(breakdown.revenue)}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 10, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-3)', padding: '0 14px 6px' }}>
                <span>Source lot</span><span style={{textAlign:'right'}}>Qty</span><span style={{textAlign:'right'}}>Cost</span><span style={{textAlign:'right'}}>Profit</span>
              </div>
              {breakdown.rows.map((r, i) => (
                <div className="breakdown-row" key={r.id}>
                  <span className="src">{r.id}</span>
                  <span className="num">{r.take} pc</span>
                  <span className="num muted taka">{TK(r.cost)}</span>
                  <span className="num profit">+{TK(r.profit)}</span>
                </div>
              ))}
              <div className="profit-total">
                <div>
                  <div className="tiny" style={{ color: '#1A8C3F', fontWeight: 600 }}>TOTAL FIFO PROFIT</div>
                  <div className="tiny muted">{breakdown.rows.length} lot{breakdown.rows.length > 1 ? 's' : ''} consumed</div>
                </div>
                <div className="big">+{TK(breakdown.total)}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AddLotModal({ onClose }) {
  const [self, setSelf] = useState(false);
  const [qty, setQty] = useState(50);
  const [cost, setCost] = useState(1180);
  const [paid, setPaid] = useState(0);
  const total = qty * cost;
  const due = Math.max(0, total - paid);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>New purchase lot</h3>
          <button className="icon-btn" onClick={onClose}><Ic.X size={18} /></button>
        </div>
        <div className="modal-body col gap-4">
          <div className="grid-2">
            <label className="field"><span className="lbl">Supplier</span>
              <select className="select" disabled={self}>
                {SUPPLIERS.filter(s=>s.type!=='Self').map(s => <option key={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="field"><span className="lbl">Date</span><input className="input" type="date" defaultValue="2026-05-30" /></label>
          </div>
          <label className="check"><input type="checkbox" checked={self} onChange={e => setSelf(e.target.checked)} /><span className="check-box"><Ic.Check size={12} /></span> I bought this myself (use "Self" supplier)</label>
          <label className="field"><span className="lbl">Cylinder type</span>
            <select className="select">{CYLINDERS.map(c => <option key={c.id}>{c.name} · {c.size}</option>)}</select>
          </label>
          <div className="grid-2">
            <label className="field"><span className="lbl">Quantity</span><input className="input" type="number" value={qty} onChange={e => setQty(+e.target.value||0)} /></label>
            <label className="field"><span className="lbl">Unit cost (this lot)</span>
              <div className="input-group"><span className="input-icon">৳</span><input className="input" type="number" value={cost} onChange={e => setCost(+e.target.value||0)} /></div>
            </label>
          </div>
          <div className="grid-2">
            <label className="field"><span className="lbl">Amount paid</span>
              <div className="input-group"><span className="input-icon">৳</span><input className="input" type="number" value={paid} onChange={e => setPaid(+e.target.value||0)} /></div>
            </label>
            <div className="field"><span className="lbl">Due (auto)</span>
              <div className="input" style={{ background: 'var(--bg)', fontWeight: 700, color: due ? 'var(--error)' : 'var(--success)' }}>{TK(due)}</div>
            </div>
          </div>
          <div className="row" style={{ justifyContent: 'space-between', padding: '12px 14px', background: 'var(--primary-soft)', borderRadius: 'var(--r-input)', color: 'var(--primary-dark)' }}>
            <span style={{ fontWeight: 600 }}>Lot total</span>
            <span style={{ fontSize: 18, fontWeight: 800 }}>{TK(total)}</span>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onClose}>Save lot</button>
        </div>
      </div>
    </div>
  );
}

window.Purchases = Purchases;
