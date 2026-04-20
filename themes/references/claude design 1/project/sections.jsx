// Sections: Header, Hero, Destinations, Packages, Stats, Promise, Planners,
// Testimonials, FAQ, CTA, Footer, WhatsApp, StickyBar, Modal, Tweaks

// -------- HEADER --------
function SiteHeader({ onOpen, onNav, current }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const links = [
    { label: "Destinos", page: "home" },
    { label: "Paquetes", page: "listing" },
    { label: "Experiencias", page: "experiences" },
    { label: "Travel Planners", page: "planners" },
    { label: "Blog", page: "blog" },
  ];
  return (
    <header className={`site-header ${scrolled ? "scrolled" : ""}`} data-screen-label="Header">
      <div className="container nav">
        <span onClick={() => onNav && onNav("home")} style={{cursor:"pointer"}}><Logo /></span>
        <nav className="nav-links" aria-label="Principal">
          {links.map(l => (
            <button key={l.page} className={`nav-link ${current===l.page?"active":""}`}
              onClick={() => onNav && onNav(l.page)}>{l.label}</button>
          ))}
        </nav>
        <div className="nav-right">
          <MarketSwitcher />
          <button className="icon-btn" title="Buscar" aria-label="Buscar" onClick={() => onNav && onNav("search")}><Ic.search /></button>
          <button className="btn btn-ink btn-sm" onClick={onOpen}>
            Cotizar viaje <Ic.arrow s={14}/>
          </button>
        </div>
      </div>
    </header>
  );
}

// -------- HERO --------
function Hero({ onSearch }) {
  const slides = [DESTINATIONS[0], DESTINATIONS[3], DESTINATIONS[4], DESTINATIONS[2]];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, []);
  const s = slides[idx];
  const sideList = [
    { k: "01", n: "Cartagena", s: "Caribe" },
    { k: "02", n: "Tayrona", s: "Sierra" },
    { k: "03", n: "Eje Cafetero", s: "Andes" },
    { k: "04", n: "Medellín", s: "Antioquia" },
  ];
  return (
    <section className="hero" data-screen-label="Hero">
      <div className="hero-media"><Scenic scene={s.scene} /></div>
      <div className="container hero-inner">
        <div className="hero-copy">
          <span className="eyebrow hero-eyebrow">Operador local · 14 años en Colombia</span>
          <h1 className="display-xl">
            Colombia<br/>
            <em>como la cuenta</em><br/>
            quien la camina.
          </h1>
          <p className="lead">
            Itinerarios diseñados con guías locales, fincas familiares y rincones que no salen en las guías. Desde el Caribe hasta la Amazonía.
          </p>
          <div className="hero-cta">
            <button className="btn btn-accent btn-lg" onClick={onSearch}>Planea mi viaje <Ic.arrow /></button>
            <button className="btn btn-ghost btn-lg" style={{ color: "#fff" }}>Ver paquetes</button>
          </div>
          <div style={{ marginTop: 36, maxWidth: 720 }}>
            <HeroSearch onGo={onSearch}/>
          </div>
        </div>

        <aside>
          <div className="hero-side-list">
            <span className="eyebrow hero-eyebrow" style={{ marginBottom: 12 }}>Destino del mes</span>
            {sideList.map((x, i) => (
              <div className="item" key={i}>
                <b style={{ opacity: .6, fontVariantNumeric: "tabular-nums" }}>{x.k}</b>
                <span>{x.n}</span>
                <span>{x.s}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div className="container hero-meta">
        <span>Presentando · {s.region}</span>
        <div className="dots" role="tablist">
          {slides.map((_, i) => (
            <button key={i} className={`dot ${i===idx?"active":""}`} onClick={() => setIdx(i)} aria-label={`Slide ${i+1}`} />
          ))}
        </div>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{String(idx+1).padStart(2,'0')} / {String(slides.length).padStart(2,'0')}</span>
      </div>
    </section>
  );
}

function HeroSearch({ onGo }) {
  const [dest, setDest] = useState("Caribe");
  const [when, setWhen] = useState("Octubre");
  const [pax, setPax] = useState("2 viajeros");
  return (
    <div className="hero-search" role="search">
      <button className="field" onClick={()=>{}}>
        <small>Destino</small>
        <strong>{dest} · Colombia</strong>
      </button>
      <button className="field">
        <small>Cuándo</small>
        <strong>{when} 2026 · 7 noches</strong>
      </button>
      <button className="field">
        <small>Viajeros</small>
        <strong>{pax}</strong>
      </button>
      <button className="go" onClick={onGo}>
        <Ic.search s={16}/> Buscar
      </button>
    </div>
  );
}

// -------- TRUST --------
function Trust() {
  return (
    <div className="trust">
      <div className="container trust-inner">
        <span className="trust-label">Reconocidos por</span>
        <div className="trust-logos">
          <span className="serif">ProColombia</span>
          <span>ANATO</span>
          <span className="serif">Travellers' Choice</span>
          <span>MinCIT</span>
          <span className="serif">Rainforest</span>
          <span>RNT 83412</span>
        </div>
      </div>
    </div>
  );
}

// -------- DESTINATIONS --------
function Destinations() {
  const d = DESTINATIONS;
  const [view, setView] = useState("list"); // "list" | "map"
  const [active, setActive] = useState(null);
  // Feature layout: 0 (big), 1, 2, 3 (tall), 4, 5, 6, 7
  const layout = ["c-12-4", "c-5-4", "c-4", "c-4", "c-4-tall", "c-4", "c-4", "c-4"];

  const mapPins = d.map(dest => ({
    id: dest.id,
    label: dest.name,
    kind: "dest",
    active: active === dest.id,
  }));

  return (
    <section className="section" data-screen-label="Destinations">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="eyebrow">Destinos</span>
            <h2 className="display-md">Ocho Colombias <span className="serif">en un mismo viaje.</span></h2>
          </div>
          <div className="tools" style={{alignItems:"flex-end", flexDirection:"column", gap:16}}>
            <p className="body-md" style={{ maxWidth: 42 + "ch", margin: 0 }}>
              Del mar de siete colores al desierto de La Guajira. Cada región con sus guías, sus sabores y su ritmo.
            </p>
            <div className="view-toggle" role="tablist" aria-label="Vista de destinos">
              <button className={view==="list"?"on":""} onClick={()=>setView("list")} role="tab" aria-selected={view==="list"}>
                <Ic.grid s={14}/> Lista
              </button>
              <button className={view==="map"?"on":""} onClick={()=>setView("map")} role="tab" aria-selected={view==="map"}>
                <Ic.pin s={14}/> Mapa
              </button>
            </div>
          </div>
        </div>

        {view === "list" ? (
          <div className="dest-grid">
            {d.map((dest, i) => (
              <a href="#" key={dest.id} className={`dest-card ${layout[i]}`}>
                <Scenic scene={dest.scene} />
                <div className="wash" />
                <div className="top-tag"><span className="chip chip-white">{dest.region}</span></div>
                <div className="content">
                  <div>
                    <small>{dest.subtitle}</small>
                    <h3>{dest.name}{dest.emphasis && <> <em>{dest.emphasis}</em></>}</h3>
                  </div>
                  <div className="cta-pill"><Ic.arrowUpRight s={16}/></div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="dest-map-view">
            <div className="dest-map-stage">
              <ColombiaMap
                pins={mapPins}
                variant="editorial"
                showLabels={true}
                showRidges={true}
                showRivers={true}
                hoveredId={active}
                onHover={setActive}
                onPinClick={(p) => setActive(p.id)}
                height={660}
                ariaLabel="Mapa interactivo de destinos en Colombia"
              />
            </div>
            <div className="dest-map-side">
              {d.map((dest, i) => (
                <div
                  key={dest.id}
                  className={`dest-side-card ${active===dest.id?"on":""}`}
                  onMouseEnter={()=>setActive(dest.id)}
                  onMouseLeave={()=>setActive(null)}
                >
                  <div className="dest-side-thumb">
                    <Scenic scene={dest.scene}/>
                  </div>
                  <div className="dest-side-body">
                    <div className="region">{dest.region}</div>
                    <b>{dest.name}{dest.emphasis && <> <em style={{fontFamily:"var(--font-serif)",fontStyle:"italic",fontWeight:400,color:"var(--c-accent)"}}>{dest.emphasis}</em></>}</b>
                    <small>{dest.subtitle}</small>
                  </div>
                  <span className="dest-side-num">{i+1}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// -------- EXPLORE MAP (home section) --------
function ExploreMap({ onNav }) {
  const [hover, setHover] = useState(null);
  const [regionFilter, setRegionFilter] = useState("all");

  const regions = [
    { k: "all", l: "Todos" },
    { k: "Caribe", l: "Caribe" },
    { k: "Andes", l: "Andes" },
    { k: "Selva", l: "Selva" },
  ];

  const filtered = regionFilter === "all"
    ? DESTINATIONS
    : DESTINATIONS.filter(d => d.region === regionFilter);

  const pins = filtered.map(d => ({
    id: d.id,
    label: d.name,
    kind: "dest",
    active: hover === d.id,
  }));

  const hoveredDest = hover ? DESTINATIONS.find(d => d.id === hover) : null;

  return (
    <section className="section explore-map-section" data-screen-label="ExploreMap">
      <div className="container">
        <div className="explore-map-grid">
          <div className="explore-map-copy">
            <span className="eyebrow">Explora Colombia</span>
            <h2 className="display-md">Un país <span className="serif">en cada región.</span></h2>
            <p className="body-lg" style={{marginTop: 16}}>
              Del Caribe al Amazonas, de los Andes al Pacífico. Pasa el cursor por el mapa para ver a dónde puedes ir — o filtra por región.
            </p>
            <div className="region-legend" role="tablist" aria-label="Filtrar por región">
              {regions.map(r => (
                <button
                  key={r.k}
                  className={`region-legend-chip ${regionFilter===r.k?"on":""}`}
                  onClick={()=>setRegionFilter(r.k)}
                  role="tab" aria-selected={regionFilter===r.k}
                >
                  <span className="dot"/>{r.l}
                </button>
              ))}
            </div>
            <div style={{display:"flex",gap:12,marginTop:32,flexWrap:"wrap"}}>
              <button className="btn btn-primary" onClick={()=>onNav && onNav("listing")}>
                Ver paquetes <Ic.arrow s={14}/>
              </button>
              <button className="btn btn-outline" onClick={()=>onNav && onNav("search")}>
                Buscar destino
              </button>
            </div>
          </div>
          <div className="explore-map-stage">
            <ColombiaMap
              pins={pins}
              variant="editorial"
              showLabels={true}
              showRidges={true}
              showRivers={true}
              hoveredId={hover}
              onHover={setHover}
              onPinClick={(p) => setHover(p.id)}
              height={580}
              ariaLabel="Mapa de Colombia — destinos por región"
            />
            <div className={`explore-hover-card ${hoveredDest?"on":""}`}>
              {hoveredDest && (
                <>
                  <div style={{width:48,height:48,borderRadius:12,overflow:"hidden",position:"relative",flex:"none"}}>
                    <Scenic scene={hoveredDest.scene}/>
                  </div>
                  <div>
                    <small>{hoveredDest.region}</small>
                    <b>{hoveredDest.name}</b>
                  </div>
                  <div className="ehc-right">
                    <button className="btn btn-ink btn-sm" onClick={()=>onNav && onNav("listing")}>Ver paquetes <Ic.arrow s={12}/></button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// -------- PACKAGES --------
function Packages({ onOpen }) {
  const [filter, setFilter] = useState("all");
  const [saved, setSaved] = useState({});
  const tabs = [
    { k: "all", label: "Todos", count: PACKAGES.length },
    { k: "playa", label: "Playa", count: PACKAGES.filter(p=>p.type==="playa").length },
    { k: "aventura", label: "Aventura", count: PACKAGES.filter(p=>p.type==="aventura").length },
    { k: "cultura", label: "Cultura", count: PACKAGES.filter(p=>p.type==="cultura").length },
    { k: "naturaleza", label: "Naturaleza", count: PACKAGES.filter(p=>p.type==="naturaleza").length },
  ];
  const items = filter === "all" ? PACKAGES : PACKAGES.filter(p => p.type === filter);

  const toggle = (id, e) => { e.preventDefault(); e.stopPropagation(); setSaved(s => ({...s, [id]: !s[id]})); };

  return (
    <section className="section" style={{ background: "var(--c-surface)" }} data-screen-label="Packages">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="eyebrow">Paquetes</span>
            <h2 className="display-md">Itinerarios pensados, <span className="serif">listos para ajustarse a ti.</span></h2>
          </div>
          <div className="tools">
            <div className="filter-bar" role="tablist">
              {tabs.map(t => (
                <button key={t.k} className={`filter-tab ${filter===t.k?"active":""}`} onClick={()=>setFilter(t.k)}>
                  {t.label} <span className="count">{t.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pack-grid">
          {items.map(p => (
            <article key={p.id} className="pack-card" onClick={()=>onOpen(p)}>
              <div className="pack-media">
                <Scenic scene={p.dest.scene} />
                <div className="badges">
                  {p.badges.map(b => <span key={b} className={`chip ${b==="Más vendido"?"chip-accent":"chip-white"}`}>{b}</span>)}
                </div>
                <button className={`heart ${saved[p.id]?"on":""}`} onClick={(e)=>toggle(p.id,e)} aria-label="Guardar">
                  <Ic.heart s={16} fill={saved[p.id]?"currentColor":"none"} />
                </button>
              </div>
              <div className="pack-body">
                <div>
                  <div className="pack-loc-row">
                    <div className="pack-loc">{p.loc}</div>
                    <CountryChip destId={p.dest.id} region={p.dest.region}/>
                  </div>
                  <div className="pack-header">
                    <h3>{p.title}</h3>
                    <Rating value={p.rating} count={p.reviews} />
                  </div>
                  <p className="body-md" style={{ margin: "6px 0 0", fontSize: 14 }}>{p.subtitle}</p>
                </div>
                <div className="pack-meta">
                  <span className="m"><Ic.calendar s={14}/> {p.days} días / {p.nights} noches</span>
                  <span className="m"><Ic.users s={14}/> {p.group}</span>
                </div>
                <div className="pack-foot">
                  <div className="pack-price">
                    <small>Desde · por persona</small>
                    <strong><sup>{p.currency}</sup>{p.price.toLocaleString()}</strong>
                  </div>
                  <button className="btn btn-outline btn-sm">
                    Ver ruta <Ic.arrow s={14}/>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 40 }}>
          <button className="btn btn-ghost">Ver los 42 paquetes <Ic.arrow s={14}/></button>
        </div>
      </div>
    </section>
  );
}

// -------- STATS --------
function Stats() {
  return (
    <section className="section" style={{ paddingTop: 40, paddingBottom: 40 }} data-screen-label="Stats">
      <div className="container">
        <div className="stats-row">
          <div className="stat">
            <div className="stat-num">12.4k<em>+</em></div>
            <div className="stat-label">viajeros en 14 años</div>
          </div>
          <div className="stat">
            <div className="stat-num">4.9<em>/5</em></div>
            <div className="stat-label">promedio en 3,200 reseñas</div>
          </div>
          <div className="stat">
            <div className="stat-num">96<em>%</em></div>
            <div className="stat-label">recomendaría a un amigo</div>
          </div>
          <div className="stat">
            <div className="stat-num">32</div>
            <div className="stat-label">destinos únicos en Colombia</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// -------- PROMISE (features) --------
function Promise() {
  const feats = [
    { i: <Ic.pin s={22}/>, t: "Operador local, no intermediario", d: "Somos la agencia. Sin triangulaciones ni sorpresas de último momento." },
    { i: <Ic.shield s={22}/>, t: "Viaje asegurado de punta a punta", d: "Asistencia médica, cobertura de cancelación y atención 24/7 en español, inglés y francés." },
    { i: <Ic.leaf s={22}/>, t: "Turismo con impacto", d: "Alojamientos familiares, guías de las comunidades y operaciones bajas en huella." },
    { i: <Ic.sparkle s={22}/>, t: "Diseño a tu medida", d: "Tu planner asignado ajusta itinerario, hoteles y ritmo hasta que sea exactamente tu viaje." },
  ];
  return (
    <section className="section" data-screen-label="Promise">
      <div className="container">
        <div className="promise">
          <div>
            <span className="eyebrow hero-eyebrow">Por qué ColombiaTours</span>
            <h2 className="display-md">Un viaje bien hecho <em>se nota.</em></h2>
            <p className="body-lg" style={{ color: "rgba(255,255,255,.75)", marginTop: 20, maxWidth: "42ch" }}>
              No vendemos cupos: diseñamos viajes. Cada ruta pasa por manos de un planner local que la conoce porque la ha caminado.
            </p>
            <div style={{ marginTop: 28 }}>
              <button className="btn btn-accent" onClick={()=>window.location.hash="#/planners"}>Hablar con un planner <Ic.arrow s={14}/></button>
            </div>
          </div>
          <div className="list">
            {feats.map((f,i) => (
              <div className="feat" key={i}>
                <div className="ic">{f.i}</div>
                <div>
                  <b>{f.t}</b>
                  <p>{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// -------- PLANNERS --------
function PlannersSection({ onNav }) {
  return (
    <section className="section" data-screen-label="Planners">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="eyebrow">Tu planner</span>
            <h2 className="display-md">Una persona <span className="serif">que te conoce</span> de principio a fin.</h2>
          </div>
          <div className="tools">
            <p className="body-md" style={{ maxWidth: "40ch", margin: 0 }}>
              Emparejamos tu perfil con el planner que más sabe de la región o experiencia que buscas.
            </p>
            <button className="btn btn-outline btn-sm" style={{marginTop:12}} onClick={()=>onNav && onNav("planners")}>Ver todos <Ic.arrow s={14}/></button>
          </div>
        </div>
        <div className="planners">
          {PLANNERS.slice(0,4).map(p => (
            <article className="planner" key={p.id} onClick={()=>onNav && onNav("planner", { planner: p })} style={{cursor:"pointer"}}>
              <div className="planner-avatar" style={{ background: p.av }}>
                <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,.2), transparent 60%)" }} />
              </div>
              <div>
                <h4>{p.name}</h4>
                <div className="role">{p.role}</div>
              </div>
              <p className="body-md" style={{ margin: 0, fontSize: 14 }}>
                {p.years} años diseñando viajes a medida.
              </p>
              <div className="langs">
                {p.langs.map(l => <span key={l} className="lg">{l}</span>)}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// -------- TESTIMONIALS --------
function Testimonials() {
  const [idx, setIdx] = useState(0);
  const t = TESTIMONIALS[idx];
  return (
    <section className="section" style={{ background: "var(--c-surface)" }} data-screen-label="Testimonials">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="eyebrow">Testimonios</span>
            <h2 className="display-md">El recuerdo <span className="serif">después del viaje.</span></h2>
          </div>
          <div className="tools">
            <div className="chip chip-ink"><Ic.star s={12}/> 4.9 · 3,218 reseñas verificadas</div>
          </div>
        </div>
        <div className="testi">
          <div className="testi-big">
            <span className="quote-mark">“</span>
            <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
              {Array.from({length: t.rating}).map((_,i)=><span key={i} style={{ color: "var(--c-accent-2)" }}><Ic.star s={18}/></span>)}
            </div>
            <blockquote dangerouslySetInnerHTML={{ __html: t.long }} />
            <div className="testi-author">
              <div className="av" style={{ background: "linear-gradient(135deg, var(--c-accent-2), var(--c-accent))" }} />
              <div>
                <b>{t.name}</b>
                <small>{t.origin} · {t.pkg}</small>
              </div>
            </div>
          </div>
          <div className="testi-list">
            {TESTIMONIALS.map((m, i) => (
              <button key={m.id} className={`testi-mini ${i===idx?"active":""}`} onClick={()=>setIdx(i)}>
                <div className="hdr">
                  <div className="av" style={{ background: `hsl(${i*83}, 45%, 60%)` }} />
                  <div>
                    <b>{m.name}</b><br/>
                    <small>{m.pkg}</small>
                  </div>
                </div>
                <p>"{m.short}"</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// -------- FAQ --------
function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="section" data-screen-label="FAQ">
      <div className="container">
        <div className="faq">
          <div>
            <span className="eyebrow">Preguntas frecuentes</span>
            <h2 className="display-md" style={{ marginTop: 12 }}>Lo que <span className="serif">nos preguntan</span> antes de reservar.</h2>
            <p className="body-md" style={{ marginTop: 24, maxWidth: "30ch" }}>
              ¿No encuentras la respuesta? Escribe a tu planner — respondemos en &lt;2h hábiles.
            </p>
            <button className="btn btn-outline" style={{ marginTop: 16 }}>
              <Ic.whatsapp s={16}/> Chat por WhatsApp
            </button>
          </div>
          <div className="faq-list">
            {FAQ.map((f, i) => (
              <div className={`faq-item ${open===i?"open":""}`} key={i}>
                <button className="faq-q" onClick={()=>setOpen(open===i?-1:i)} aria-expanded={open===i}>
                  <span>{f.q}</span>
                  <span className="plus"><Ic.plus s={14}/></span>
                </button>
                <div className="faq-a">{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// -------- CTA BANNER --------
function CtaBanner({ onOpen }) {
  return (
    <section className="section" style={{ paddingTop: 0 }} data-screen-label="CTA">
      <div className="container">
        <div className="cta-banner">
          <div>
            <span className="eyebrow" style={{ color: "rgba(255,255,255,.7)" }}>Empieza hoy</span>
            <h2 className="display-md" style={{ marginTop: 12 }}>Tu Colombia, <em>en 3 pasos.</em></h2>
            <p className="body-lg">Cuéntanos qué buscas, recibe una propuesta en 24h con 2–3 rutas posibles, y ajusta con tu planner hasta que sea el viaje que quieres.</p>
          </div>
          <div className="actions">
            <button className="btn btn-accent btn-lg" onClick={onOpen}>Planea mi viaje <Ic.arrow /></button>
            <button className="btn btn-ghost btn-lg" style={{ color: "#fff" }}>
              <Ic.whatsapp s={16}/> Chat WhatsApp
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// -------- FOOTER --------
function Footer({ onNav }) {
  const go = (p) => (e) => { e.preventDefault(); onNav && onNav(p); };
  return (
    <footer className="site-footer" data-screen-label="Footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="logo-foot">
              <img src="assets/logo.png" alt="ColombiaTours.travel" />
            </div>
            <h4>Viaja más hondo.</h4>
            <p>Somos un operador local con sede en Medellín. Diseñamos viajes por Colombia desde 2011, con guías locales y alojamientos familiares.</p>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <a className="icon-btn" style={{ color: "#fff" }} href="#" aria-label="Instagram"><Ic.ig /></a>
              <a className="icon-btn" style={{ color: "#fff" }} href="#" aria-label="Facebook"><Ic.fb /></a>
              <a className="icon-btn" style={{ color: "#fff" }} href="#" aria-label="TikTok"><Ic.tiktok /></a>
            </div>
          </div>
          <div className="footer-col">
            <h5>Destinos</h5>
            <ul>
              <li><a>Cartagena</a></li>
              <li><a>Eje Cafetero</a></li>
              <li><a>Tayrona</a></li>
              <li><a>San Andrés</a></li>
              <li><a>Amazonas</a></li>
              <li><a>Ver todos</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h5>Viajar</h5>
            <ul>
              <li><a href="#" onClick={go("listing")}>Paquetes</a></li>
              <li><a href="#" onClick={go("search")}>Buscar</a></li>
              <li><a>Hoteles boutique</a></li>
              <li><a>Luna de miel</a></li>
              <li><a>Grupos y corporativo</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h5>Agencia</h5>
            <ul>
              <li><a>Sobre nosotros</a></li>
              <li><a href="#" onClick={go("planners")}>Nuestros planners</a></li>
              <li><a>Blog</a></li>
              <li><a>Prensa</a></li>
              <li><a href="#" onClick={go("contact")}>Contacto</a></li>
            </ul>
          </div>
          <div className="footer-col footer-news">
            <h5>Recibe historias</h5>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,.6)", marginBottom: 14 }}>Un correo al mes con rincones que nos enamoran y descuentos.</p>
            <input type="email" placeholder="tu@correo.com" />
            <button className="btn btn-accent">Suscribirme <Ic.arrow s={14}/></button>
          </div>
        </div>
        <div className="footer-bottom">
          <div>© 2026 ColombiaTours.travel · RNT 83412 · NIT 900.xxx.xxx-9</div>
          <div style={{ display: "flex", gap: 24 }}>
            <a>Privacidad</a><a>Términos</a><a>Política de cancelación</a>
          </div>
        </div>
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,.5)", fontWeight: 600, marginBottom: 2 }}>Preferencias</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)" }}>Elige tu idioma y la moneda en que quieres ver los precios.</div>
          </div>
          <FooterSwitcher />
        </div>
      </div>
    </footer>
  );
}

// -------- WhatsApp bubble --------
function Whatsapp() {
  return (
    <a className="wa-bubble" href="#" aria-label="Chat por WhatsApp">
      <Ic.whatsapp />
    </a>
  );
}

// -------- Tweaks panel --------
function Tweaks({ open, tweaks, setTweaks }) {
  if (!open) return null;
  const palettes = [
    { k: "caribe", c: ["#0e5b5b", "#e85c3c", "#f3b13b"] },
    { k: "andes",  c: ["#1e3a5f", "#b45a2a", "#d1b67a"] },
    { k: "selva",  c: ["#1f4d2e", "#c96a1f", "#d6a84a"] },
    { k: "cafe",   c: ["#7a3319", "#c84a1e", "#e0a63e"] },
  ];
  const dens = ["snug", "roomy", "airy"];
  const update = (k, v) => {
    setTweaks({ ...tweaks, [k]: v });
    window.parent.postMessage({ type: "__edit_mode_set_keys", edits: { [k]: v } }, "*");
  };
  return (
    <div className="tweaks" role="dialog" aria-label="Tweaks">
      <h4>Tweaks</h4>
      <div className="row">
        <label>Paleta</label>
        <div className="swatches">
          {palettes.map(p => (
            <button key={p.k} className={`sw ${tweaks.palette===p.k?"on":""}`}
              onClick={()=>update("palette", p.k)} title={p.k}
              style={{ background: `linear-gradient(135deg, ${p.c[0]} 0 45%, ${p.c[1]} 45% 75%, ${p.c[2]} 75%)` }} />
          ))}
        </div>
      </div>
      <div className="row">
        <label>Densidad</label>
        <div className="opts" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          {dens.map(d => (
            <button key={d} className={tweaks.density===d?"on":""} onClick={()=>update("density", d)}>{d}</button>
          ))}
        </div>
      </div>
      <div className="row">
        <label>Sticky CTA</label>
        <div className="opts" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <button className={tweaks.showStickyCTA?"on":""} onClick={()=>update("showStickyCTA", true)}>On</button>
          <button className={!tweaks.showStickyCTA?"on":""} onClick={()=>update("showStickyCTA", false)}>Off</button>
        </div>
      </div>
    </div>
  );
}

// -------- Package detail modal --------
function PackageModal({ pkg, onClose }) {
  useEffect(() => {
    const onK = e => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onK);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onK); document.body.style.overflow = prev; };
  }, []);
  if (!pkg) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} role="dialog" aria-label={pkg.title}>
        <div className="modal-hero">
          <Scenic scene={pkg.dest.scene} />
          <div className="wash" />
          <button className="close" onClick={onClose} aria-label="Cerrar"><Ic.close /></button>
          <div className="title-area">
            <div style={{ display: "flex", gap: 6 }}>
              {pkg.badges.map(b => <span key={b} className="chip chip-white">{b}</span>)}
            </div>
            <h3>{pkg.title}</h3>
            <div style={{ fontSize: 14, opacity: .9, marginTop: 4 }}>{pkg.loc} · {pkg.days} días / {pkg.nights} noches</div>
          </div>
        </div>
        <div className="modal-body">
          <div>
            <h4>Itinerario día a día</h4>
            <div className="itinerary">
              {pkg.itinerary.map((d, i) => (
                <div className="itin-day" key={i}>
                  <b>{d.d} · {d.t}</b>
                  <p>{d.b}</p>
                </div>
              ))}
            </div>
            <h4 style={{ marginTop: 28 }}>Incluye</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
              {pkg.includes.map(inc => (
                <li key={inc} style={{ display: "flex", gap: 10, fontSize: 14, color: "var(--c-ink-2)" }}>
                  <span style={{ color: "var(--c-accent-3)", flex: "none", marginTop: 2 }}><Ic.check s={16}/></span>
                  {inc}
                </li>
              ))}
            </ul>
          </div>
          <aside className="modal-aside">
            <div>
              <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--c-muted)", fontWeight: 600 }}>Desde · por persona</div>
              <div className="price-big"><sup>{pkg.currency}</sup>{pkg.price.toLocaleString()}</div>
            </div>
            <Rating value={pkg.rating} count={pkg.reviews} size={16}/>
            <div style={{ fontSize: 13, color: "var(--c-ink-2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--c-line)" }}>
                <span>Duración</span><b>{pkg.days} días</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--c-line)" }}>
                <span>Tamaño grupo</span><b>{pkg.group}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--c-line)", borderBottom: "1px solid var(--c-line)" }}>
                <span>Próxima salida</span><b>15 may</b>
              </div>
            </div>
            <button className="btn btn-primary" style={{ justifyContent: "center" }}>Solicitar cotización <Ic.arrow s={14}/></button>
            <button className="btn btn-outline" style={{ justifyContent: "center" }}>
              <Ic.whatsapp s={14}/> Preguntar por WhatsApp
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  SiteHeader, Hero, Trust, Destinations, ExploreMap, Packages, Stats, Promise,
  PlannersSection, Testimonials, Faq, CtaBanner, Footer, Whatsapp,
  Tweaks, PackageModal,
});
