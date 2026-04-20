// ============================================================
// App (Fase 1) — envuelve con WAFlowProvider y cablea CTAs
// ============================================================

function AppF1Inner() {
  const [tweaks, setTweaks] = useState(window.__TWEAKS__ || { palette: "andes", density: "roomy", heroVariant: "image", showStickyCTA: true });
  const [modalPkg, setModalPkg] = useState(null);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const { openFlow } = useWAFlow();

  // --- Router ---
  const [page, setPage] = useState(() => {
    const h = (location.hash || "").replace("#/", "");
    if (h.startsWith("paquete/")) return { name: "detail", slug: h.split("/")[1] };
    if (h.startsWith("actividad/")) return { name: "activity", slug: h.split("/")[1] };
    if (h.startsWith("blog/")) return { name: "post", slug: h.split("/")[1] };
    if (h.startsWith("planner/")) return { name: "planner", slug: h.split("/")[1] };
    if (h.startsWith("destino/")) return { name: "destination", slug: h.split("/")[1] };
    if (h === "planners") return { name: "planners" };
    if (h === "paquetes") return { name: "listing" };
    if (h === "buscar") return { name: "search" };
    if (h === "contacto") return { name: "contact" };
    if (h === "blog") return { name: "blog" };
    if (h === "experiencias") return { name: "experiences" };
    return { name: "home" };
  });

  const nav = (name, extra={}) => {
    const p = { name, ...extra };
    setPage(p);
    const hashes = {
      home: "", listing: "#/paquetes", search: "#/buscar", contact: "#/contacto",
      detail: `#/paquete/${extra.pkg?.id||""}`,
      activity: `#/actividad/${extra.act?.id||""}`,
      destination: `#/destino/${extra.destination?.id||""}`,
      blog: "#/blog", post: `#/blog/${extra.post?.id||""}`,
      experiences: "#/experiencias",
      planners: "#/planners",
      planner: `#/planner/${extra.planner?.id||""}`,
    };
    history.replaceState(null, "", hashes[name] ?? "");
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.palette = tweaks.palette;
    root.dataset.density = tweaks.density;
    document.body.classList.add("f1-active");
  }, [tweaks.palette, tweaks.density]);

  useEffect(() => {
    const onMsg = (e) => {
      const d = e.data || {};
      if (d.type === "__activate_edit_mode") setTweaksOpen(true);
      if (d.type === "__deactivate_edit_mode") setTweaksOpen(false);
    };
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // -------- F1: CTAs route to drawer --------
  const openHome = () => openFlow({ variant: "A" });
  const openForPkg = (pkg) => openFlow({ variant: "D", pkg });
  const openForDest = (destination) => openFlow({ variant: "B", destination });

  // Original "open cot" → now opens home flow
  const openCot = () => openHome();

  // Package detail: open variant D
  const openDetail = (pkg) => nav("detail", { pkg });
  const openPost = (post) => nav("post", { post });

  const renderPage = () => {
    switch (page.name) {
      case "listing":
        return <PackagesListing onNav={nav} onOpenDetail={openDetail} />;
      case "detail":
        const pkg = page.pkg || PACKAGES.find(p => p.id === page.slug) || PACKAGES[0];
        return <PackageDetailV2 pkg={pkg} onNav={nav} />;
      case "activity":
        const act = page.act || ACTIVITIES.find(a => a.id === page.slug) || ACTIVITIES[0];
        return <ActivityDetail act={act} onNav={nav} />;
      case "search":
        return <SearchPage onNav={nav} onOpenDetail={openDetail} />;
      case "contact":
        return <ContactPage onNav={nav} />;
      case "blog":
        return <BlogList onNav={nav} onOpenPost={openPost} />;
      case "post":
        const post = page.post || BLOG_POSTS.find(p => p.id === page.slug) || BLOG_POSTS[0];
        return <BlogPost post={post} onNav={nav} onOpenPost={openPost} />;
      case "experiences":
        return <ExperiencesPage onNav={nav} />;
      case "planners":
        return <PlannersList onNav={nav} onOpenPlanner={(planner)=>nav("planner", { planner })} />;
      case "planner":
        const pl = page.planner || PLANNERS.find(x => x.id === page.slug) || PLANNERS[0];
        return <PlannerDetail planner={pl} onNav={nav} onOpenDetail={openDetail} />;
      case "destination":
        const destination = page.destination || DESTINATIONS.find(d => d.id === page.slug) || DESTINATIONS[0];
        return <DestinationPageF1 destination={destination} onNav={nav} onOpenDetail={openDetail} />;
      case "home":
      default:
        return (
          <>
            <HeroF1 onOpen={openHome} />
            <TrustBarF1 />
            <DestinationsF1 onNav={nav} />
            <HowItWorks onOpen={openHome} />
            <Packages onOpen={openDetail} />
            <Stats />
            <Promise />
            <PlannersSection onNav={nav} />
            <Testimonials />
            <Faq />
            <div id="cta-final"><CtaBannerF1 onOpen={openHome} /></div>
          </>
        );
    }
  };

  return (
    <>
      <SiteHeaderF1 onOpen={openHome} onNav={nav} current={page.name} />
      {renderPage()}
      <Footer onNav={nav} />
      <Tweaks open={tweaksOpen} tweaks={tweaks} setTweaks={setTweaks} />
      {modalPkg && <PackageModal pkg={modalPkg} onClose={()=>setModalPkg(null)} />}
    </>
  );
}

// -------- Header with WhatsApp CTA --------
function SiteHeaderF1({ onOpen, onNav, current }) {
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
          <button className="btn btn-sm" onClick={onOpen} style={{background:"#25D366", color:"#fff", border:0}}>
            <Ic.whatsapp s={14}/> Planea mi viaje
          </button>
        </div>
      </div>
    </header>
  );
}

// -------- Hero with WA CTA --------
function HeroF1({ onOpen }) {
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
          <div className="hero-cta" style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
            <button className="btn-wa-hero" onClick={onOpen}>
              <Ic.whatsapp s={18}/> Planea mi viaje por WhatsApp <Ic.arrow s={14}/>
            </button>
            <span style={{color:"rgba(255,255,255,.8)", fontSize:13}}>
              <span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:"#22c55e",marginRight:8, boxShadow:"0 0 0 3px rgba(34,197,94,.25)"}}/>
              Responden en ~3 min
            </span>
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

// -------- Destinations grid — clicking card opens drawer B --------
function DestinationsF1({ onNav }) {
  const { openFlow } = useWAFlow();
  const d = DESTINATIONS;
  const [view, setView] = useState("list");
  const [active, setActive] = useState(null);
  const layout = ["c-12-4", "c-5-4", "c-4", "c-4", "c-4-tall", "c-4", "c-4", "c-4"];
  const mapPins = d.map(dest => ({ id: dest.id, label: dest.name, kind: "dest", active: active === dest.id }));

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
              <a href="#" key={dest.id}
                 className={`dest-card ${layout[i]}`}
                 onClick={(e)=>{ e.preventDefault(); onNav("destination", { destination: dest }); }}>
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
                onPinClick={(p) => { const dest = DESTINATIONS.find(x=>x.id===p.id); if(dest) onNav("destination", { destination: dest }); }}
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
                  onClick={()=>onNav("destination", { destination: dest })}
                  style={{cursor:"pointer"}}
                >
                  <div className="dest-side-thumb"><Scenic scene={dest.scene}/></div>
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

// -------- Destination page (variant B entry) --------
function DestinationPageF1({ destination, onNav, onOpenDetail }) {
  const { openFlow } = useWAFlow();
  const relatedPackages = PACKAGES.filter(p => p.dest.id === destination.id);

  return (
    <div data-screen-label={`Destination ${destination.name}`}>
      {/* Hero */}
      <section style={{position:"relative", height:"72vh", minHeight: 520, overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0}}><Scenic scene={destination.scene}/></div>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg, rgba(0,0,0,.1) 0%, rgba(0,0,0,.65) 100%)"}}/>
        <div className="container" style={{position:"relative", height:"100%", display:"flex", alignItems:"flex-end", paddingBottom: 64, color:"#fff"}}>
          <div style={{maxWidth: 820}}>
            <a href="#" onClick={(e)=>{e.preventDefault(); onNav("home");}} style={{color:"rgba(255,255,255,.75)", fontSize:13, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:6, marginBottom: 18}}>
              ← Volver a destinos
            </a>
            <div style={{display:"flex",gap:8, marginBottom: 16}}>
              <span className="chip chip-white">{destination.region}</span>
              <span className="chip" style={{background:"rgba(255,255,255,.15)",color:"#fff",backdropFilter:"blur(6px)"}}>{destination.subtitle}</span>
            </div>
            <h1 className="display-xl" style={{color:"#fff", marginBottom:20}}>
              {destination.name}
              {destination.emphasis && <> <em style={{fontFamily:"var(--font-serif)",fontStyle:"italic",fontWeight:400,color:"#f3b13b"}}>{destination.emphasis}</em></>}
            </h1>
            <p className="lead" style={{maxWidth:"58ch"}}>
              {destination.tag}. Desde {destination.subtitle.split("·")[1]?.trim() || "pocos días"} de experiencias diseñadas con guías locales.
            </p>
            <div style={{display:"flex", gap:12, alignItems:"center", marginTop:32, flexWrap:"wrap"}}>
              <button className="btn-wa-hero" onClick={()=>openFlow({ variant: "B", destination })}>
                <Ic.whatsapp s={18}/> Planear mi viaje a {destination.name} <Ic.arrow s={14}/>
              </button>
              <span style={{color:"rgba(255,255,255,.8)", fontSize:13}}>
                <span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:"#22c55e",marginRight:8,boxShadow:"0 0 0 3px rgba(34,197,94,.25)"}}/>
                Planner experto en {destination.region} en línea
              </span>
            </div>
          </div>
        </div>
      </section>

      <TrustBarF1 />

      {/* Related packages */}
      {relatedPackages.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <div>
                <span className="eyebrow">Paquetes en {destination.name}</span>
                <h2 className="display-md">Itinerarios <span className="serif">para empezar.</span></h2>
              </div>
              <div className="tools">
                <p className="body-md" style={{maxWidth:"40ch", margin:0}}>
                  Puntos de partida para tu viaje. Tu planner los ajusta contigo.
                </p>
              </div>
            </div>
            <div className="pack-grid">
              {relatedPackages.map(p => (
                <article key={p.id} className="pack-card" onClick={()=>onOpenDetail(p)}>
                  <div className="pack-media">
                    <Scenic scene={p.dest.scene}/>
                    <div className="badges">{p.badges.map(b => <span key={b} className={`chip ${b==="Más vendido"?"chip-accent":"chip-white"}`}>{b}</span>)}</div>
                  </div>
                  <div className="pack-body">
                    <div>
                      <div className="pack-loc">{p.loc}</div>
                      <div className="pack-header">
                        <h3>{p.title}</h3>
                        <Rating value={p.rating} count={p.reviews} />
                      </div>
                      <p className="body-md" style={{margin:"6px 0 0", fontSize:14}}>{p.subtitle}</p>
                    </div>
                    <div className="pack-meta">
                      <span className="m"><Ic.calendar s={14}/> {p.days}d/{p.nights}n</span>
                      <span className="m"><Ic.users s={14}/> {p.group}</span>
                    </div>
                    <div className="pack-foot">
                      <div className="pack-price">
                        <small>Desde · por persona</small>
                        <strong><sup>{p.currency}</sup>{p.price.toLocaleString()}</strong>
                      </div>
                      <button className="btn btn-outline btn-sm">Ver ruta <Ic.arrow s={14}/></button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <HowItWorks onOpen={()=>openFlow({ variant: "B", destination })} />

      {/* Final CTA */}
      <section style={{padding: "80px 0 100px", background:"#152029", color:"#fff"}}>
        <div className="container" style={{textAlign:"center"}}>
          <span className="eyebrow" style={{color:"rgba(255,255,255,.7)"}}>¿Listo?</span>
          <h2 className="display-md" style={{color:"#fff", marginTop: 12, marginBottom: 20}}>
            {destination.name} te espera.
          </h2>
          <p className="body-lg" style={{color:"rgba(255,255,255,.75)", maxWidth:"52ch", margin:"0 auto 32px"}}>
            Cuéntanos cuándo y con quiénes vas. En 30 segundos te ponemos con un planner que conoce {destination.region} al dedillo.
          </p>
          <button className="btn-wa-hero" onClick={()=>openFlow({ variant: "B", destination })}>
            <Ic.whatsapp s={18}/> Empezar por WhatsApp <Ic.arrow s={14}/>
          </button>
        </div>
      </section>
    </div>
  );
}

// -------- CTA Banner F1 --------
function CtaBannerF1({ onOpen }) {
  return (
    <section className="section" style={{ paddingTop: 0 }} data-screen-label="CTA">
      <div className="container">
        <div className="cta-banner">
          <div>
            <span className="eyebrow" style={{ color: "rgba(255,255,255,.7)" }}>Empieza hoy</span>
            <h2 className="display-md" style={{ marginTop: 12 }}>Tu Colombia, <em>en 3 pasos.</em></h2>
            <p className="body-lg">Cuéntanos qué buscas en 30 segundos. Tu planner te escribe por WhatsApp con propuesta en 24h.</p>
          </div>
          <div className="actions">
            <button className="btn-wa-hero" onClick={onOpen}>
              <Ic.whatsapp s={16}/> Planea mi viaje <Ic.arrow />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// -------- Wrap PackageDetailV2 to inject "continue on WA" CTA --------
// We patch by rendering PackageDetailV2 and injecting an overlay sticky CTA.
// Simpler: wrap and pass openFlow via context. But since PackageDetailV2 uses
// its own CTAs, we add a sticky bottom bar specifically for F1.

function PackageDetailF1Wrapper({ pkg, onNav }) {
  const { openFlow } = useWAFlow();
  return (
    <>
      <PackageDetailV2 pkg={pkg} onNav={onNav} />
      <PkgStickyWA pkg={pkg} onOpen={()=>openFlow({ variant: "D", pkg })} />
    </>
  );
}

function PkgStickyWA({ pkg, onOpen }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div style={{
      position:"fixed", bottom: 0, left: 0, right: 0,
      background:"#fff",
      borderTop:"1px solid rgba(0,0,0,.1)",
      boxShadow: "0 -10px 30px rgba(0,0,0,.08)",
      padding: "14px 22px",
      zIndex: 50,
      transform: show ? "translateY(0)" : "translateY(100%)",
      transition: "transform .35s cubic-bezier(.2,.8,.2,1)",
      display:"flex", alignItems:"center", gap: 16
    }}>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontSize:11, letterSpacing:".14em", textTransform:"uppercase", color:"var(--c-muted)", fontWeight:600}}>Desde · por persona</div>
        <div style={{fontSize:22, fontWeight:600, fontFamily:"var(--font-display)"}}><sup style={{fontSize:13, opacity:.6}}>{pkg.currency}</sup>{pkg.price.toLocaleString()}</div>
      </div>
      <button className="btn-wa-hero" onClick={onOpen} style={{padding: "14px 22px", fontSize: 14}}>
        <Ic.whatsapp s={16}/> Continuar por WhatsApp <Ic.arrow s={14}/>
      </button>
    </div>
  );
}

// -------- Root --------
function AppF1() {
  return (
    <WAFlowProvider>
      <AppF1Inner />
    </WAFlowProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AppF1 />);

Object.assign(window, { AppF1, SiteHeaderF1, HeroF1, DestinationPageF1, HowItWorks, TrustBarF1 });
