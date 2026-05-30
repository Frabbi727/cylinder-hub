// ============ Salesman mobile app peek ============
function Salesman() {
  return (
    <div className="content">
      <div className="content-head">
        <div>
          <h2>Salesman Mobile App</h2>
          <p>The field experience — limited access, built for quick selling and collection on Android.</p>
        </div>
        <span className="pill pill-purple"><Ic.Phone size={13} /> Android · limited access</span>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '1fr 360px', alignItems: 'start' }}>
        {/* what they can do */}
        <div className="panel">
          <div className="panel-head"><h3><Ic.Shield size={17} style={{ color: 'var(--primary)' }} /> What the salesman can do</h3></div>
          <div className="panel-body col gap-4">
            <CapRow icon="Package" tone="teal"  title="See only their allocated stock" desc="They sell from what the admin handed them — nothing else." />
            <CapRow icon="Receipt" tone="green" title="Record sales (cash / due / partial)" desc="FIFO cost is applied automatically behind the scenes." />
            <CapRow icon="Wallet"  tone="amber" title="Collect customer dues" desc="Every collection is logged with their name and time." />
            <CapRow icon="RefreshCw" tone="purple" title="Log empty cylinder returns" desc="Empties returned by customers flow back to the admin's empty stock." />
            <div className="note"><Ic.Info size={15} /> Salesmen cannot edit lots, see profit, delete entries, or touch other salesmen's stock. The admin reconciles everyone at day's end.</div>
          </div>
        </div>

        {/* phones */}
        <div className="phone-stage" style={{ justifyContent: 'center' }}>
          <SalesmanPhone />
        </div>
      </div>
    </div>
  );
}

function CapRow({ icon, tone, title, desc }) {
  return (
    <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
      <span className={'ico ' + tone} style={{ marginBottom: 0, flex: 'none' }}>{React.createElement(Ic[icon], { size: 19 })}</span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        <div className="tiny muted" style={{ marginTop: 2 }}>{desc}</div>
      </div>
    </div>
  );
}

function SalesmanPhone() {
  const [tab, setTab] = useState('stock');
  const me = SALESMEN[0];
  return (
    <div className="phone">
      <div className="phone-notch"></div>
      <div className="phone-screen">
        {/* app header */}
        <div style={{ background: 'var(--primary)', color: '#fff', padding: '34px 18px 16px' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Salesman</div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{me.name}</div>
            </div>
            <span className="avatar" style={{ background: 'rgba(255,255,255,0.2)' }}>{me.avatar}</span>
          </div>
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
          {tab === 'stock' ? <PhoneStock me={me} /> : <PhoneSell me={me} />}
        </div>

        {/* tab bar */}
        <div className="row" style={{ borderTop: '1px solid var(--border-soft)', background: '#fff' }}>
          {[['stock','Package','My Stock'],['sell','Plus','Sell'],['due','Wallet','Collect']].map(([id, ic, lbl]) => (
            <button key={id} onClick={() => setTab(id === 'due' ? 'stock' : id)}
              style={{ flex: 1, border: 'none', background: 'transparent', padding: '10px 0',
                color: tab === id ? 'var(--primary)' : 'var(--text-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 600 }}>
              {React.createElement(Ic[ic], { size: 20 })}{lbl}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PhoneStock({ me }) {
  return (
    <div className="col gap-3">
      <div className="row gap-2" style={{ justifyContent: 'space-between' }}>
        <div style={{ background: '#fff', border: '1px solid var(--border-soft)', borderRadius: 12, padding: '12px 14px', flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>{me.soldToday}</div>
          <div className="tiny dim">Sold today</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--border-soft)', borderRadius: 12, padding: '12px 14px', flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1A8C3F' }} className="taka">{TK(me.collected)}</div>
          <div className="tiny dim">Collected</div>
        </div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 4 }}>My allocated stock</div>
      {me.allocated.map((al) => {
        const cyl = cylById(al.cyl);
        const left = al.qty - 2;
        return (
          <div key={al.cyl} style={{ background: '#fff', border: '1px solid var(--border-soft)', borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', gap: 11 }}>
            <CylBadge c={cyl} size="sm" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{cyl.name}</div>
              <div className="tiny dim">{cyl.size}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{left}</div>
              <div className="tiny dim">of {al.qty}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PhoneSell({ me }) {
  const cyl = cylById(me.allocated[0].cyl);
  return (
    <div className="col gap-3">
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>New sale</div>
      <div style={{ background: '#fff', border: '1px solid var(--border-soft)', borderRadius: 12, padding: 12 }}>
        <div className="tiny dim" style={{ marginBottom: 6 }}>Cylinder</div>
        <div className="row gap-2"><CylBadge c={cyl} size="sm" /><span style={{ fontSize: 13, fontWeight: 600 }}>{cyl.name} · {cyl.size}</span></div>
      </div>
      <div className="row gap-2">
        <div style={{ background: '#fff', border: '1px solid var(--border-soft)', borderRadius: 12, padding: 12, flex: 1 }}>
          <div className="tiny dim">Qty</div><div style={{ fontSize: 18, fontWeight: 700 }}>2</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--border-soft)', borderRadius: 12, padding: 12, flex: 1 }}>
          <div className="tiny dim">Price/pc</div><div style={{ fontSize: 18, fontWeight: 700 }} className="taka">{TK(1450)}</div>
        </div>
      </div>
      <div className="row gap-2">
        <span className="pill pill-green" style={{ flex: 1, justifyContent: 'center', padding: '9px' }}>Cash</span>
        <span className="pill" style={{ flex: 1, justifyContent: 'center', padding: '9px' }}>Due</span>
        <span className="pill" style={{ flex: 1, justifyContent: 'center', padding: '9px' }}>Partial</span>
      </div>
      <div style={{ background: 'var(--primary-soft)', borderRadius: 12, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--primary-dark)' }}>
        <span style={{ fontWeight: 600 }}>Total</span><span style={{ fontSize: 18, fontWeight: 800 }} className="taka">{TK(2900)}</span>
      </div>
      <button className="btn btn-primary btn-block btn-lg"><Ic.Check size={17} /> Confirm sale</button>
    </div>
  );
}

window.Salesman = Salesman;
