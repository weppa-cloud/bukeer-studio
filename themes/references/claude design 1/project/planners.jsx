// Planners — list + detail pages

// ============ LIST PAGE ============
function PlannersList({ onNav, onOpenPlanner }) {
  const [filter, setFilter] = useState("all");
  const [quizRegion, setQuizRegion] = useState("Caribe");
  const [quizStyle, setQuizStyle] = useState("cultura");

  const tabs = [
    { k: "all", label: "Todos", count: PLANNERS.length },
    { k: "Cartagena", label: "Caribe" },
    { k: "Eje Cafetero", label: "Eje Cafetero" },
    { k: "Amazonas", label: "Amazonas / Pacífico" },
    { k: "Sierra Nevada", label: "Aventura" },
    { k: "Medellín", label: "Medellín" },
    { k: "Cali", label: "Pacífico Sur" },
  ];

  const list = useMemo(() => {
    if (filter === "all") return PLANNERS;
    return PLANNERS.filter(p => p.regions.some(r => r.includes(filter)));
  }, [filter]);

  const matched = useMemo(() => {
    const s = quizStyle;
    return PLANNERS.filter(p => p.styles.includes(s)).slice(0, 2);
  }, [quizStyle]);

  return (
    <div data-screen-label="PlannersList">
      <PageHero
        eyebrow="Nuestros planners"
        title="Una persona"
        emphasis="que conoce su tierra."
        subtitle="Seis especialistas locales. Cada uno con una región, un oficio y 5–11 años diseñando viajes a medida por Colombia."
        scene={DESTINATIONS[2].scene}
        trail={[{label:"Inicio",page:"home"},{label:"Planners"}]}
        onNav={onNav}
      />

      <section className="section" style={{paddingTop: 0, paddingBottom: 0}}>
        <div className="container">
          <div className="pl-intro">
            <div>
              <span className="eyebrow">Por qué un planner local</span>
              <h2>No somos un motor de reservas — <em>somos seis personas</em> que han caminado Colombia.</h2>
              <p>Cuando reservas con nosotros, no hablas con un call center. Te emparejamos con la persona que vive en la región donde quieres ir, habla tu idioma, y conoce a los chefs, guías, y familias que harán tu viaje distinto al de los demás.</p>
            </div>
            <div className="stats">
              <div className="s"><b>6</b><small>Planners locales</small></div>
              <div className="s"><b>4.97<em>/5</em></b><small>Reseñas promedio</small></div>
              <div className="s"><b>939</b><small>Viajes diseñados</small></div>
            </div>
          </div>

          <div className="pl-toolbar">
            <div className="pl-tabs">
              {tabs.map(t => (
                <button key={t.k} className={`filter-tab ${filter===t.k?"active":""}`} onClick={()=>setFilter(t.k)}>
                  {t.label} {t.count && <span className="count">{t.count}</span>}
                </button>
              ))}
            </div>
            <div style={{fontSize:13,color:"var(--c-muted)"}}>
              {list.length} {list.length===1?"planner":"planners"} · ordenar por <b style={{color:"var(--c-ink)"}}>reseñas</b>
            </div>
          </div>

          <div className="pl-grid">
            {list.map(p => {
              const dest = DESTINATIONS[p.destScene ?? 0] || DESTINATIONS[0];
              return (
                <article key={p.id} className="pl-card" onClick={()=>onOpenPlanner(p)} style={{"--av": p.av}}>
                  <div className="top">
                    <div className="av" />
                    <div className="who">
                      <b>{p.name}</b>
                      <div className="role">{p.role}</div>
                    </div>
                  </div>
                  <div className="body">
                    <p className="quote">"{p.quote.split(".")[0]}."</p>
                    <div className="meta-row">
                      <span className="it"><Ic.star s={13}/> <b>{p.rating}</b> <small style={{color:"var(--c-muted)"}}>({p.reviews})</small></span>
                      <span className="it"><Ic.pin s={13}/> {p.base}</span>
                      <span className="it"><Ic.calendar s={13}/> {p.years} años</span>
                    </div>
                    <div className="tags">
                      {p.specialties.map(s => <span key={s} className="tg">{s}</span>)}
                    </div>
                    <div className="langs-row">
                      {p.langs.map(l => <span key={l} className="lg">{l}</span>)}
                    </div>
                  </div>
                  <div className="foot">
                    <span className="avail"><span className="dot"/>{p.availability}</span>
                    <a onClick={(e)=>{e.stopPropagation(); onOpenPlanner(p);}}>Ver perfil <Ic.arrow s={12}/></a>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Matchmaker */}
          <div className="pl-match">
            <div className="inner">
              <div>
                <span className="eyebrow hero-eyebrow">Encuentra tu planner</span>
                <h3>Dinos qué buscas <em>y te emparejamos</em> en 30 segundos.</h3>
                <p>No todos los planners hacen todas las regiones. Cuéntanos dónde quieres ir y qué te mueve — nosotros sabemos quién firma ese viaje.</p>
                <button className="btn btn-accent">Hablar con mi match <Ic.arrow s={14}/></button>
              </div>
              <div className="quiz">
                <label>¿A qué región vas?</label>
                <div className="opts">
                  {["Caribe","Andes","Amazonas","Pacífico","Aventura"].map(r => (
                    <button key={r} className={quizRegion===r?"on":""} onClick={()=>setQuizRegion(r)}>{r}</button>
                  ))}
                </div>
                <label>¿Qué estilo de viaje?</label>
                <div className="opts">
                  {[
                    {k:"cultura",l:"Cultura"},
                    {k:"aventura",l:"Aventura"},
                    {k:"naturaleza",l:"Naturaleza"},
                    {k:"gastronomia",l:"Gastronomía"},
                    {k:"boutique",l:"Boutique"},
                  ].map(s => (
                    <button key={s.k} className={quizStyle===s.k?"on":""} onClick={()=>setQuizStyle(s.k)}>{s.l}</button>
                  ))}
                </div>
                {matched.length > 0 && (
                  <div style={{marginTop:18,paddingTop:18,borderTop:"1px solid rgba(255,255,255,.12)"}}>
                    <label>Match sugerido</label>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {matched.map(m => (
                        <button key={m.id} onClick={()=>onOpenPlanner(m)}
                          style={{display:"grid",gridTemplateColumns:"40px 1fr auto",gap:12,alignItems:"center",padding:"10px 14px",borderRadius:14,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",color:"#fff",textAlign:"left"}}>
                          <div style={{width:40,height:40,borderRadius:"50%",background:m.av}}/>
                          <div>
                            <b style={{fontFamily:"var(--font-display)",fontWeight:500,fontSize:14,display:"block"}}>{m.name}</b>
                            <small style={{color:"rgba(255,255,255,.6)",fontSize:11}}>{m.role}</small>
                          </div>
                          <Ic.arrow s={14}/>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ============ DETAIL PAGE ============
function PlannerDetail({ planner, onNav, onOpenDetail }) {
  const p = planner;
  const dest = DESTINATIONS[p.destScene ?? 0] || DESTINATIONS[0];
  const reviews = PLANNER_REVIEWS.filter(r => r.plId === p.id);
  const halls = p.hallmarks.map(id => PACKAGES.find(pk => pk.id === id)).filter(Boolean);

  return (
    <div data-screen-label="PlannerDetail">
      <div className="pld-hero" style={{"--av": p.av, "--av-bg": dest.scene.bg}}>
        <Scenic scene={dest.scene} className="" />
        <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,.75) 100%)",zIndex:0}} />
        <div className="container" style={{position:"relative",zIndex:1}}>
          <Crumbs
            trail={[{label:"Inicio",page:"home"},{label:"Planners",page:"planners"},{label:p.name}]}
            onNav={onNav}
          />
          <div className="grid">
            <div className="big-av" />
            <div>
              <span className="role">{p.role} · {p.base}</span>
              <h1>{p.name.split(" ")[0]} <em style={{fontFamily:"var(--font-serif)",fontStyle:"italic",color:"var(--c-accent-2)",fontWeight:400}}>{p.name.split(" ").slice(1).join(" ")}</em></h1>
              <div style={{display:"flex",alignItems:"center",gap:16,color:"rgba(255,255,255,.9)",fontSize:14}}>
                <span style={{display:"inline-flex",alignItems:"center",gap:6}}><Ic.star s={14}/> <b>{p.rating}</b> · {p.reviews} reseñas</span>
                <span style={{opacity:.5}}>·</span>
                <span>{p.trips} viajes diseñados</span>
              </div>
              <div className="tags">
                {p.regions.map(r => <span key={r} className="tg">{r}</span>)}
              </div>
            </div>
            <div className="kpis">
              <div className="k"><b>{p.years}<em>a</em></b><small>Experiencia</small></div>
              <div className="k"><b>{p.trips}</b><small>Viajes</small></div>
              <div className="k"><b>{p.rating}</b><small>Rating</small></div>
              <div className="k"><b>{p.langs.length}</b><small>Idiomas</small></div>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="pld-body">
          <div className="pld-main">
            <section>
              <p className="big-quote">{p.quote}</p>
            </section>

            <section>
              <h2>Sobre <em>{p.name.split(" ")[0]}</em></h2>
              <p style={{fontSize:17,lineHeight:1.7}}>{p.bio}</p>
            </section>

            <section>
              <h2>Lo que <em>hace diferente</em></h2>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginTop:20}}>
                <div>
                  <small style={{color:"var(--c-muted)",fontSize:11,letterSpacing:".14em",textTransform:"uppercase",fontWeight:600}}>Especialidades</small>
                  <div className="chips-row">
                    {p.specialties.map(s => <span key={s} className="c">{s}</span>)}
                  </div>
                </div>
                <div>
                  <small style={{color:"var(--c-muted)",fontSize:11,letterSpacing:".14em",textTransform:"uppercase",fontWeight:600}}>Regiones</small>
                  <div className="chips-row">
                    {p.regions.map(r => <span key={r} className="c">{r}</span>)}
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2>Viaje <em>firma</em></h2>
              <div className="sig-card">
                <div className="sig-media">
                  <Scenic scene={dest.scene} />
                  <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,transparent 50%,rgba(0,0,0,.4))"}}/>
                  <span className="chip chip-accent" style={{position:"absolute",top:18,left:18}}>Firma de {p.name.split(" ")[0]}</span>
                </div>
                <div className="sig-body">
                  <small>ITINERARIO DESTACADO</small>
                  <h3>{p.signature.title}</h3>
                  <p>{p.signature.note}</p>
                  <div style={{display:"flex",gap:10,marginTop:6}}>
                    <button className="btn btn-primary btn-sm" onClick={()=>{
                      const pk = halls[0] || PACKAGES[0];
                      onOpenDetail && onOpenDetail(pk);
                    }}>Ver itinerario <Ic.arrow s={14}/></button>
                    <button className="btn btn-outline btn-sm">Pedirle a {p.name.split(" ")[0]} <Ic.whatsapp s={14}/></button>
                  </div>
                </div>
              </div>
            </section>

            {halls.length > 0 && (
              <section>
                <h2>Otros paquetes <em>que diseña</em></h2>
                <div className="hall-grid">
                  {halls.map(pk => (
                    <article key={pk.id} className="pack-card" onClick={()=>onOpenDetail && onOpenDetail(pk)} style={{cursor:"pointer"}}>
                      <div className="pack-media">
                        <Scenic scene={pk.dest.scene}/>
                        <div className="badges">{pk.badges.slice(0,1).map(b => <span key={b} className="chip chip-white">{b}</span>)}</div>
                      </div>
                      <div className="pack-body">
                        <div className="pack-loc">{pk.loc}</div>
                        <div className="pack-header"><h3 style={{fontSize:17}}>{pk.title}</h3></div>
                        <div className="pack-foot">
                          <div className="pack-price"><small>Desde</small><strong><sup>{pk.currency}</sup>{pk.price.toLocaleString()}</strong></div>
                          <button className="btn btn-outline btn-sm">Ver <Ic.arrow s={12}/></button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2>Detalles <em>personales</em></h2>
              <div className="facts">
                {p.funFacts.map((f, i) => (
                  <div className="fact" key={i}>
                    <div className="num">0{i+1}.</div>
                    <p>{f}</p>
                  </div>
                ))}
              </div>
            </section>

            {reviews.length > 0 && (
              <section>
                <h2>Lo que dicen <em>viajeros de {p.name.split(" ")[0]}</em></h2>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                  {reviews.map(r => (
                    <div key={r.id} className="review-card">
                      <div className="stars">
                        {Array.from({length: r.rating}).map((_,i)=><Ic.star key={i} s={14}/>)}
                      </div>
                      <p>"{r.txt}"</p>
                      <div className="who">
                        <div className="av"/>
                        <div>
                          <b>{r.name}</b>
                          <small>{r.origin} · {r.pkg}</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* RAIL */}
          <aside className="pld-rail">
            <div className="avail-row"><span className="dot"/>{p.availability}</div>
            <div>
              <div style={{fontSize:11,letterSpacing:".14em",textTransform:"uppercase",color:"var(--c-muted)",fontWeight:600,marginBottom:6}}>Hablar con</div>
              <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:500,letterSpacing:"-0.015em"}}>{p.name}</div>
              <div style={{fontSize:13,color:"var(--c-muted)",marginTop:2}}>{p.role}</div>
            </div>
            <div>
              <div className="resp"><span>Tiempo de respuesta</span><b>{p.response}</b></div>
              <div className="resp"><span>Desde</span><b>{p.base}</b></div>
              <div className="resp"><span>Idiomas</span>
                <div style={{display:"flex",gap:4}}>
                  {p.langs.map(l => <span key={l} className="lg" style={{fontSize:10,padding:"2px 7px"}}>{l}</span>)}
                </div>
              </div>
            </div>
            <button className="btn btn-primary" style={{justifyContent:"center"}}>
              <Ic.whatsapp s={14}/> Escribir a {p.name.split(" ")[0]}
            </button>
            <button className="btn btn-outline" style={{justifyContent:"center"}} onClick={()=>onNav("contact")}>
              Pedir propuesta <Ic.arrow s={14}/>
            </button>
            <div style={{fontSize:12,color:"var(--c-muted)",textAlign:"center",paddingTop:10,borderTop:"1px solid var(--c-line)",lineHeight:1.5}}>
              Sin compromiso · Primera propuesta en &lt;2h hábiles
            </div>
          </aside>
        </div>

        {/* Other planners */}
        <section style={{padding:"40px 0 80px",borderTop:"1px solid var(--c-line)",marginTop:40}}>
          <h2 style={{fontFamily:"var(--font-display)",fontWeight:500,fontSize:26,letterSpacing:"-0.02em",margin:"0 0 20px"}}>Otros <em style={{fontFamily:"var(--font-serif)",fontStyle:"italic",color:"var(--c-accent)",fontWeight:400}}>planners</em></h2>
          <div className="pl-grid">
            {PLANNERS.filter(o => o.id !== p.id).slice(0, 3).map(o => (
              <article key={o.id} className="pl-card" onClick={()=>onNav("planner", { planner: o })} style={{"--av": o.av}}>
                <div className="top">
                  <div className="av" />
                  <div className="who">
                    <b>{o.name}</b>
                    <div className="role">{o.role}</div>
                  </div>
                </div>
                <div className="body">
                  <p className="quote">"{o.quote.split(".")[0]}."</p>
                  <div className="meta-row">
                    <span className="it"><Ic.star s={13}/> <b>{o.rating}</b></span>
                    <span className="it"><Ic.pin s={13}/> {o.base}</span>
                  </div>
                </div>
                <div className="foot">
                  <span className="avail"><span className="dot"/>Disponible</span>
                  <a>Ver perfil <Ic.arrow s={12}/></a>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

Object.assign(window, { PlannersList, PlannerDetail });
