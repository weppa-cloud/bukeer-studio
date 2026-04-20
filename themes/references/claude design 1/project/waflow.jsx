// ============================================================
// Fase 1 — WhatsApp Flow
// WAFlowDrawer (variantes A/B/D), HowItWorks, TrustBarF1, WAFab
// Context provider + helpers
// ============================================================

const WAFlowCtx = React.createContext(null);
const useWAFlow = () => React.useContext(WAFlowCtx);

// ---------- Business config ----------
const WA_BUSINESS_NUMBER = "573001234567"; // placeholder — replace with real
const WA_RESPONSE_TIME = "3 min";

const COUNTRIES = [
  { c: "CO", name: "Colombia", code: "+57", flag: "🇨🇴", len: 10 },
  { c: "US", name: "Estados Unidos", code: "+1", flag: "🇺🇸", len: 10 },
  { c: "MX", name: "México", code: "+52", flag: "🇲🇽", len: 10 },
  { c: "ES", name: "España", code: "+34", flag: "🇪🇸", len: 9 },
  { c: "FR", name: "Francia", code: "+33", flag: "🇫🇷", len: 9 },
  { c: "DE", name: "Alemania", code: "+49", flag: "🇩🇪", len: 11 },
  { c: "AR", name: "Argentina", code: "+54", flag: "🇦🇷", len: 10 },
  { c: "CL", name: "Chile", code: "+56", flag: "🇨🇱", len: 9 },
  { c: "PE", name: "Perú", code: "+51", flag: "🇵🇪", len: 9 },
  { c: "BR", name: "Brasil", code: "+55", flag: "🇧🇷", len: 11 },
  { c: "CA", name: "Canadá", code: "+1", flag: "🇨🇦", len: 10 },
  { c: "GB", name: "Reino Unido", code: "+44", flag: "🇬🇧", len: 10 },
  { c: "IT", name: "Italia", code: "+39", flag: "🇮🇹", len: 10 },
];

// Interest chips per destination (overrides base)
const BASE_INTERESTS = ["Relax", "Aventura", "Cultura", "Gastronomía", "Naturaleza", "Familiar"];
const DEST_INTERESTS = {
  cartagena:     ["Relax", "Playa", "Historia", "Gastronomía", "Vida nocturna", "Familiar"],
  "san-andres":  ["Playa", "Buceo", "Relax", "Familiar", "Gastronomía", "Aventura"],
  "eje-cafetero":["Naturaleza", "Aventura", "Café", "Cultura", "Avistamiento", "Familiar"],
  tayrona:       ["Aventura", "Playa", "Naturaleza", "Senderismo", "Cultura", "Relax"],
  medellin:      ["Cultura", "Gastronomía", "Vida nocturna", "Arte urbano", "Naturaleza", "Familiar"],
  guatape:       ["Naturaleza", "Aventura", "Relax", "Familiar", "Cultura", "Gastronomía"],
  desierto:      ["Aventura", "Cultura", "Naturaleza", "Off-grid", "Etnoturismo", "Familiar"],
  amazonas:      ["Naturaleza", "Aventura", "Etnoturismo", "Avistamiento", "Cultura", "Familiar"],
};

const WHEN_OPTIONS = [
  "Este mes", "Próximo mes", "En 2–3 meses", "En 6 meses", "Fin de año", "Flexible"
];

const PKG_ADJUST = [
  "Está perfecto así",
  "Agregar días",
  "Cambiar hotel",
  "Agregar actividades",
  "Cambiar fechas",
];

// ---------- Ref generator (session tracking) ----------
function makeRef(prefix) {
  const now = new Date();
  const date = `${now.getDate().toString().padStart(2,"0")}${(now.getMonth()+1).toString().padStart(2,"0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${date}-${rand}`;
}

// ---------- Build pre-constructed WhatsApp message ----------
function buildWAMessage({ variant, name, country, phone, destination, when, adults, children, interests, adjust, pkg, ref, destFull }) {
  const paxStr = children > 0 ? `${adults} adulto${adults!==1?"s":""} + ${children} niño${children!==1?"s":""}` : `${adults} adulto${adults!==1?"s":""}`;
  let lines = [];
  if (variant === "A") {
    lines = [
      `¡Hola! Quiero planear un viaje por Colombia 👋`,
      ``,
      destination ? `📍 Destino: ${destination}` : `📍 Destino: por definir`,
      `📅 Cuándo: ${when}`,
      `👥 Viajeros: ${paxStr}`,
      interests.length > 0 ? `✨ Intereses: ${interests.join(", ")}` : null,
    ].filter(Boolean);
  } else if (variant === "B") {
    lines = [
      `¡Hola! Quiero planear un viaje a ${destFull} 👋`,
      ``,
      `📍 Destino: ${destFull}`,
      `📅 Cuándo: ${when}`,
      `👥 Viajeros: ${paxStr}`,
      interests.length > 0 ? `✨ Me interesa: ${interests.join(", ")}` : null,
    ].filter(Boolean);
  } else if (variant === "D") {
    lines = [
      `¡Hola! Me interesa el paquete "${pkg.title}" 👋`,
      ``,
      `📦 Paquete: ${pkg.title} · ${pkg.days}D/${pkg.nights}N`,
      `📅 Cuándo: ${when}`,
      `👥 Viajeros: ${paxStr}`,
      adjust && adjust.length > 0 ? `🛠️ Ajustes: ${adjust.join(", ")}` : null,
    ].filter(Boolean);
  }
  lines.push(``);
  lines.push(`— ${name}`);
  lines.push(``);
  lines.push(`#ref: ${ref}`);
  return lines.join("\n");
}

// ---------- Validation ----------
function validatePhone(phone, country) {
  const clean = phone.replace(/\D/g, "");
  return clean.length === country.len;
}

// ============================================================
// Provider
// ============================================================
function WAFlowProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState(null); // { variant, destination, pkg }

  const openFlow = (cfg) => {
    setConfig(cfg || { variant: "A" });
    setOpen(true);
    document.body.style.overflow = "hidden";
  };
  const closeFlow = () => {
    setOpen(false);
    setTimeout(() => setConfig(null), 350);
    document.body.style.overflow = "";
  };

  return (
    <WAFlowCtx.Provider value={{ open, config, openFlow, closeFlow }}>
      {children}
      <WAFlowDrawer open={open} config={config} onClose={closeFlow} />
      <WAFab onOpen={() => openFlow({ variant: "A" })} />
    </WAFlowCtx.Provider>
  );
}

// ============================================================
// Drawer — the main form
// ============================================================
function WAFlowDrawer({ open, config, onClose }) {
  const [step, setStep] = useState("form"); // "form" | "success"
  const [name, setName] = useState("");
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [phone, setPhone] = useState("");
  const [destSearch, setDestSearch] = useState(""); // variant A: user-typed destination
  const [when, setWhen] = useState("Flexible");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [interests, setInterests] = useState([]);
  const [adjust, setAdjust] = useState([]); // variant D only
  const [countryOpen, setCountryOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [waMessage, setWaMessage] = useState("");
  const [waUrl, setWaUrl] = useState("");
  const [sessionRef, setSessionRef] = useState("");

  // Reset when drawer opens with new config
  useEffect(() => {
    if (open && config) {
      setStep("form");
      setName("");
      setPhone("");
      setDestSearch("");
      setWhen("Flexible");
      setAdults(2);
      setChildren(0);
      setInterests([]);
      setAdjust([]);
      setErrors({});
      setCountryOpen(false);
    }
  }, [open, config?.variant, config?.destination?.id, config?.pkg?.id]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onK = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onK);
    return () => document.removeEventListener("keydown", onK);
  }, [open, onClose]);

  if (!config) return (
    <>
      <div className={`waf-overlay ${open ? "on" : ""}`} onClick={onClose} />
      <div className={`waf-drawer ${open ? "on" : ""}`} />
    </>
  );

  const { variant, destination, pkg } = config;

  // --- Contextual strings ---
  const heroScene = pkg ? pkg.dest.scene : destination ? destination.scene : (DESTINATIONS[0]?.scene);
  let heroEyebrow, heroTitle, heroSub, pillCtx;
  if (variant === "A") {
    heroEyebrow = <><span className="dot"/> Planners en línea ahora</>;
    heroTitle = <>Cuéntanos <em>qué sueñas.</em></>;
    heroSub = <>Te contactamos en WhatsApp con un planner humano. Respondemos en promedio en {WA_RESPONSE_TIME}.</>;
  } else if (variant === "B") {
    heroEyebrow = <><span className="dot"/> Planners en línea ahora</>;
    heroTitle = <>Viaja a <em>{destination.name}</em>.</>;
    heroSub = <>Cuéntanos los detalles básicos y tu planner te arma una propuesta en 24h.</>;
    pillCtx = <><b>📍 {destination.name}</b> · {destination.region}</>;
  } else if (variant === "D") {
    heroEyebrow = <><span className="dot"/> Planners en línea ahora</>;
    heroTitle = <><em>{pkg.title}</em> — hazlo tuyo.</>;
    heroSub = <>Ajustamos fechas, hoteles y actividades hasta que sea el viaje que quieres.</>;
    pillCtx = <><b>📦 {pkg.title}</b> · {pkg.days}D/{pkg.nights}N · desde {pkg.currency}{pkg.price.toLocaleString()}</>;
  }

  // --- Interest chips (by destination if B, by pkg dest if D) ---
  let interestChips = BASE_INTERESTS;
  if (variant === "B" && destination && DEST_INTERESTS[destination.id]) interestChips = DEST_INTERESTS[destination.id];
  if (variant === "D" && pkg && DEST_INTERESTS[pkg.dest.id]) interestChips = DEST_INTERESTS[pkg.dest.id];

  // --- Toggle helpers ---
  const toggleInterest = (k) => {
    setInterests(prev => {
      if (prev.includes(k)) return prev.filter(x => x !== k);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, k];
    });
  };
  const toggleAdjust = (k) => {
    setAdjust(prev => {
      if (k === "Está perfecto así") return prev.includes(k) ? [] : [k];
      // exclusive with "perfecto"
      const without = prev.filter(x => x !== "Está perfecto así");
      return without.includes(k) ? without.filter(x => x !== k) : [...without, k];
    });
  };

  // --- Submit ---
  const handleSubmit = () => {
    const errs = {};
    if (!name.trim() || name.trim().length < 2) errs.name = "Escribe tu nombre";
    if (!validatePhone(phone, country)) errs.phone = `Número de ${country.len} dígitos para ${country.name}`;
    // At least one contextual field
    if (variant === "A") {
      const hasContext = destSearch.trim() || interests.length > 0 || when !== "Flexible";
      if (!hasContext) errs.context = "Cuéntanos algo: destino, fechas o un interés";
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    // Build ref
    const refPrefix = variant === "A" ? "HOME" : variant === "B" ? (destination?.id || "DEST").toUpperCase().slice(0,6) : (pkg?.id || "PKG").toUpperCase();
    const ref = makeRef(refPrefix);
    setSessionRef(ref);

    // Build message
    const msg = buildWAMessage({
      variant, name: name.trim(), country, phone,
      destination: destSearch.trim(),
      destFull: destination?.name,
      when, adults, children, interests, adjust,
      pkg, ref,
    });
    setWaMessage(msg);

    // WA URL
    const url = `https://wa.me/${WA_BUSINESS_NUMBER}?text=${encodeURIComponent(msg)}`;
    setWaUrl(url);

    // Store lead (localStorage for demo; real: send to backend)
    try {
      const leads = JSON.parse(localStorage.getItem("waLeads") || "[]");
      leads.push({
        ref, ts: Date.now(), variant,
        name: name.trim(), phone: country.code + phone,
        destination: destSearch.trim() || destination?.name || null,
        pkgId: pkg?.id || null,
        when, adults, children, interests, adjust,
      });
      localStorage.setItem("waLeads", JSON.stringify(leads));
    } catch (e) {}

    setStep("success");

    // Auto-open WA in new tab after brief beat (user can also click)
    setTimeout(() => { window.open(url, "_blank", "noopener"); }, 450);
  };

  const handleSkip = () => {
    // Skip form — just open WA with minimal message
    const ref = makeRef("QUICK");
    const msg = variant === "A"
      ? `¡Hola! Quiero planear un viaje por Colombia 👋\n\n#ref: ${ref}`
      : variant === "B"
      ? `¡Hola! Quiero planear un viaje a ${destination.name} 👋\n\n#ref: ${ref}`
      : `¡Hola! Me interesa el paquete "${pkg.title}" 👋\n\n#ref: ${ref}`;
    const url = `https://wa.me/${WA_BUSINESS_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener");
  };

  const phoneFmt = phone.replace(/\D/g, "").replace(/(\d{3})(?=\d)/g, "$1 ").trim();

  return (
    <>
      <div className={`waf-overlay ${open ? "on" : ""}`} onClick={onClose} aria-hidden={!open} />
      <aside className={`waf-drawer ${open ? "on" : ""}`} role="dialog" aria-label="Planear mi viaje" aria-modal="true">

        {step === "form" && <>
          {/* -------- Header -------- */}
          <header className="waf-head">
            <div className="waf-head-bg">
              <Scenic scene={heroScene} />
            </div>
            <div className="waf-head-inner">
              <div className="waf-head-top">
                <span className="waf-head-eyebrow">{heroEyebrow}</span>
                <button className="waf-close" onClick={onClose} aria-label="Cerrar"><Ic.close s={16}/></button>
              </div>
              {pillCtx && <span className="waf-pill-context">{pillCtx}</span>}
              <h2 className="waf-head-title">{heroTitle}</h2>
              <p className="waf-head-sub">{heroSub}</p>
            </div>
          </header>

          {/* -------- Body -------- */}
          <div className="waf-body">

            {/* VARIANT A: destination input (optional) */}
            {variant === "A" && (
              <div className="waf-field">
                <label className="waf-label">
                  <span>¿Ya tienes un destino en mente?</span>
                  <span className="opt">Opcional</span>
                </label>
                <div className="waf-chips">
                  {["Cartagena", "Eje Cafetero", "Tayrona", "San Andrés", "Amazonas", "No sé aún"].map(d => (
                    <button key={d}
                      type="button"
                      className={`waf-chip ${destSearch === d ? "on" : ""}`}
                      onClick={() => setDestSearch(destSearch === d ? "" : d)}
                    >
                      {destSearch === d && <span className="checkmark"><Ic.check s={12}/></span>}
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* When */}
            <div className="waf-field">
              <label className="waf-label">
                <span>¿Cuándo te gustaría viajar?</span>
                <span className="opt">Aprox</span>
              </label>
              <div className="waf-chip-row">
                {WHEN_OPTIONS.map(w => (
                  <button key={w}
                    type="button"
                    className={`waf-chip compact ${when === w ? "on" : ""}`}
                    onClick={() => setWhen(w)}
                  >{w}</button>
                ))}
              </div>
            </div>

            {/* Travelers */}
            <div className="waf-field">
              <label className="waf-label">
                <span>¿Cuántos viajeros?</span>
              </label>
              <div className="waf-stepper-row">
                <div className="waf-stepper">
                  <div className="waf-stepper-label">
                    <b>Adultos</b>
                    <small>13+ años</small>
                  </div>
                  <div className="waf-stepper-controls">
                    <button className="waf-stepper-btn" onClick={()=>setAdults(Math.max(1, adults-1))} disabled={adults<=1} aria-label="Menos adultos">−</button>
                    <span className="waf-stepper-val">{adults}</span>
                    <button className="waf-stepper-btn" onClick={()=>setAdults(Math.min(20, adults+1))} aria-label="Más adultos">+</button>
                  </div>
                </div>
                <div className="waf-stepper">
                  <div className="waf-stepper-label">
                    <b>Niños</b>
                    <small>0–12 años</small>
                  </div>
                  <div className="waf-stepper-controls">
                    <button className="waf-stepper-btn" onClick={()=>setChildren(Math.max(0, children-1))} disabled={children<=0} aria-label="Menos niños">−</button>
                    <span className="waf-stepper-val">{children}</span>
                    <button className="waf-stepper-btn" onClick={()=>setChildren(Math.min(12, children+1))} aria-label="Más niños">+</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Interests (A/B) or Adjustments (D) */}
            {(variant === "A" || variant === "B") && (
              <div className="waf-field">
                <label className="waf-label">
                  <span>¿Qué te interesa? <span style={{color:"var(--c-muted,#7a7a7a)",fontWeight:500}}>(máx. 3)</span></span>
                  <span className="opt">Opcional</span>
                </label>
                <div className="waf-chips">
                  {interestChips.map(t => (
                    <button key={t}
                      type="button"
                      className={`waf-chip ${interests.includes(t) ? "on" : ""}`}
                      onClick={() => toggleInterest(t)}
                      disabled={!interests.includes(t) && interests.length >= 3}
                    >
                      {interests.includes(t) && <span className="checkmark"><Ic.check s={12}/></span>}
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {variant === "D" && (
              <div className="waf-field">
                <label className="waf-label">
                  <span>¿Quieres ajustar algo del paquete?</span>
                  <span className="opt">Opcional</span>
                </label>
                <div className="waf-chips">
                  {PKG_ADJUST.map(t => (
                    <button key={t}
                      type="button"
                      className={`waf-chip ${adjust.includes(t) ? "on" : ""}`}
                      onClick={() => toggleAdjust(t)}
                    >
                      {adjust.includes(t) && <span className="checkmark"><Ic.check s={12}/></span>}
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {errors.context && <div className="waf-error-msg" style={{marginTop:-10, marginBottom:12}}>{errors.context}</div>}

            {/* Name */}
            <div className="waf-field">
              <label className="waf-label">
                <span>Tu nombre</span>
                <span className="req">Requerido</span>
              </label>
              <div className={`waf-input-wrap ${errors.name ? "error" : ""}`}>
                <input
                  className="waf-input"
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); if (errors.name) setErrors({...errors, name: null}); }}
                  placeholder="Juan Pérez"
                  autoComplete="given-name"
                />
              </div>
              {errors.name && <div className="waf-error-msg">{errors.name}</div>}
            </div>

            {/* Phone */}
            <div className="waf-field" style={{position:"relative"}}>
              <label className="waf-label">
                <span>Tu WhatsApp</span>
                <span className="req">Requerido</span>
              </label>
              <div className={`waf-input-wrap ${errors.phone ? "error" : ""}`}>
                <button className="waf-prefix" type="button" onClick={() => setCountryOpen(!countryOpen)}>
                  <span className="flag">{country.flag}</span>
                  <span>{country.code}</span>
                  <span className="chev">▾</span>
                </button>
                <input
                  className="waf-input"
                  type="tel"
                  value={phoneFmt}
                  onChange={e => { setPhone(e.target.value); if (errors.phone) setErrors({...errors, phone: null}); }}
                  placeholder={country.c === "CO" ? "300 123 4567" : "número"}
                  inputMode="numeric"
                  autoComplete="tel"
                />
              </div>
              {countryOpen && (
                <div className="waf-country-dd">
                  {COUNTRIES.map(cn => (
                    <button key={cn.c} className="waf-country-opt" onClick={() => { setCountry(cn); setCountryOpen(false); setPhone(""); }}>
                      <span style={{fontSize:16}}>{cn.flag}</span>
                      <span>{cn.name}</span>
                      <span className="code">{cn.code}</span>
                    </button>
                  ))}
                </div>
              )}
              {errors.phone && <div className="waf-error-msg">{errors.phone}</div>}
            </div>
          </div>

          {/* -------- Footer -------- */}
          <footer className="waf-foot">
            <div className="waf-availability">
              <span className="live"><span className="dot"/> Planners en línea</span>
              <span className="resp"><Ic.clock s={12}/> Responden en ~{WA_RESPONSE_TIME}</span>
            </div>
            <button className="waf-submit" onClick={handleSubmit}>
              <Ic.whatsapp s={18}/>
              {variant === "A" && "Continuar en WhatsApp"}
              {variant === "B" && `Planear mi viaje a ${destination.name}`}
              {variant === "D" && "Continuar con este paquete"}
              <Ic.arrow s={14}/>
            </button>
            <div className="waf-skip">
              <a onClick={handleSkip}>Prefiero contarlo en el chat →</a>
            </div>
            <div className="waf-privacy">
              Tu número se usa solo para este viaje. Sin spam. Sin llamadas automáticas.
            </div>
          </footer>
        </>}

        {step === "success" && <>
          <header className="waf-head" style={{padding: "20px 32px 18px"}}>
            <div className="waf-head-bg"><Scenic scene={heroScene}/></div>
            <div className="waf-head-inner">
              <div className="waf-head-top">
                <span className="waf-head-eyebrow"><span className="dot"/> Conectando</span>
                <button className="waf-close" onClick={onClose} aria-label="Cerrar"><Ic.close s={16}/></button>
              </div>
            </div>
          </header>
          <div className="waf-success">
            <div className="waf-success-ic"><Ic.check s={34}/></div>
            <h3>WhatsApp se abrió en una pestaña nueva.</h3>
            <p>Si no se abrió, toca el botón verde. Tu planner responde en promedio en {WA_RESPONSE_TIME} y te escribe también desde nuestro lado.</p>
            <div className="waf-success-preview">{waMessage}</div>
            <div className="waf-success-actions">
              <a href={waUrl} target="_blank" rel="noopener" className="btn-wa">
                <Ic.whatsapp s={16}/> Abrir WhatsApp
              </a>
              <button className="btn-sec" onClick={onClose}>Seguir explorando</button>
            </div>
            <div className="waf-ref-badge">Ref: <b>{sessionRef}</b></div>
          </div>
        </>}

      </aside>
    </>
  );
}

// ============================================================
// Trust Bar — shown below hero
// ============================================================
function TrustBarF1() {
  return (
    <div className="trust-bar-f1">
      <div className="container inner">
        <span className="item"><span className="dot-live"/> <b>Planners en línea</b> · responden en ~{WA_RESPONSE_TIME}</span>
        <span className="item"><span className="ic"><Ic.shield s={16}/></span> <b>RNT 83412</b> · Operador local desde 2011</span>
        <span className="item"><span className="ic"><Ic.users s={16}/></span> <b>Revisado por humanos</b> · cada itinerario</span>
        <span className="item"><span className="ic"><Ic.star s={14}/></span> <b>4.9/5</b> · 3,200+ reseñas verificadas</span>
      </div>
    </div>
  );
}

// ============================================================
// HowItWorks — 3 steps
// ============================================================
function HowItWorks({ onOpen }) {
  const steps = [
    {
      n: "01",
      title: "Cuéntanos en 30 segundos.",
      desc: "Destino, fechas aproximadas y quiénes viajan. Nada de formularios largos — 5 campos, chips para tocar.",
      meta: "30 segundos",
      scene: DESTINATIONS[0].scene,
    },
    {
      n: "02",
      title: "WhatsApp con un humano.",
      desc: "Un planner de carne y hueso te escribe. Usa IA para ser rápido; revisa cada propuesta antes de enviártela.",
      meta: "Responde en 3 min",
      scene: DESTINATIONS[2].scene,
    },
    {
      n: "03",
      title: "Propuesta en 24h.",
      desc: "Recibes 2–3 rutas posibles con precio, hoteles y actividades. Ajustas con tu planner hasta que sea tuya.",
      meta: "En 24h hábiles",
      scene: DESTINATIONS[4].scene,
    },
  ];
  return (
    <section className="howit-f1" data-screen-label="HowItWorks">
      <div className="container">
        <div className="head">
          <span className="eyebrow">Cómo funciona</span>
          <h2>Tu viaje <em>en 3 pasos,</em><br/>sin formularios largos.</h2>
          <p>Dejamos atrás los PDFs con precios genéricos. Hoy diseñamos contigo por WhatsApp — rápido como mensajear a un amigo, pero con la mano de un planner experto.</p>
        </div>
        <div className="howit-steps">
          {steps.map((s, i) => (
            <div className="howit-step" key={i}>
              <div className="howit-num">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              <div className="meta"><Ic.clock s={12}/> {s.meta}</div>
            </div>
          ))}
        </div>
        <div className="howit-bottom">
          <button className="btn btn-accent btn-lg" onClick={onOpen}>
            <Ic.whatsapp s={16}/> Empezar por WhatsApp
          </button>
          <span style={{fontSize:13, color:"var(--c-muted)"}}>Sin costo · sin compromiso · respuesta en ~{WA_RESPONSE_TIME}</span>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Floating WhatsApp FAB — conditional, with bubble
// ============================================================
function WAFab({ onOpen }) {
  const [show, setShow] = useState(false);
  const [bubble, setBubble] = useState(true);

  useEffect(() => {
    let t;
    const check = () => {
      const scrolled = window.scrollY > window.innerHeight * 0.5;
      setShow(scrolled || !!t);
    };
    // Show after 20s regardless
    t = setTimeout(() => { setShow(true); }, 20000);
    window.addEventListener("scroll", check, { passive: true });
    check();
    return () => { window.removeEventListener("scroll", check); clearTimeout(t); };
  }, []);

  // Hide bubble after 8s of showing
  useEffect(() => {
    if (show && bubble) {
      const t = setTimeout(() => setBubble(false), 8000);
      return () => clearTimeout(t);
    }
  }, [show, bubble]);

  return (
    <div className={`wa-fab-f1 ${show ? "on" : ""}`}>
      {bubble && (
        <div className="wa-fab-bubble">
          <button className="wa-fab-close" onClick={() => setBubble(false)} aria-label="Cerrar bocadillo">×</button>
          <b>¿Planeas un viaje?</b>
          <small>Chatea con un planner — responde en ~{WA_RESPONSE_TIME}</small>
        </div>
      )}
      <button className="wa-fab-btn" onClick={onOpen} aria-label="Chat por WhatsApp">
        <Ic.whatsapp s={26}/>
      </button>
    </div>
  );
}

// Export
Object.assign(window, {
  WAFlowProvider, useWAFlow, WAFlowDrawer, TrustBarF1, HowItWorks, WAFab,
  WA_BUSINESS_NUMBER, WA_RESPONSE_TIME, buildWAMessage, makeRef,
});
