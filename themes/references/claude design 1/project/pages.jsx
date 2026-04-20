// Additional pages: Listing, Detail, Search, Contact

// ------------------- Breadcrumbs -------------------
function Crumbs({ trail, onNav }) {
  return (
    <nav className="crumbs" aria-label="breadcrumb">
      {trail.map((t, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="sep">›</span>}
          {i === trail.length - 1
            ? <span className="cur">{t.label}</span>
            : <a onClick={()=>onNav(t.page)} style={{cursor:"pointer"}}>{t.label}</a>}
        </React.Fragment>
      ))}
    </nav>
  );
}

// ------------------- Page hero -------------------
function PageHero({ eyebrow, title, emphasis, subtitle, scene, trail, onNav }) {
  return (
    <section className="page-hero">
      {scene && <Scenic scene={scene} />}
      <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.55))"}}/>
      <div className="container">
        <Crumbs trail={trail} onNav={onNav} />
        <span className="eyebrow hero-eyebrow">{eyebrow}</span>
        <h1 className="display-lg">{title} {emphasis && <em>{emphasis}</em>}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </section>
  );
}

// ------------------- /paquetes listing -------------------
function PackagesListing({ onNav, onOpenDetail }) {
  const [dests, setDests] = useState([]);
  const [types, setTypes] = useState([]);
  const [months, setMonths] = useState([]);
  const [days, setDays] = useState(14);
  const [priceMax, setPriceMax] = useState(2500);
  const [sort, setSort] = useState("popular");
  const [saved, setSaved] = useState({});
  const [view, setView] = useState("list"); // "list" | "map"
  const [hoverPkg, setHoverPkg] = useState(null);

  const typeOpts = [
    { k: "playa", l: "Playa" },
    { k: "aventura", l: "Aventura" },
    { k: "cultura", l: "Cultura" },
    { k: "naturaleza", l: "Naturaleza" },
  ];
  const destOpts = DESTINATIONS.map(d => ({ k: d.id, l: d.name }));
  const monthOpts = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

  const toggle = (list, setList, k) => setList(list.includes(k) ? list.filter(x=>x!==k) : [...list, k]);

  const filtered = useMemo(() => {
    let arr = PACKAGES.filter(p => p.days <= days && p.price <= priceMax);
    if (types.length) arr = arr.filter(p => types.includes(p.type));
    if (dests.length) arr = arr.filter(p => dests.includes(p.dest.id));
    if (sort === "priceAsc") arr = [...arr].sort((a,b)=>a.price-b.price);
    if (sort === "priceDesc") arr = [...arr].sort((a,b)=>b.price-a.price);
    if (sort === "duration") arr = [...arr].sort((a,b)=>b.days-a.days);
    if (sort === "rating") arr = [...arr].sort((a,b)=>b.rating-a.rating);
    return arr;
  }, [dests, types, days, priceMax, sort]);

  const clear = () => { setDests([]); setTypes([]); setMonths([]); setDays(14); setPriceMax(2500); };

  const heart = (id, e) => { e.preventDefault(); e.stopPropagation(); setSaved(s=>({...s,[id]:!s[id]})); };

  return (
    <div data-screen-label="PackagesListing">
      <PageHero
        eyebrow="Catálogo"
        title="Paquetes"
        emphasis="por toda Colombia."
        subtitle="Itinerarios diseñados por planners locales. Ajustables, flexibles, punto de partida para tu viaje."
        scene={DESTINATIONS[0].scene}
        trail={[{label:"Inicio",page:"home"},{label:"Paquetes"}]}
        onNav={onNav}
      />
      <section className="section" style={{paddingTop: 56}}>
        <div className="container">
          <div className="listing">
            <aside className="filters">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <h4>Filtros</h4>
                <button onClick={clear} style={{fontSize:12,color:"var(--c-accent)",fontWeight:600}}>Limpiar</button>
              </div>

              <div className="filter-group">
                <h4 style={{marginBottom:10}}>Destino</h4>
                <div>
                  {destOpts.map(o => (
                    <button key={o.k} className={`chip-filter ${dests.includes(o.k)?"on":""}`}
                      onClick={()=>toggle(dests, setDests, o.k)}>{o.l}</button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <h4 style={{marginBottom:10}}>Tipo de viaje</h4>
                <div>
                  {typeOpts.map(o => (
                    <button key={o.k} className={`chip-filter ${types.includes(o.k)?"on":""}`}
                      onClick={()=>toggle(types, setTypes, o.k)}>{o.l}</button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <h4 style={{marginBottom:12}}>Duración (días)</h4>
                <div className="range">
                  <input type="range" min="3" max="21" value={days} onChange={e=>setDays(+e.target.value)}/>
                  <span className="val">≤ {days}</span>
                </div>
              </div>

              <div className="filter-group">
                <h4 style={{marginBottom:12}}>Precio máx (USD)</h4>
                <div className="range">
                  <input type="range" min="500" max="3000" step="50" value={priceMax} onChange={e=>setPriceMax(+e.target.value)}/>
                  <span className="val">${priceMax}</span>
                </div>
              </div>

              <div className="filter-group">
                <h4 style={{marginBottom:10}}>Mes de salida</h4>
                <div>
                  {monthOpts.map(o => (
                    <button key={o} className={`chip-filter ${months.includes(o)?"on":""}`}
                      onClick={()=>toggle(months, setMonths, o)}>{o}</button>
                  ))}
                </div>
              </div>
            </aside>

            <div>
              <div className="listing-top">
                <div className="count">
                  <b>{filtered.length}</b> de {PACKAGES.length} paquetes
                  {(dests.length+types.length)>0 && <> · <a onClick={clear} style={{cursor:"pointer",color:"var(--c-accent)"}}>limpiar filtros</a></>}
                </div>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <div className="view-toggle">
                    <button className={view==="list"?"on":""} onClick={()=>setView("list")}>
                      <Ic.grid s={14}/> Lista
                    </button>
                    <button className={view==="map"?"on":""} onClick={()=>setView("map")}>
                      <Ic.pin s={14}/> Mapa
                    </button>
                  </div>
                  <select className="sort-sel" value={sort} onChange={e=>setSort(e.target.value)}>
                    <option value="popular">Ordenar: Más populares</option>
                    <option value="priceAsc">Precio · menor a mayor</option>
                    <option value="priceDesc">Precio · mayor a menor</option>
                    <option value="duration">Duración · más largos</option>
                    <option value="rating">Mejor calificados</option>
                  </select>
                </div>
              </div>

              {filtered.length === 0 ? (
                <div style={{padding: "80px 20px", textAlign:"center", background:"var(--c-surface)", borderRadius:20, border:"1px solid var(--c-line)"}}>
                  <div style={{fontFamily:"var(--font-display)",fontSize:22,marginBottom:10}}>Ningún paquete con esos filtros</div>
                  <p className="body-md" style={{marginBottom:20}}>Prueba ensanchando el rango o limpiando filtros.</p>
                  <button className="btn btn-ink" onClick={clear}>Limpiar filtros</button>
                </div>
              ) : view === "map" ? (
                <ListingMap packages={filtered} onOpenDetail={onOpenDetail} hover={hoverPkg} setHover={setHoverPkg}/>
              ) : (
                <div className="pack-grid">
                  {filtered.map(p => (
                    <article key={p.id} className="pack-card" onClick={()=>onOpenDetail(p)}>
                      <div className="pack-media">
                        <Scenic scene={p.dest.scene}/>
                        <div className="badges">
                          {p.badges.map(b => <span key={b} className={`chip ${b==="Más vendido"?"chip-accent":"chip-white"}`}>{b}</span>)}
                        </div>
                        <button className={`heart ${saved[p.id]?"on":""}`} onClick={(e)=>heart(p.id,e)}>
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
                            <Rating value={p.rating} count={p.reviews}/>
                          </div>
                          <p className="body-md" style={{margin:"6px 0 0",fontSize:14}}>{p.subtitle}</p>
                        </div>
                        <div className="pack-meta">
                          <span className="m"><Ic.calendar s={14}/> {p.days} días</span>
                          <span className="m"><Ic.users s={14}/> {p.group}</span>
                        </div>
                        <div className="pack-foot">
                          <div className="pack-price">
                            <small>Desde · por persona</small>
                            <strong><sup>{p.currency}</sup>{p.price.toLocaleString()}</strong>
                          </div>
                          <button className="btn btn-outline btn-sm">Ver <Ic.arrow s={14}/></button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {filtered.length > 0 && view !== "map" && (
                <div style={{textAlign:"center", marginTop: 48}}>
                  <button className="btn btn-ghost">Cargar más <Ic.arrow s={14}/></button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ------------------- /paquetes/[slug] full detail -------------------
function PackageDetail({ pkg, onNav }) {
  const [openDay, setOpenDay] = useState(0);
  const [openFaq, setOpenFaq] = useState(-1);
  const [tier, setTier] = useState("standard");
  const [pax, setPax] = useState(2);
  const [month, setMonth] = useState("Octubre 2026");

  const tiers = [
    { k: "essential", name: "Esencial", pr: Math.round(pkg.price*0.85), feats: ["Hoteles 3★ bien ubicados", "Traslados compartidos", "Tours grupales"] },
    { k: "standard",  name: "Clásico",  pr: pkg.price, feats: ["Hoteles 4★ boutique", "Traslados privados", "Tours privados con guía"], featured: true },
    { k: "premium",   name: "Premium",  pr: Math.round(pkg.price*1.45), feats: ["Hoteles 5★ destacados", "Chofer privado todo el viaje", "Cenas en restaurantes curados"] },
  ];

  const highlights = [
    { i: <Ic.sparkle s={18}/>, t: "Ruta pensada a ritmo humano", d: "Ni carrera ni relleno: tiempo real para conocer, no solo pasar." },
    { i: <Ic.users s={18}/>,   t: "Guías que viven allá", d: "Cada región con un guía local que conoce personas, no solo lugares." },
    { i: <Ic.leaf s={18}/>,    t: "Alojamientos con historia", d: "Fincas, hoteles boutique y eco-lodges — nunca cadenas masivas." },
    { i: <Ic.shield s={18}/>,  t: "Asistencia 24/7", d: "Un planner respondiendo en &lt;2h desde que reservas hasta que vuelves." },
    { i: <Ic.compass s={18}/>, t: "Logística resuelta", d: "Vuelos internos, traslados, entradas: todo coordinado, un solo punto de contacto." },
    { i: <Ic.award s={18}/>,   t: "12 años, 3,200 reseñas", d: "Operador local con RNT vigente, seguros y protocolos verificados." },
  ];

  const included = [
    "Traslados aeropuerto ↔ hotel (privados)",
    `${pkg.nights} noches de alojamiento en hotel boutique`,
    "Vuelos domésticos especificados",
    "Tours guiados en cada destino",
    "Entradas a parques y sitios",
    "Desayuno diario · 2 cenas de bienvenida/despedida",
    "Asistencia telefónica 24/7 en español e inglés",
    "Seguro médico básico",
  ];
  const excluded = [
    "Vuelos internacionales",
    "Comidas no especificadas",
    "Bebidas alcohólicas",
    "Propinas a guías y conductores",
    "Gastos personales",
    "Seguro de cancelación opcional (+6% del total)",
  ];

  const faqs = [
    { q: "¿Qué nivel de forma física necesito?", a: "Para este paquete basta con caminatas cortas de hasta 2h. Las rutas más exigentes son opcionales y siempre con guía." },
    { q: "¿Es apto para niños?", a: "Sí, desde los 6 años. Tenemos variantes familiares con habitaciones conectadas y actividades adaptadas." },
    { q: "¿Qué pasa si hay mal tiempo?", a: "Ofrecemos plan B por día. Si una actividad debe cancelarse por clima, se reprograma o se reembolsa ese tramo." },
    { q: "¿Puedo extender el viaje?", a: "Totalmente. Al momento de confirmar, tu planner te propone extensiones (Amazonía, Pacífico, San Andrés)." },
  ];

  return (
    <div data-screen-label="PackageDetail">
      <div className="detail-hero">
        <Scenic scene={pkg.dest.scene}/>
        <div className="wash"/>
        <div className="container meta">
          <Crumbs
            trail={[
              {label:"Inicio",page:"home"},
              {label:"Paquetes",page:"listing"},
              {label:pkg.title}
            ]}
            onNav={onNav}
          />
          <div className="chips">
            {pkg.badges.map(b => <span key={b} className={`chip ${b==="Más vendido"?"chip-accent":"chip-white"}`}>{b}</span>)}
            <span className="chip chip-white">{pkg.loc}</span>
          </div>
          <h1 className="display-lg">{pkg.title} <em>— {pkg.dest.name}</em></h1>
          <div style={{display:"flex",gap:20,alignItems:"center",color:"rgba(255,255,255,.92)"}}>
            <Rating value={pkg.rating} count={pkg.reviews} size={16}/>
            <span style={{opacity:.8}}>·</span>
            <span style={{fontSize:14}}>{pkg.subtitle}</span>
          </div>
        </div>
        <button className="gallery-toggle"><Ic.search s={14}/> Ver 24 fotos</button>
      </div>

      <div className="container">
        <div className="overview-bar">
          <div className="ov-item"><small>Duración</small><strong>{pkg.days} días / {pkg.nights} noches</strong></div>
          <div className="ov-item"><small>Destinos</small><strong>{pkg.subtitle.split("·").length} ciudades</strong></div>
          <div className="ov-item"><small>Grupo</small><strong>{pkg.group}</strong></div>
          <div className="ov-item"><small>Dificultad</small><strong>Moderada</strong></div>
          <div className="ov-item"><small>Mejor época</small><strong>Dic – Abr</strong></div>
        </div>

        <div className="detail-body">
          <div className="detail-main">
            <section>
              <h2>Un viaje que <em>sabe a Colombia.</em></h2>
              <p className="body-lg">
                Este paquete recorre {pkg.subtitle.toLowerCase()} en {pkg.days} días hechos a la medida del viajero que quiere ver, comer, caminar y quedarse un rato más. Nada de listas infinitas: paramos donde hay que parar, caminamos cuando hay que caminar, y dejamos espacio para lo que nadie planea pero todo mundo recuerda.
              </p>
              <div className="highlights-grid" style={{marginTop: 24}}>
                {highlights.map((h, i) => (
                  <div className="hl-card" key={i}>
                    <div className="ic">{h.i}</div>
                    <b>{h.t}</b>
                    <p dangerouslySetInnerHTML={{__html: h.d}}/>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2>Itinerario <em>día a día</em></h2>
              <div className="day-list">
                {pkg.itinerary.map((d, i) => (
                  <div className={`day-card ${openDay===i?"open":""}`} key={i}>
                    <button className="day-head" onClick={()=>setOpenDay(openDay===i?-1:i)}>
                      <div className="num">{String(i+1).padStart(2,"0")}</div>
                      <div>
                        <small>{d.d}</small>
                        <h3>{d.t}</h3>
                      </div>
                      <div className="chev"><Ic.arrow s={14}/></div>
                    </button>
                    <div className="day-body">
                      <div className="day-inner">
                        <div>
                          <p>{d.b}</p>
                          <div className="chips">
                            <span className="chip chip-ink"><Ic.pin s={12}/> Meeting point 8:00</span>
                            <span className="chip chip-ink"><Ic.clock s={12}/> ~6 horas</span>
                          </div>
                        </div>
                        <div className="day-media"><Scenic scene={pkg.dest.scene}/></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2>Qué <em>incluye y no</em> incluye</h2>
              <div className="incl-grid">
                <div className="incl-col yes">
                  <b>Incluido en el precio</b>
                  <ul>
                    {included.map(x => <li key={x}><span className="mark"><Ic.check s={16}/></span>{x}</li>)}
                  </ul>
                </div>
                <div className="incl-col no">
                  <b>No incluido</b>
                  <ul>
                    {excluded.map(x => <li key={x}><span className="mark"><Ic.close s={14}/></span>{x}</li>)}
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2>Opciones <em>de precio</em></h2>
              <p className="body-md" style={{marginBottom:24,marginTop:-8}}>Elige la línea que mejor te acomode — tu planner puede mezclar hoteles entre categorías.</p>
              <div className="price-table">
                {tiers.map(t => (
                  <div key={t.k} className={`price-col ${t.featured?"featured":""}`}>
                    <h4>{t.name}</h4>
                    <div>
                      <div className="pr"><sup>USD</sup>{t.pr.toLocaleString()}</div>
                      <div className="per">por persona · habitación doble</div>
                    </div>
                    <ul>{t.feats.map(f => <li key={f}>{f}</li>)}</ul>
                    <button className={`btn ${t.featured?"btn-accent":"btn-outline"}`} style={{marginTop:"auto",justifyContent:"center"}}>
                      Elegir {t.name}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2>Preguntas <em>frecuentes</em></h2>
              <div className="faq-list">
                {faqs.map((f, i) => (
                  <div className={`faq-item ${openFaq===i?"open":""}`} key={i}>
                    <button className="faq-q" onClick={()=>setOpenFaq(openFaq===i?-1:i)}>
                      <span>{f.q}</span>
                      <span className="plus"><Ic.plus s={14}/></span>
                    </button>
                    <div className="faq-a">{f.a}</div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2>Tu planner <em>asignado</em></h2>
              <div style={{display:"grid",gridTemplateColumns:"120px 1fr auto",gap:24,alignItems:"center",padding:24,background:"var(--c-surface)",border:"1px solid var(--c-line)",borderRadius:20}}>
                <div style={{width:100,height:100,borderRadius:"50%",background:PLANNERS[0].av}}/>
                <div>
                  <b style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:500,letterSpacing:"-0.01em"}}>{PLANNERS[0].name}</b>
                  <div style={{color:"var(--c-muted)",fontSize:13,letterSpacing:".12em",textTransform:"uppercase",fontWeight:600,margin:"4px 0 8px"}}>{PLANNERS[0].role} · {PLANNERS[0].years} años</div>
                  <p style={{margin:0,fontSize:14,color:"var(--c-ink-2)",maxWidth:"52ch"}}>"Cartagena es mi ciudad. Conozco el chef que hace el mejor ceviche, al guía que sabe la historia de cada piedra, y los bares donde suena vallenato de verdad."</p>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <button className="btn btn-primary btn-sm"><Ic.whatsapp s={14}/> WhatsApp</button>
                  <button className="btn btn-outline btn-sm">Ver perfil</button>
                </div>
              </div>
            </section>

            <section style={{borderTop:"none",paddingTop:20}}>
              <h2>Paquetes <em>similares</em></h2>
              <div className="pack-grid">
                {PACKAGES.filter(p => p.id !== pkg.id).slice(0,3).map(p => (
                  <article key={p.id} className="pack-card" onClick={()=>{}}>
                    <div className="pack-media"><Scenic scene={p.dest.scene}/>
                      <div className="badges">{p.badges.map(b => <span key={b} className="chip chip-white">{b}</span>)}</div>
                    </div>
                    <div className="pack-body">
                      <div className="pack-loc-row">
                        <div className="pack-loc">{p.loc}</div>
                        <CountryChip destId={p.dest.id} region={p.dest.region}/>
                      </div>
                      <div className="pack-header"><h3>{p.title}</h3><Rating value={p.rating}/></div>
                      <div className="pack-foot">
                        <div className="pack-price"><small>Desde</small><strong><sup>{p.currency}</sup>{p.price.toLocaleString()}</strong></div>
                        <button className="btn btn-outline btn-sm">Ver <Ic.arrow s={14}/></button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="detail-rail">
            <div>
              <div style={{fontSize:11,letterSpacing:".14em",textTransform:"uppercase",color:"var(--c-muted)",fontWeight:600,marginBottom:4}}>Desde · por persona</div>
              <div className="rail-price">
                <span className="big"><sup>{pkg.currency}</sup>{pkg.price.toLocaleString()}</span>
              </div>
              <div style={{fontSize:12,color:"var(--c-muted)",marginTop:4}}>{pkg.days} días · hab. doble · temp. media</div>
            </div>
            <div className="rail-form">
              <div className="fld"><label>Fecha salida</label><select value={month} onChange={e=>setMonth(e.target.value)}>
                {["Oct 2026","Nov 2026","Dic 2026","Ene 2027","Feb 2027","Mar 2027"].map(m=><option key={m}>{m}</option>)}
              </select></div>
              <div className="fld"><label>Viajeros</label><select value={pax} onChange={e=>setPax(+e.target.value)}>
                {[1,2,3,4,5,6,8,10].map(n=><option key={n} value={n}>{n} {n===1?"viajero":"viajeros"}</option>)}
              </select></div>
              <div className="fld"><label>Categoría</label><select value={tier} onChange={e=>setTier(e.target.value)}>
                <option value="essential">Esencial</option>
                <option value="standard">Clásico</option>
                <option value="premium">Premium</option>
              </select></div>
            </div>
            <button className="btn btn-primary" style={{justifyContent:"center"}}>Solicitar cotización <Ic.arrow s={14}/></button>
            <button className="btn btn-outline" style={{justifyContent:"center"}}>
              <Ic.whatsapp s={14}/> Chat directo
            </button>
            <div className="rail-share">
              <button><Ic.heart s={14}/> Guardar</button>
              <button><Ic.arrowUpRight s={14}/> Compartir</button>
            </div>
            <div style={{fontSize:12,color:"var(--c-muted)",textAlign:"center",paddingTop:10,borderTop:"1px solid var(--c-line)"}}>
              Cancelación flexible hasta 45 días antes · Sin cargo por reservar
            </div>
          </aside>
        </div>
      </div>

      <div className="mobile-bar">
        <div>
          <div style={{fontSize:11,color:"var(--c-muted)"}}>Desde</div>
          <b><sup style={{fontSize:11}}>{pkg.currency}</sup>{pkg.price.toLocaleString()}</b>
        </div>
        <button className="btn btn-primary btn-sm">Cotizar <Ic.arrow s={14}/></button>
      </div>
    </div>
  );
}

// ------------------- /buscar -------------------
function SearchPage({ onNav, onOpenDetail }) {
  const [q, setQ] = useState("cartagena");
  const matched = q.toLowerCase();
  const destHits = DESTINATIONS.filter(d => d.name.toLowerCase().includes(matched)).slice(0,4);
  const packHits = PACKAGES.filter(p => p.title.toLowerCase().includes(matched) || p.subtitle.toLowerCase().includes(matched) || p.dest.name.toLowerCase().includes(matched)).slice(0,4);
  const actHits = ACTIVITIES.filter(a => a.title.toLowerCase().includes(matched) || a.loc.toLowerCase().includes(matched)).slice(0,4);

  return (
    <div data-screen-label="Search">
      <PageHero
        eyebrow="Buscar"
        title="¿Adónde" emphasis="te llevamos?"
        subtitle="Busca por destino, paquete, actividad o pregunta."
        scene={DESTINATIONS[4].scene}
        trail={[{label:"Inicio",page:"home"},{label:"Buscar"}]}
        onNav={onNav}
      />
      <section className="section" style={{paddingTop: 0}}>
        <div className="container">
          <div className="search-big">
            <Ic.search s={22} />
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cartagena, Eje Cafetero, caminata..." autoFocus/>
            <button className="btn btn-ink btn-sm">Buscar</button>
          </div>

          {(destHits.length+packHits.length+actHits.length === 0) ? (
            <div style={{padding:"100px 0",textAlign:"center"}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:26,marginBottom:12}}>Nada para "<em style={{fontFamily:"var(--font-serif)",fontStyle:"italic",color:"var(--c-accent)"}}>{q}</em>"</div>
              <p className="body-md" style={{maxWidth:"40ch",margin:"0 auto"}}>Prueba con otra palabra, o mira lo más buscado abajo.</p>
            </div>
          ) : (
            <div className="search-group">
              {destHits.length > 0 && (
                <div>
                  <h3>Destinos <a onClick={()=>onNav("listing")} style={{cursor:"pointer"}}>Ver todos →</a></h3>
                  <div className="sr-grid">
                    {destHits.map(d => (
                      <div className="sr-card" key={d.id}>
                        <div className="sr-media"><Scenic scene={d.scene}/></div>
                        <div className="sr-body">
                          <small>{d.region}</small>
                          <b>{d.name}</b>
                          <div className="pr">{d.subtitle}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {packHits.length > 0 && (
                <div>
                  <h3>Paquetes <a onClick={()=>onNav("listing")} style={{cursor:"pointer"}}>Ver todos →</a></h3>
                  <div className="sr-grid">
                    {packHits.map(p => (
                      <div className="sr-card" key={p.id} onClick={()=>onOpenDetail(p)} style={{cursor:"pointer"}}>
                        <div className="sr-media"><Scenic scene={p.dest.scene}/></div>
                        <div className="sr-body">
                          <small>{p.loc} · {p.days}d</small>
                          <b>{p.title}</b>
                          <div className="pr">Desde ${p.price} {p.currency}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {actHits.length > 0 && (
                <div>
                  <h3>Actividades <a style={{cursor:"pointer"}}>Ver todas →</a></h3>
                  <div className="sr-grid">
                    {actHits.map(a => (
                      <div className="sr-card" key={a.id}>
                        <div className="sr-media"><Scenic scene={DESTINATIONS.find(d=>d.name===a.loc)?.scene || DESTINATIONS[0].scene}/></div>
                        <div className="sr-body">
                          <small>{a.loc} · {a.dur}</small>
                          <b>{a.title}</b>
                          <div className="pr">{a.price === 0 ? "Gratis" : `Desde $${a.price} USD`}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ------------------- /contacto -------------------
function ContactPage({ onNav }) {
  const [type, setType] = useState("paquete");
  const [sent, setSent] = useState(false);
  const types = [
    { k: "paquete", l: "Un paquete específico" },
    { k: "personalizado", l: "Algo a la medida" },
    { k: "grupo", l: "Grupo / corporativo" },
    { k: "info", l: "Información general" },
  ];

  return (
    <div data-screen-label="Contact">
      <PageHero
        eyebrow="Contacto"
        title="Cuéntanos" emphasis="qué sueñas."
        subtitle="Un planner te responde en <2 horas hábiles con una primera propuesta."
        scene={DESTINATIONS[2].scene}
        trail={[{label:"Inicio",page:"home"},{label:"Contacto"}]}
        onNav={onNav}
      />
      <section className="section" style={{paddingTop: 56}}>
        <div className="container">
          <div className="contact-grid">
            <div className="contact-info">
              <h2 className="display-md">Tres formas <em>de escribirnos.</em></h2>
              <p className="body-md" style={{marginTop: 16, maxWidth:"44ch"}}>
                Siempre responde una persona — no un bot ni un formulario en cola. Si quieres hablar antes de escribir, el WhatsApp es el camino más rápido.
              </p>
              <div className="ways">
                <a className="contact-way" href="#">
                  <div className="ic" style={{background:"#25D366",color:"#fff"}}><Ic.whatsapp s={22}/></div>
                  <div>
                    <b>WhatsApp</b>
                    <small>+57 310 123 4567 · Responde en <b>&lt;15 min</b></small>
                  </div>
                </a>
                <a className="contact-way">
                  <div className="ic"><Ic.globe s={22}/></div>
                  <div>
                    <b>hola@colombiatours.travel</b>
                    <small>Correo · respuesta en &lt;2h hábiles</small>
                  </div>
                </a>
                <a className="contact-way">
                  <div className="ic"><Ic.pin s={22}/></div>
                  <div>
                    <b>Cr 43A #14-52, El Poblado</b>
                    <small>Medellín, Colombia · Lun–Vie 9:00–18:00</small>
                  </div>
                </a>
              </div>
            </div>

            <form className="contact-form" onSubmit={e=>{e.preventDefault(); setSent(true);}}>
              {sent ? (
                <div style={{textAlign:"center",padding:"40px 20px"}}>
                  <div style={{width:64,height:64,borderRadius:"50%",background:"var(--c-accent-3)",color:"#fff",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:20}}>
                    <Ic.check s={28}/>
                  </div>
                  <h3 style={{fontFamily:"var(--font-display)",fontSize:24,margin:"0 0 10px",fontWeight:500,letterSpacing:"-0.015em"}}>¡Enviado!</h3>
                  <p className="body-md">Mariana o alguien del equipo te escribe en las próximas 2 horas hábiles.</p>
                  <button type="button" className="btn btn-outline" style={{marginTop:20}} onClick={()=>setSent(false)}>Enviar otro</button>
                </div>
              ) : (
              <>
              <h3 style={{fontFamily:"var(--font-display)",fontSize:22,margin:"0 0 6px",fontWeight:600,letterSpacing:"-0.015em"}}>Cuéntanos de tu viaje</h3>
              <p style={{margin:"0 0 22px",fontSize:14,color:"var(--c-muted)"}}>Campos con * son necesarios — el resto nos ayuda a ajustar mejor.</p>

              <div className="form-row">
                <label>¿Sobre qué quieres hablar? *</label>
                <div className="type-chips">
                  {types.map(t => (
                    <button type="button" key={t.k} className={`chip-filter ${type===t.k?"on":""}`} onClick={()=>setType(t.k)}>{t.l}</button>
                  ))}
                </div>
              </div>

              <div className="form-row two">
                <div className="form-row"><label>Nombre *</label><input required placeholder="Tu nombre"/></div>
                <div className="form-row"><label>Correo *</label><input type="email" required placeholder="tu@correo.com"/></div>
              </div>
              <div className="form-row two">
                <div className="form-row"><label>Teléfono / WhatsApp</label><input placeholder="+57 310 ..."/></div>
                <div className="form-row"><label>Viajeros</label><select>
                  <option>1 persona</option><option>2 personas</option><option>3–4 personas</option><option>5+ personas</option>
                </select></div>
              </div>
              <div className="form-row two">
                <div className="form-row"><label>Fechas aproximadas</label><input placeholder="Oct – Nov 2026"/></div>
                <div className="form-row"><label>Presupuesto por persona</label><select>
                  <option>&lt; $1,000 USD</option><option>$1,000 – $2,000</option><option>$2,000 – $4,000</option><option>$4,000+</option><option>Flexible</option>
                </select></div>
              </div>
              <div className="form-row">
                <label>Cuéntanos más (opcional)</label>
                <textarea placeholder="Qué te interesa, con quién viajas, si es aniversario, primera vez en Colombia, etc."></textarea>
              </div>
              <div style={{display:"flex",gap:10,alignItems:"center",marginTop:8}}>
                <button className="btn btn-primary" type="submit">Enviar mensaje <Ic.arrow s={14}/></button>
                <span style={{fontSize:12,color:"var(--c-muted)"}}>Respondemos en &lt;2h hábiles</span>
              </div>
              </>
              )}
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

Object.assign(window, { PackagesListing, PackageDetail, SearchPage, ContactPage, Crumbs, PageHero });
