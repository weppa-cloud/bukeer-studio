// Experiences page — curatorial catalog of activities
// Also: ExperienceModal (detail drawer)

const EXP_CATS = [
  { k: "all", l: "Todas", sub: "14 experiencias" },
  { k: "aventura", l: "Aventura", sub: "caminar, volar, escalar" },
  { k: "gastronomia", l: "Gastronomía", sub: "cocina, café, mercados" },
  { k: "cultura", l: "Cultura", sub: "música, historia, pueblos" },
  { k: "naturaleza", l: "Naturaleza", sub: "fauna y selva" },
  { k: "mar", l: "Mar", sub: "buceo y navegación" },
  { k: "bienestar", l: "Bienestar", sub: "retiros y silencio" },
];

const DUR_BUCKETS = [
  { k: "all", l: "Cualquiera" },
  { k: "short", l: "Menos de 4h" },
  { k: "half-day", l: "Medio día" },
  { k: "full-day", l: "Día completo" },
  { k: "multi-day", l: "Multi-día" },
];

const LEVEL_LABELS = { "fácil": "Fácil", "moderado": "Moderado", "exigente": "Exigente" };
const LEVEL_COLORS = { "fácil": "leaf", "moderado": "amber", "exigente": "coral" };

// -------- Reviews (small sample) --------
const EXP_REVIEWS = [
  { id: "r1", act: "a1", name: "Emma S.", origin: "Londres", txt: "Salir a las 6am nos dio el valle para nosotros solos. El guía sabía el nombre de cada planta.", rating: 5 },
  { id: "r2", act: "a2", name: "Julien P.", origin: "Lyon", txt: "El velero era pequeño, no éramos 40 — marca la diferencia. Cholón de ensueño.", rating: 5 },
  { id: "r3", act: "a7", name: "Ava K.", origin: "NYC", txt: "El mercado de Bazurto es un espectáculo. La cazuela que cocinamos fue mejor que la de cualquier restaurante.", rating: 5 },
];

// -------- Card --------
function ExpCard({ a, saved, onToggleSave, onOpen }) {
  return (
    <article className="exp-card" onClick={() => onOpen(a)}>
      <div className="exp-media">
        <Scenic scene={a.dest.scene}/>
        <div className="exp-badges-left">
          <span className="chip chip-white" style={{textTransform:"uppercase",letterSpacing:".1em",fontSize:10}}>{a.cat}</span>
          <span className={`chip level-${LEVEL_COLORS[a.level]}`}>{LEVEL_LABELS[a.level]}</span>
        </div>
        {a.badges.length > 0 && (
          <div className="exp-badges-right">
            {a.badges.map(b => <span key={b} className={`chip ${b==="Más vendido"||b==="Imprescindible"?"chip-accent":"chip-ink"}`}>{b}</span>)}
          </div>
        )}
        <button className={`heart ${saved?"on":""}`} onClick={(e)=>{e.stopPropagation();onToggleSave(a.id);}}>
          <Ic.heart s={16} fill={saved?"currentColor":"none"}/>
        </button>
      </div>
      <div className="exp-body">
        <div className="exp-loc"><Ic.pin s={12}/> {a.loc}</div>
        <h3 className="exp-title">{a.title}</h3>
        <p className="exp-sub"><em>— {a.subtitle}.</em></p>
        <p className="exp-desc">{a.desc}</p>
        <div className="exp-rating">
          <Rating value={a.rating} count={a.reviews}/>
        </div>
        <div className="exp-foot">
          <div className="exp-dur"><Ic.clock s={13}/> {a.dur}</div>
          <div className="exp-price">
            {a.price === 0 ? (
              <b>Gratis</b>
            ) : (
              <><small>Desde</small><b>${a.price} USD</b></>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

// -------- Detail modal --------
function ExpModal({ a, onClose, onNav }) {
  if (!a) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="exp-modal" onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><Ic.close s={18}/></button>
        <div className="exp-modal-hero">
          <Scenic scene={a.dest.scene}/>
          <div className="exp-modal-wash"/>
          <div className="exp-modal-heroin">
            <div className="exp-badges-left">
              <span className="chip chip-white" style={{textTransform:"uppercase",letterSpacing:".1em",fontSize:10}}>{a.cat}</span>
              <span className={`chip level-${LEVEL_COLORS[a.level]}`}>{LEVEL_LABELS[a.level]}</span>
            </div>
            <div className="exp-modal-loc"><Ic.pin s={13}/> {a.loc} · {a.region}</div>
            <h2 className="display-md">{a.title} <em>{a.subtitle}.</em></h2>
            <div className="exp-modal-meta">
              <span><Ic.clock s={14}/> {a.dur}</span>
              <span>·</span>
              <span><Ic.users s={14}/> Grupos pequeños</span>
              <span>·</span>
              <Rating value={a.rating} count={a.reviews}/>
            </div>
          </div>
        </div>
        <div className="exp-modal-body">
          <div className="exp-modal-main">
            <section>
              <h4 className="label">Qué esperar</h4>
              <p className="body-md">{a.desc}</p>
            </section>
            <section>
              <h4 className="label">Lo imperdible</h4>
              <ul className="exp-hl">
                {a.highlights.map((h,i) => <li key={i}><Ic.check s={14}/> {h}</li>)}
              </ul>
            </section>
            <section>
              <h4 className="label">Qué incluye</h4>
              <ul className="exp-hl">
                {a.includes.map((h,i) => <li key={i}><Ic.check s={14}/> {h}</li>)}
              </ul>
            </section>
            {a.time !== "—" && (
              <section>
                <h4 className="label">Salida</h4>
                <p className="body-md">Hora: <b>{a.time}</b> — punto de encuentro confirmado al reservar.</p>
              </section>
            )}
          </div>
          <aside className="exp-modal-rail">
            <div className="exp-modal-price">
              {a.price === 0 ? <b style={{fontSize:28}}>Gratis</b> : (<><small>Desde</small><b>${a.price}</b><span>USD · por persona</span></>)}
            </div>
            <button className="btn btn-accent" style={{width:"100%"}}>Reservar experiencia <Ic.arrow s={14}/></button>
            <button className="btn btn-outline" style={{width:"100%"}} onClick={()=>onNav("contact")}>
              Sumar a un paquete <Ic.arrow s={14}/>
            </button>
            <div className="exp-modal-notes">
              <div><Ic.check s={13}/> Cancelación hasta 48h antes</div>
              <div><Ic.check s={13}/> Guía bilingüe</div>
              <div><Ic.check s={13}/> Grupos pequeños</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// -------- Main page --------
function ExperiencesPage({ onNav }) {
  const [cat, setCat] = useState("all");
  const [dur, setDur] = useState("all");
  const [level, setLevel] = useState([]);
  const [regions, setRegions] = useState([]);
  const [q, setQ] = useState("");
  const [priceMax, setPriceMax] = useState(500);
  const [sort, setSort] = useState("popular");
  const [saved, setSaved] = useState({});
  const openAct = (a) => onNav("activity", { act: a });

  const toggle = (list, set, k) => set(list.includes(k) ? list.filter(x=>x!==k) : [...list, k]);
  const toggleSave = (id) => setSaved(s => ({...s, [id]: !s[id]}));

  const featured = ACTIVITIES.find(a => a.badges.includes("Imprescindible")) || ACTIVITIES[0];
  const regionOpts = Array.from(new Set(ACTIVITIES.map(a => a.region)));

  const filtered = useMemo(() => {
    let arr = ACTIVITIES.filter(a => a.price <= priceMax);
    if (cat !== "all") arr = arr.filter(a => a.cat === cat);
    if (dur !== "all") arr = arr.filter(a => a.bucket === dur);
    if (level.length) arr = arr.filter(a => level.includes(a.level));
    if (regions.length) arr = arr.filter(a => regions.includes(a.region));
    if (q.trim()) {
      const m = q.toLowerCase();
      arr = arr.filter(a => (a.title+a.subtitle+a.loc+a.desc).toLowerCase().includes(m));
    }
    if (sort === "priceAsc") arr = [...arr].sort((x,y)=>x.price-y.price);
    if (sort === "priceDesc") arr = [...arr].sort((x,y)=>y.price-x.price);
    if (sort === "rating") arr = [...arr].sort((x,y)=>y.rating-x.rating);
    if (sort === "duration") arr = [...arr].sort((x,y)=>x.durMin-y.durMin);
    return arr;
  }, [cat, dur, level, regions, q, priceMax, sort]);

  const clear = () => { setCat("all"); setDur("all"); setLevel([]); setRegions([]); setQ(""); setPriceMax(500); };

  return (
    <div data-screen-label="Experiences">
      <PageHero
        eyebrow="Experiencias"
        title="Actividades"
        emphasis="para sumar a tu viaje."
        subtitle="Oficios, caminatas, cocina, mar, selva. Reservables sueltas o como add-on a cualquier paquete."
        scene={DESTINATIONS[2].scene}
        trail={[{label:"Inicio",page:"home"},{label:"Experiencias"}]}
        onNav={onNav}
      />

      {/* Category tiles */}
      <section className="section" style={{paddingTop: 56, paddingBottom: 24}}>
        <div className="container">
          <div className="exp-cats">
            {EXP_CATS.map(c => (
              <button key={c.k} className={`exp-cat ${cat===c.k?"active":""}`} onClick={()=>setCat(c.k)}>
                <b>{c.l}</b>
                <small>{c.sub}</small>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="section" style={{paddingTop: 0, paddingBottom: 40}}>
        <div className="container">
          <article className="exp-featured" onClick={()=>openAct(featured)}>
            <div className="exp-feat-media"><Scenic scene={featured.dest.scene}/></div>
            <div className="exp-feat-body">
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:14}}>
                <span className="chip chip-accent">Imprescindible del mes</span>
                <span className="chip chip-ink">{featured.region}</span>
              </div>
              <h2 className="display-md" style={{margin:"0 0 10px"}}>
                {featured.title} <span className="serif" style={{color:"var(--c-accent)"}}>— {featured.subtitle}.</span>
              </h2>
              <p className="body-lg" style={{maxWidth:"52ch",marginBottom:18}}>{featured.desc}</p>
              <div className="exp-feat-meta">
                <div><small>Duración</small><b>{featured.dur}</b></div>
                <div><small>Salida</small><b>{featured.time}</b></div>
                <div><small>Nivel</small><b>{LEVEL_LABELS[featured.level]}</b></div>
                <div><small>Desde</small><b>${featured.price} USD</b></div>
              </div>
              <button className="btn btn-ink btn-sm" style={{marginTop:22}}>Ver detalles <Ic.arrow s={14}/></button>
            </div>
          </article>
        </div>
      </section>

      {/* Toolbar + filters */}
      <section className="section" style={{paddingTop: 24}}>
        <div className="container">
          <div className="exp-toolbar">
            <div className="exp-search">
              <Ic.search s={16}/>
              <input placeholder="Buscar experiencias…" value={q} onChange={e=>setQ(e.target.value)}/>
            </div>
            <div className="exp-dur-tabs">
              {DUR_BUCKETS.map(b => (
                <button key={b.k} className={`filter-tab ${dur===b.k?"active":""}`} onClick={()=>setDur(b.k)}>{b.l}</button>
              ))}
            </div>
            <select className="sort-sel" value={sort} onChange={e=>setSort(e.target.value)}>
              <option value="popular">Más populares</option>
              <option value="rating">Mejor calificadas</option>
              <option value="priceAsc">Precio · menor a mayor</option>
              <option value="priceDesc">Precio · mayor a menor</option>
              <option value="duration">Duración · más cortas</option>
            </select>
          </div>

          <div className="exp-filterbar">
            <div className="exp-filter-group">
              <span className="label">Región</span>
              {regionOpts.map(r => (
                <button key={r} className={`chip-filter ${regions.includes(r)?"on":""}`} onClick={()=>toggle(regions, setRegions, r)}>{r}</button>
              ))}
            </div>
            <div className="exp-filter-group">
              <span className="label">Nivel</span>
              {Object.keys(LEVEL_LABELS).map(l => (
                <button key={l} className={`chip-filter ${level.includes(l)?"on":""}`} onClick={()=>toggle(level, setLevel, l)}>{LEVEL_LABELS[l]}</button>
              ))}
            </div>
            <div className="exp-filter-group">
              <span className="label">Precio máx</span>
              <div className="exp-range">
                <input type="range" min="0" max="500" step="10" value={priceMax} onChange={e=>setPriceMax(+e.target.value)}/>
                <span className="val">${priceMax}</span>
              </div>
            </div>
            {(cat!=="all"||dur!=="all"||level.length||regions.length||q||priceMax<500) && (
              <button className="chip-filter" onClick={clear} style={{color:"var(--c-accent)"}}>Limpiar todo</button>
            )}
          </div>

          <div className="exp-count">
            <b>{filtered.length}</b> de {ACTIVITIES.length} experiencias
          </div>

          {filtered.length === 0 ? (
            <div style={{padding:"80px 20px",textAlign:"center",background:"var(--c-surface)",borderRadius:20,border:"1px solid var(--c-line)"}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:22,marginBottom:10}}>Nada con esos criterios</div>
              <p className="body-md" style={{marginBottom:20}}>Ajusta los filtros o empieza de cero.</p>
              <button className="btn btn-ink" onClick={clear}>Limpiar filtros</button>
            </div>
          ) : (
            <div className="exp-grid">
              {filtered.map(a => (
                <ExpCard key={a.id} a={a} saved={!!saved[a.id]} onToggleSave={toggleSave} onOpen={openAct}/>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Cross-sell: add to a package */}
      <section className="section" style={{paddingTop: 24}}>
        <div className="container">
          <div className="exp-cross">
            <div className="exp-cross-body">
              <span className="label">Cross-sell</span>
              <h3 className="display-md" style={{margin:"6px 0 10px"}}>Sumá cualquier experiencia <em>a un paquete.</em></h3>
              <p className="body-md" style={{maxWidth:"52ch",marginBottom:22}}>
                Si ya elegiste un paquete, tu planner asignado puede agregar estas actividades al itinerario sin complicaciones — ajustando horarios, traslados y comidas.
              </p>
              <button className="btn btn-ink" onClick={()=>onNav("listing")}>Ver paquetes <Ic.arrow s={14}/></button>
            </div>
            <div className="exp-cross-chips">
              {ACTIVITIES.slice(0,6).map(a => (
                <div key={a.id} className="exp-cross-chip" onClick={()=>openAct(a)}>
                  <div className="exp-cross-dot"><Scenic scene={a.dest.scene}/></div>
                  <div>
                    <small>{a.loc}</small>
                    <b>{a.title}</b>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="section" style={{paddingTop: 24}}>
        <div className="container">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:28}}>
            <h2 className="display-md">Reseñas <span className="serif">destacadas.</span></h2>
            <small className="label">Últimos 30 días</small>
          </div>
          <div className="exp-reviews">
            {EXP_REVIEWS.map(r => {
              const a = ACTIVITIES.find(x => x.id === r.act);
              return (
                <article key={r.id} className="exp-review">
                  <Rating value={r.rating}/>
                  <p>"{r.txt}"</p>
                  <div className="exp-review-foot">
                    <div><b>{r.name}</b><small>{r.origin}</small></div>
                    <button className="exp-review-link" onClick={()=>openAct(a)}>{a.title} <Ic.arrow s={12}/></button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section" style={{paddingTop: 24, paddingBottom: 96}}>
        <div className="container">
          <div className="exp-finalcta">
            <div>
              <span className="label" style={{color:"rgba(255,255,255,.7)"}}>No encuentras lo tuyo</span>
              <h3 className="display-md" style={{color:"#fff",margin:"6px 0 8px"}}>Diseñamos experiencias <em>a medida.</em></h3>
              <p style={{color:"rgba(255,255,255,.8)",maxWidth:"48ch",margin:0}}>
                Si tu idea no está en el catálogo, cuéntanos. Un planner local la arma en 24h.
              </p>
            </div>
            <button className="btn btn-accent" onClick={()=>onNav("contact")}>Contarle a un planner <Ic.arrow s={14}/></button>
          </div>
        </div>
      </section>

    </div>
  );
}

Object.assign(window, { ExperiencesPage, ExpModal, ExpCard, LEVEL_LABELS, LEVEL_COLORS });
