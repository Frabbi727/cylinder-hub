// ============ Inventory & Stock ============
function Inventory() {
  const [tab, setTab] = useState('stock');
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="content">
      <div className="content-head">
        <div>
          <h2>Inventory & Stock</h2>
          <p>Manage cylinder types and track filled / empty stock in real time.</p>
        </div>
        <div className="row gap-3">
          <div className="seg2">
            <button className={tab === 'stock' ? 'active' : ''} onClick={() => setTab('stock')}>Stock</button>
            <button className={tab === 'types' ? 'active' : ''} onClick={() => setTab('types')}>Cylinder Types</button>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Ic.Plus size={16} /> Add type</button>
        </div>
      </div>

      {tab === 'stock' ? <StockView /> : <TypesView onAdd={() => setShowAdd(true)} />}

      {showAdd && <AddTypeModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function StockView() {
  const totalFilled = STOCK.reduce((a, s) => a + s.filled, 0);
  const totalEmpty = STOCK.reduce((a, s) => a + s.empty, 0);
  return (
    <div className="col gap-4">
      <div className="stat-cards" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <StatCard icon="Package" tone="teal" label="Total Filled" value={totalFilled + ' pcs'} foot="ready to sell" />
        <StatCard icon="RefreshCw" tone="amber" label="Total Empty" value={totalEmpty + ' pcs'} foot="awaiting refill / return" />
        <StatCard icon="Alert" tone="coral" label="Below reorder level" value={STOCK.filter(s => s.filled <= s.reorder).length + ' types'} foot="need restock" />
      </div>

      <div className="grid-2">
        {STOCK.map((s) => {
          const cyl = cylById(s.cyl);
          const low = s.filled <= s.reorder;
          const fp = Math.round(s.filled / s.cap * 100);
          return (
            <div className="panel" key={s.cyl}>
              <div className="panel-body">
                <div className="row gap-3" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
                  <div className="row gap-3">
                    <CylBadge c={cyl} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{cyl.name}</div>
                      <div className="tiny muted">{cyl.size} · {cyl.brands}</div>
                    </div>
                  </div>
                  {low
                    ? <span className="pill pill-coral"><Ic.Alert size={12} /> Reorder</span>
                    : <span className="pill pill-green">In stock</span>}
                </div>

                <div className="row gap-4" style={{ marginBottom: 12 }}>
                  <div className="flex-1">
                    <div className="tiny dim">Filled</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--primary)' }}>{s.filled}</div>
                  </div>
                  <div style={{ width: 1, background: 'var(--border-soft)', alignSelf: 'stretch' }}></div>
                  <div className="flex-1">
                    <div className="tiny dim">Empty</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--warning)' }}>{s.empty}</div>
                  </div>
                  <div className="flex-1">
                    <div className="tiny dim">Capacity</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-3)' }}>{s.cap}</div>
                  </div>
                </div>

                <StockBar filled={s.filled} empty={s.empty} cap={s.cap} />
                <div className="tiny muted" style={{ marginTop: 7 }}>{fp}% of capacity filled · reorder at {s.reorder}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="note">
        <Ic.Info size={16} />
        Filled stock rises on purchase and drops on sale / salesman allocation. Empty stock rises when customers return empties and drops on refill or supplier return.
      </div>
    </div>
  );
}

function TypesView({ onAdd }) {
  return (
    <div className="panel">
      <div className="panel-body flush">
        <table className="dtable">
          <thead><tr>
            <th>Cylinder</th><th>Size</th><th>Brands / examples</th><th className="num">Filled</th><th className="num">Empty</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>
            {CYLINDERS.map((c) => {
              const st = STOCK.find(s => s.cyl === c.id) || { filled: 0, empty: 0 };
              return (
                <tr key={c.id}>
                  <td><div className="row gap-3"><CylBadge c={c} size="sm" /><span className="cell-main">{c.name}</span></div></td>
                  <td className="muted">{c.size}</td>
                  <td className="muted">{c.brands}</td>
                  <td className="num strong">{st.filled}</td>
                  <td className="num strong">{st.empty}</td>
                  <td><StatusPill s={c.status} withIcon /></td>
                  <td className="num"><button className="icon-btn" style={{ width: 30, height: 30 }}><Ic.Settings size={15} /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddTypeModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Add cylinder type</h3>
          <button className="icon-btn" onClick={onClose}><Ic.X size={18} /></button>
        </div>
        <div className="modal-body col gap-4">
          <div className="grid-2">
            <label className="field"><span className="lbl">Name</span><input className="input" placeholder="e.g. LP Gas" /></label>
            <label className="field"><span className="lbl">Size</span><input className="input" placeholder="e.g. 12 kg" /></label>
          </div>
          <label className="field"><span className="lbl">Brands / examples</span><input className="input" placeholder="e.g. Bashundhara, Omera" /></label>
          <div className="grid-2">
            <label className="field"><span className="lbl">Reorder level</span><input className="input" type="number" defaultValue={20} /></label>
            <label className="field"><span className="lbl">Status</span>
              <select className="select" defaultValue="Active"><option>Active</option><option>Inactive</option></select>
            </label>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onClose}>Save type</button>
        </div>
      </div>
    </div>
  );
}

window.Inventory = Inventory;
