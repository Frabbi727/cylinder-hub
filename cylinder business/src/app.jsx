// ============ Cylinder Admin — main app ============
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "teal",
  "density": "regular"
}/*EDITMODE-END*/;

const PALETTES = {
  teal:   { name: 'Teal', dot: '#1A6B72' },
  blue:   { name: 'Deep Blue', dot: '#1E4F91' },
  orange: { name: 'Industrial', dot: '#C2541C' },
};

function App() {
  const [route, setRoute] = useState('dashboard');
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  useEffect(() => {
    const el = document.documentElement;
    if (t.palette === 'teal') el.removeAttribute('data-theme');
    else el.setAttribute('data-theme', t.palette);
  }, [t.palette]);

  const screens = {
    dashboard: Dashboard,
    inventory: Inventory,
    purchase: Purchases,
    allocation: Allocation,
    salesman: Salesman,
  };
  const Screen = screens[route] || Dashboard;

  return (
    <div className="admin-shell">
      <Sidebar route={route} setRoute={setRoute} />
      <div className="main-col">
        <Topbar route={route} />
        <Screen />
      </div>

      <TweaksPanel>
        <TweakSection label="Theme palette" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 2px 8px' }}>
          {Object.entries(PALETTES).map(([k, p]) => (
            <button key={k} onClick={() => setTweak('palette', k)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8,
                background: t.palette === k ? 'var(--primary-soft)' : 'transparent',
                border: t.palette === k ? '1px solid var(--primary)' : '1px solid var(--border-soft)',
                cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ width: 22, height: 22, borderRadius: 6, background: p.dot, flex: 'none' }}></span>
              <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{p.name}</span>
              {t.palette === k && <Ic.Check size={15} style={{ color: 'var(--primary)' }} />}
            </button>
          ))}
        </div>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
