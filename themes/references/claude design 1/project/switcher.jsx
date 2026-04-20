// ================== Market Switcher (Idioma + Moneda) ==================
// Pill combinado para header + select standalone para footer.
// Variante default: compact. Las 3 variantes (compact/chips/segmented)
// se pueden cambiar vía prop `groupStyle`.

const LOCALES = [
  { code: 'es', flag: '🇨🇴', native: 'Español' },
  { code: 'en', flag: '🇺🇸', native: 'English' },
  { code: 'pt', flag: '🇧🇷', native: 'Português' },
  { code: 'fr', flag: '🇫🇷', native: 'Français' },
  { code: 'de', flag: '🇩🇪', native: 'Deutsch' },
  { code: 'it', flag: '🇮🇹', native: 'Italiano' },
  { code: 'nl', flag: '🇳🇱', native: 'Nederlands' },
];

const CURRENCIES = [
  { code: 'COP', sym: '$',    name: 'Peso colombiano' },
  { code: 'USD', sym: '$',    name: 'US Dollar' },
  { code: 'EUR', sym: '€',    name: 'Euro' },
  { code: 'MXN', sym: 'Mex$', name: 'Peso mexicano' },
  { code: 'BRL', sym: 'R$',   name: 'Real' },
];

// localStorage keys per spec
const LANG_KEY = 'bukeer.site.lang';
const CUR_KEY  = 'bukeer.site.currency';

function readPref(key, fallback) {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}
function writePref(key, val) {
  try { localStorage.setItem(key, val); } catch {}
}

// --- Small caret ---
function SwCaret({ open }) {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none"
      style={{ opacity: .6, transition: 'transform .2s cubic-bezier(.2,.7,.2,1)', transform: open ? 'rotate(180deg)' : 'none' }}>
      <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ================== MAIN HEADER PILL ==================
function MarketSwitcher({ onDark = false, groupStyle = 'compact' }) {
  const [lang, setLang] = useState(() => readPref(LANG_KEY, 'es'));
  const [cur,  setCur]  = useState(() => readPref(CUR_KEY, 'COP'));
  const [open, setOpen] = useState(false);
  const [reloading, setReloading] = useState(false);
  const anchorRef = useRef(null);

  const L = LOCALES.find(l => l.code === lang) || LOCALES[0];
  const C = CURRENCIES.find(c => c.code === cur) || CURRENCIES[0];

  useEffect(() => {
    const h = (e) => { if (!anchorRef.current?.contains(e.target)) setOpen(false); };
    const k = (e) => { if (e.key === 'Escape') setOpen(false); };
    if (open) {
      document.addEventListener('mousedown', h);
      document.addEventListener('keydown', k);
    }
    return () => {
      document.removeEventListener('mousedown', h);
      document.removeEventListener('keydown', k);
    };
  }, [open]);

  const onPickLang = (code) => {
    writePref(LANG_KEY, code);
    setLang(code);
    // Simulate SSR full-page reload (in real app → window.location.href = translated path)
    setReloading(true);
    setTimeout(() => setReloading(false), 1400);
  };
  const onPickCur = (code) => {
    writePref(CUR_KEY, code);
    setCur(code);
    // In real app: updatePreferenceParam(?currency=X) — soft URL update
  };

  return (
    <>
      <div className="mkt-anchor" ref={anchorRef}>
        <button
          className={`mkt-pill ${open ? 'open' : ''} ${onDark ? 'on-dark' : ''}`}
          onClick={() => setOpen(o => !o)}
          aria-haspopup="dialog" aria-expanded={open}
          aria-label={`Idioma ${L.native}, moneda ${C.code}`}
        >
          <span className="mkt-flag">{L.flag}</span>
          <span className="mkt-code">{L.code.toUpperCase()}</span>
          <span className="mkt-sep" />
          <span className="mkt-cur"><span className="mkt-sym">{C.sym}</span>{C.code}</span>
          <SwCaret open={open} />
        </button>

        {open && (
          <div className="mkt-pop" role="dialog" aria-label="Personaliza tu experiencia">
            <div className="mkt-pop-head">Personaliza tu <em>experiencia</em></div>
            <div className="mkt-pop-desc">Idioma del sitio y moneda de precios.</div>

            <div className="mkt-pop-sub">Idioma</div>
            <SwGroup kind="lang" groupStyle={groupStyle} value={lang} onChange={onPickLang} />

            <hr className="mkt-pop-div" />

            <div className="mkt-pop-sub">Moneda</div>
            <SwGroup kind="cur" groupStyle={groupStyle} value={cur} onChange={onPickCur} />

            <div className="mkt-pop-foot">
              <span>Guardado en este navegador</span>
            </div>
          </div>
        )}
      </div>

      {reloading && (
        <div className="mkt-reload" role="status" aria-live="polite">
          <div className="mkt-spinner" />
          <p>Cargando en <em>{L.native}</em>…</p>
        </div>
      )}
    </>
  );
}

// ================== SHARED GROUP RENDERER ==================
function SwGroup({ kind, groupStyle, value, onChange }) {
  const items = kind === 'lang' ? LOCALES : CURRENCIES;

  if (groupStyle === 'chips') {
    return (
      <div className="mkt-chips">
        {items.map(it => {
          const k = kind === 'lang' ? it.code : it.code;
          const on = k === value;
          return (
            <button key={k}
              className={`mkt-chip ${on ? 'on' : ''} ${kind === 'lang' ? 'accent' : ''}`}
              onClick={() => onChange(k)}>
              {kind === 'lang'
                ? <><span className="mkt-chip-flag">{it.flag}</span>{it.code.toUpperCase()}</>
                : <><span className="mkt-chip-sym">{it.sym}</span>{it.code}</>}
            </button>
          );
        })}
      </div>
    );
  }

  if (groupStyle === 'segmented') {
    return (
      <div className="mkt-seg" style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, 1fr)` }}>
        {items.map(it => {
          const on = it.code === value;
          return (
            <button key={it.code} className={on ? 'on' : ''} onClick={() => onChange(it.code)}>
              {kind === 'lang'
                ? <><span className="mkt-seg-flag">{it.flag}</span><span className="mkt-seg-code">{it.code}</span></>
                : <span className="mkt-seg-code"><b style={{marginRight:3,fontWeight:700}}>{it.sym}</b>{it.code}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  // compact (default) — one row per option
  return (
    <div className="mkt-list">
      {items.map(it => {
        const on = it.code === value;
        return (
          <button key={it.code}
            className={`mkt-item ${on ? 'on' : ''}`}
            onClick={() => onChange(it.code)}>
            <span className="mkt-item-lead">
              {kind === 'lang'
                ? <span className="mkt-item-flag">{it.flag}</span>
                : <span className="mkt-item-sym">{it.sym}</span>}
            </span>
            <span className="mkt-item-label">
              {kind === 'lang' ? it.native : it.name}
            </span>
            <span className="mkt-item-hint">
              {kind === 'lang' ? it.code.toUpperCase() : it.code}
            </span>
            {on && <span className="mkt-item-dot" />}
          </button>
        );
      })}
    </div>
  );
}

// ================== FOOTER STANDALONE ==================
function FooterSwitcher() {
  const [lang, setLang] = useState(() => readPref(LANG_KEY, 'es'));
  const [cur,  setCur]  = useState(() => readPref(CUR_KEY, 'COP'));

  const onLang = (e) => {
    const code = e.target.value;
    writePref(LANG_KEY, code);
    setLang(code);
    // Real app: translate path + reload. Demo: noop.
  };
  const onCur = (e) => {
    const code = e.target.value;
    writePref(CUR_KEY, code);
    setCur(code);
  };

  const L = LOCALES.find(l => l.code === lang) || LOCALES[0];
  const C = CURRENCIES.find(c => c.code === cur) || CURRENCIES[0];

  return (
    <div className="mkt-footer">
      <label className="mkt-footer-select">
        <span className="mkt-footer-flag">{L.flag}</span>
        <span className="mkt-footer-text">{L.native}</span>
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none" style={{opacity:.6}}>
          <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        <select value={lang} onChange={onLang} aria-label="Cambiar idioma">
          {LOCALES.map(l => <option key={l.code} value={l.code}>{l.native}</option>)}
        </select>
      </label>
      <label className="mkt-footer-select">
        <span className="mkt-footer-sym">{C.sym}</span>
        <span className="mkt-footer-text">{C.code}</span>
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none" style={{opacity:.6}}>
          <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        <select value={cur} onChange={onCur} aria-label="Cambiar moneda">
          {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
        </select>
      </label>
    </div>
  );
}

// Export to window so other babel scripts can pick them up
Object.assign(window, { MarketSwitcher, FooterSwitcher });
