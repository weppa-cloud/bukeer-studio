// Enhanced detail pages — PackageDetail v2 and ActivityDetail
// Replaces the basic PackageDetail and the ExpModal for primary detail view
const { useState: _dUseState, useMemo: _dUseMemo, useEffect: _dUseEffect } = React;
const useState = _dUseState, useMemo = _dUseMemo, useEffect = _dUseEffect;

// ============================================================
// Shared primitives
// ============================================================

// ---- Gallery strip (scenic placeholders laid out) ----
function GalleryStrip({ scene, count=6, onOpen }) {
  const tiles = Array.from({length: count});
  return (
    <section className="gallery-strip">
      <div className="gs-grid">
        {tiles.map((_, i) => (
          <div key={i} className={`gs-tile gs-tile-${i}`} onClick={()=>onOpen?.(i)}>
            <Scenic scene={scene}/>
            {i === count-1 && (
              <div className="gs-more"><Ic.search s={14}/> Ver {count*4} fotos</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- Route map (visual horizontal path) ----
function RouteMap({ stops }) {
  return (
    <section className="route-map">
      <div className="rm-head">
        <span className="label">Ruta del viaje</span>
        <small>{stops.length} paradas · recorrido completo</small>
      </div>
      <div className="rm-track">
        <div className="rm-line"/>
        {stops.map((s, i) => (
          <div key={i} className="rm-stop">
            <div className="rm-dot">{i+1}</div>
            <b>{s.name}</b>
            <small>{s.nights} noche{s.nights!==1?"s":""}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- Trust badges row ----
function TrustBadges() {
  const items = [
    { ic: <Ic.shield s={18}/>, title: "RNT vigente", sub: "Registro Nacional de Turismo · MinCIT" },
    { ic: <Ic.award s={18}/>, title: "4.9/5 · 3,200 reseñas", sub: "Google, Tripadvisor, Trustpilot" },
    { ic: <Ic.check s={18}/>, title: "Protocolos de seguridad", sub: "Verificados en cada destino" },
    { ic: <Ic.users s={18}/>, title: "Guías certificados", sub: "Todos con seguro y bilingües" },
  ];
  return (
    <div className="trust-row">
      {items.map((t, i) => (
        <div key={i} className="trust-item">
          <div className="ic">{t.ic}</div>
          <div>
            <b>{t.title}</b>
            <small>{t.sub}</small>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Typed day event ----
const EVENT_ICONS = {
  transporte: <Ic.compass s={14}/>,
  actividad: <Ic.sparkle s={14}/>,
  comida: <Ic.leaf s={14}/>,
  alojamiento: <Ic.award s={14}/>,
  libre: <Ic.clock s={14}/>,
};
const EVENT_LABELS = {
  transporte: "Transporte",
  actividad: "Actividad",
  comida: "Comida",
  alojamiento: "Alojamiento",
  libre: "Tiempo libre",
};

function DayEvent({ e }) {
  return (
    <div className={`evt evt-${e.t}`}>
      <div className="evt-time">{e.time || "—"}</div>
      <div className="evt-dot"><span>{EVENT_ICONS[e.t]}</span></div>
      <div className="evt-body">
        <small>{EVENT_LABELS[e.t]}</small>
        <b>{e.title}</b>
        {e.note && <p>{e.note}</p>}
      </div>
    </div>
  );
}

// ---- Hotel card (single night) ----
function HotelCard({ h, scene }) {
  return (
    <div className="hotel-card">
      <div className="h-media"><Scenic scene={scene}/></div>
      <div className="h-body">
        <div className="h-head">
          <div>
            <small>{h.city} · {h.category}</small>
            <b>{h.name}</b>
          </div>
          <div className="h-rating"><Ic.star s={12}/> {h.rating}</div>
        </div>
        <div className="h-amen">
          {h.amenities.map(a => <span key={a} className="chip chip-ink">{a}</span>)}
        </div>
        <small className="h-nights">{h.nights} noche{h.nights!==1?"s":""}</small>
      </div>
    </div>
  );
}

// ============================================================
// Synthetic structured data per package
// ============================================================

function buildItinerary(pkg) {
  // Expand existing itinerary into typed events with hotels/flights
  const dest = pkg.dest;
  const base = {
    stops: [
      { name: dest.name, nights: Math.ceil(pkg.nights/2) },
      { name: pkg.subtitle.split("·")[1]?.trim() || "Segundo destino", nights: Math.floor(pkg.nights/2) },
    ],
    hotels: [
      { name: `Casa ${dest.name}`, city: dest.name, category: "Hotel boutique 4★", rating: "4.8", amenities: ["Desayuno","Wi-Fi","Piscina","Rooftop"], nights: Math.ceil(pkg.nights/2) },
      { name: "Finca Los Tucanes", city: pkg.subtitle.split("·")[1]?.trim() || "—", category: "Eco-lodge 4★", rating: "4.9", amenities: ["Desayuno","Wi-Fi","Jardín","Spa"], nights: Math.floor(pkg.nights/2) },
    ],
    days: pkg.itinerary.map((d, idx) => {
      const evts = [
        { t: idx===0 ? "transporte" : "actividad", time: idx===0 ? "11:00" : "08:30",
          title: idx===0 ? `Vuelo de llegada · traslado al hotel` : d.t,
          note: idx===0 ? "Recogida privada en el aeropuerto. Check-in y bienvenida con frutas y agua de panela." : d.b },
      ];
      if (idx !== 0 && idx !== pkg.itinerary.length-1) {
        evts.push({ t: "comida", time: "13:30", title: "Almuerzo regional", note: "Cocina local con productos de temporada." });
      }
      if (idx === 0 || idx === Math.floor(pkg.itinerary.length/2)) {
        evts.push({ t: "actividad", time: "16:30", title: "Caminata por el centro", note: "Recorrido a pie para reconocer el barrio con tu guía." });
      }
      if (idx !== pkg.itinerary.length-1) {
        evts.push({ t: "alojamiento", time: "20:00", title: `Noche en ${idx < pkg.itinerary.length/2 ? "Casa "+dest.name : "Finca Los Tucanes"}`, note: "Habitación doble con desayuno incluido." });
      } else {
        evts.push({ t: "transporte", time: "14:00", title: "Traslado al aeropuerto", note: "Según hora de vuelo, con 3h de anticipación." });
      }
      return { num: idx+1, label: d.d, title: d.t, evts };
    }),
    flights: pkg.days >= 5 ? [
      { from: "Internacional", to: dest.name, date: "Día 1", airline: "Avianca", dur: "—" },
      { from: dest.name, to: pkg.subtitle.split("·")[1]?.trim() || "—", date: `Día ${Math.ceil(pkg.days/2)}`, airline: "Avianca", dur: "1h 15m" },
    ] : [],
  };
  return base;
}

// ============================================================
// Package Detail v2
// ============================================================

function PackageDetailV2({ pkg, onNav }) {
  const [openDay, setOpenDay] = useState(0);
  const [openFaq, setOpenFaq] = useState(-1);
  const [tier, setTier] = useState("standard");
  const [pax, setPax] = useState(2);
  const [month, setMonth] = useState("Octubre 2026");
  const [saved, setSaved] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const structured = useMemo(() => buildItinerary(pkg), [pkg.id]);

  const tiers = [
    { k: "essential", name: "Esencial", pr: Math.round(pkg.price*0.85), feats: ["Hoteles 3★ bien ubicados", "Traslados compartidos", "Tours grupales"] },
    { k: "standard",  name: "Clásico",  pr: pkg.price, feats: ["Hoteles 4★ boutique", "Traslados privados", "Tours privados con guía"], featured: true },
    { k: "premium",   name: "Premium",  pr: Math.round(pkg.price*1.45), feats: ["Hoteles 5★ destacados", "Chofer privado todo el viaje", "Cenas en restaurantes curados"] },
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
    { q: "¿Cómo es el proceso de reserva?", a: "Reservas con 30% de anticipo, el saldo 30 días antes. Firmamos contrato digital y recibes documento de viaje consolidado 2 semanas antes." },
  ];

  const planner = PLANNERS[0];

  return (
    <div data-screen-label="PackageDetail">
      {/* HERO */}
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
          <div style={{display:"flex",gap:20,alignItems:"center",color:"rgba(255,255,255,.92)",flexWrap:"wrap"}}>
            <Rating value={pkg.rating} count={pkg.reviews} size={16}/>
            <span style={{opacity:.8}}>·</span>
            <span style={{fontSize:14}}>{pkg.subtitle}</span>
          </div>
        </div>
        <button className="gallery-toggle" onClick={()=>setLightbox(0)}><Ic.search s={14}/> Ver 24 fotos</button>
      </div>

      <div className="container">
        {/* OVERVIEW BAR */}
        <div className="overview-bar">
          <div className="ov-item"><small>Duración</small><strong>{pkg.days}d / {pkg.nights}n</strong></div>
          <div className="ov-item"><small>Destinos</small><strong>{structured.stops.length} ciudades</strong></div>
          <div className="ov-item"><small>Grupo</small><strong>{pkg.group}</strong></div>
          <div className="ov-item"><small>Dificultad</small><strong>Moderada</strong></div>
          <div className="ov-item"><small>Mejor época</small><strong>Dic – Abr</strong></div>
          <div className="ov-item"><small>Idiomas</small><strong>ES · EN · FR</strong></div>
        </div>

        {/* GALLERY STRIP */}
        <GalleryStrip scene={pkg.dest.scene} count={6} onOpen={setLightbox}/>

        {/* GEOGRAPHIC ROUTE MAP */}
        <ItineraryMap stops={structured.stops} pkgTitle={pkg.title}/>

        {/* LINEAR ROUTE (complementary) */}
        <RouteMap stops={structured.stops}/>

        <div className="detail-body">
          <div className="detail-main">
            {/* INTRO */}
            <section>
              <h2>Un viaje que <em>sabe a Colombia.</em></h2>
              <p className="body-lg">
                Este paquete recorre {pkg.subtitle.toLowerCase()} en {pkg.days} días hechos a la medida del viajero que quiere ver, comer, caminar y quedarse un rato más. Nada de listas infinitas: paramos donde hay que parar, caminamos cuando hay que caminar, y dejamos espacio para lo que nadie planea pero todo mundo recuerda.
              </p>
            </section>

            {/* HIGHLIGHTS */}
            <section>
              <div className="highlights-grid">
                {[
                  { i: <Ic.sparkle s={18}/>, t: "Ruta a ritmo humano", d: "Ni carrera ni relleno." },
                  { i: <Ic.users s={18}/>,   t: "Guías que viven allá", d: "Conocen personas, no solo lugares." },
                  { i: <Ic.leaf s={18}/>,    t: "Hoteles con historia", d: "Fincas y boutiques, no cadenas." },
                  { i: <Ic.shield s={18}/>,  t: "Asistencia 24/7", d: "Planner respondiendo en menos de 2h." },
                  { i: <Ic.compass s={18}/>, t: "Logística resuelta", d: "Todo coordinado, un contacto." },
                  { i: <Ic.award s={18}/>,   t: "12 años, 3,200 reseñas", d: "RNT vigente, seguros verificados." },
                ].map((h, i) => (
                  <div className="hl-card" key={i}>
                    <div className="ic">{h.i}</div>
                    <b>{h.t}</b>
                    <p>{h.d}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ITINERARY with typed events */}
            <section>
              <h2>Itinerario <em>día a día</em></h2>
              <p className="body-md" style={{marginTop:-8,marginBottom:28}}>
                Cada día con horario, transporte, comidas y alojamiento. Todo ajustable por tu planner.
              </p>
              <div className="day-list day-list-v2">
                {structured.days.map((d, i) => (
                  <div className={`day-card ${openDay===i?"open":""}`} key={i}>
                    <button className="day-head" onClick={()=>setOpenDay(openDay===i?-1:i)}>
                      <div className="num">{String(d.num).padStart(2,"0")}</div>
                      <div>
                        <small>{d.label}</small>
                        <h3>{d.title}</h3>
                      </div>
                      <div className="day-summary">
                        {d.evts.slice(0,3).map((e, j) => (
                          <span key={j} className={`evt-pill evt-pill-${e.t}`}>{EVENT_ICONS[e.t]}</span>
                        ))}
                      </div>
                      <div className="chev"><Ic.arrow s={14}/></div>
                    </button>
                    <div className="day-body">
                      <div className="day-inner-v2">
                        <div className="day-timeline">
                          {d.evts.map((e, j) => <DayEvent key={j} e={e}/>)}
                        </div>
                        <div className="day-media"><Scenic scene={pkg.dest.scene}/></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* HOTELS */}
            <section>
              <h2>Alojamientos <em>seleccionados</em></h2>
              <p className="body-md" style={{marginTop:-8,marginBottom:24}}>Hoteles boutique y fincas curadas por tu planner. Se pueden subir o bajar de categoría sin cambiar el resto del viaje.</p>
              <div className="hotels-grid">
                {structured.hotels.map((h, i) => (
                  <HotelCard key={i} h={h} scene={pkg.dest.scene}/>
                ))}
              </div>
            </section>

            {/* FLIGHTS */}
            {structured.flights.length > 0 && (
              <section>
                <h2>Vuelos <em>domésticos</em></h2>
                <p className="body-md" style={{marginTop:-8,marginBottom:20}}>Incluidos en el paquete. Horarios confirmados al cotizar.</p>
                <div className="flights-list">
                  {structured.flights.map((f, i) => (
                    <div key={i} className="flight-row">
                      <div className="f-ic"><Ic.compass s={16}/></div>
                      <div className="f-route">
                        <b>{f.from}</b>
                        <span className="f-arrow">→</span>
                        <b>{f.to}</b>
                      </div>
                      <div className="f-meta">
                        <small>{f.date}</small>
                        <span>{f.airline}{f.dur!=="—" ? ` · ${f.dur}` : ""}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* INCLUDE / EXCLUDE */}
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

            {/* PRICING TIERS */}
            <section>
              <h2>Opciones <em>de precio</em></h2>
              <p className="body-md" style={{marginBottom:24,marginTop:-8}}>
                Elige la línea que mejor te acomode — tu planner puede mezclar hoteles entre categorías.
              </p>
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

            {/* TRUST */}
            <section>
              <h2>Viaja <em>con respaldo</em></h2>
              <TrustBadges/>
            </section>

            {/* FAQ */}
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

            {/* PLANNER */}
            <section>
              <h2>Tu planner <em>asignado</em></h2>
              <div className="planner-detail">
                <div className="av" style={{background: planner.av}}/>
                <div>
                  <b>{planner.name}</b>
                  <small>{planner.role} · {planner.years} años · {planner.langs.join(" · ")}</small>
                  <p>"{pkg.dest.name} es mi territorio. Conozco el chef que hace el mejor plato, al guía que sabe la historia real, y los rincones donde la gente local todavía va."</p>
                </div>
                <div className="planner-actions">
                  <button className="btn btn-primary btn-sm"><Ic.whatsapp s={14}/> WhatsApp</button>
                  <button className="btn btn-outline btn-sm">Ver perfil</button>
                </div>
              </div>
            </section>

            {/* SIMILAR */}
            <section style={{borderTop:"none",paddingTop:20}}>
              <h2>Paquetes <em>similares</em></h2>
              <div className="pack-grid">
                {PACKAGES.filter(p => p.id !== pkg.id).slice(0,3).map(p => (
                  <article key={p.id} className="pack-card" onClick={()=>onNav("detail",{pkg:p})}>
                    <div className="pack-media"><Scenic scene={p.dest.scene}/>
                      <div className="badges">{p.badges.map(b => <span key={b} className="chip chip-white">{b}</span>)}</div>
                    </div>
                    <div className="pack-body">
                      <div className="pack-loc">{p.loc}</div>
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

          {/* STICKY RAIL */}
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
              <button onClick={()=>setSaved(s=>!s)} style={saved?{color:"var(--c-accent)"}:null}>
                <Ic.heart s={14} fill={saved?"currentColor":"none"}/> {saved?"Guardado":"Guardar"}
              </button>
              <button><Ic.arrowUpRight s={14}/> Compartir</button>
            </div>
            <div className="rail-trust">
              <div><Ic.check s={12}/> Cancelación flexible 45d antes</div>
              <div><Ic.check s={12}/> Sin cargo por reservar</div>
              <div><Ic.check s={12}/> Contrato digital</div>
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

      {/* Lightbox */}
      {lightbox !== null && (
        <div className="lightbox" onClick={()=>setLightbox(null)}>
          <button className="lb-close" onClick={()=>setLightbox(null)}><Ic.close s={22}/></button>
          <div className="lb-stage" onClick={e=>e.stopPropagation()}>
            <Scenic scene={pkg.dest.scene}/>
            <div className="lb-meta">
              <small>Foto {lightbox+1} de 24</small>
              <b>{pkg.dest.name} · {pkg.title}</b>
            </div>
          </div>
          <div className="lb-nav">
            <button onClick={()=>setLightbox(l => Math.max(0, l-1))} disabled={lightbox===0}>‹</button>
            <button onClick={()=>setLightbox(l => Math.min(23, l+1))} disabled={lightbox===23}>›</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Activity Detail (full page, not modal)
// ============================================================

function buildActivityTimeline(a) {
  if (a.bucket === "multi-day") {
    return [
      { day: "Día 1", items: [
        { time: "10:00", t: "actividad", title: "Llegada + yoga matinal", note: "Recepción en el eco-lodge y sesión de apertura." },
        { time: "13:00", t: "comida", title: "Almuerzo orgánico", note: "Ingredientes de la huerta del lodge." },
        { time: "16:00", t: "actividad", title: "Caminata a río sagrado", note: "Con guía kogui que explica el territorio." },
        { time: "19:00", t: "comida", title: "Cena + círculo de palabra", note: "Conversación con mamo invitado." },
      ]},
      { day: "Día 2", items: [
        { time: "06:30", t: "actividad", title: "Meditación al amanecer", note: "Vista al mar y a la sierra." },
        { time: "09:00", t: "comida", title: "Desayuno y cierre", note: "" },
        { time: "11:00", t: "transporte", title: "Regreso", note: "Traslado a Santa Marta o Minca." },
      ]},
    ];
  }
  if (a.durMin <= 180) {
    return [{ day: "Recorrido", items: [
      { time: a.time, t: "actividad", title: "Inicio + encuadre", note: "Encuentro en el meeting point con tu guía." },
      { time: "+30min", t: "actividad", title: "Primer tramo", note: a.highlights?.[0] || "" },
      { time: "+90min", t: "actividad", title: "Punto principal", note: a.highlights?.[1] || "" },
      { time: "Cierre", t: "actividad", title: "Despedida", note: "Fin del recorrido en punto cercano al inicio." },
    ]}];
  }
  return [{ day: a.dur, items: [
    { time: a.time, t: "transporte", title: "Recogida / meeting point", note: "Encuentro con el guía en el punto acordado." },
    { time: "+1h", t: "actividad", title: "Primer segmento", note: a.highlights?.[0] || "" },
    { time: "Mediodía", t: "comida", title: "Almuerzo", note: "Incluido — cocina regional." },
    { time: "Tarde", t: "actividad", title: "Segmento principal", note: a.highlights?.[1] || "" },
    { time: "Cierre", t: "transporte", title: "Regreso", note: "Devolución al punto de encuentro." },
  ]}];
}

function ActivityDetail({ act, onNav }) {
  const [paxA, setPaxA] = useState(2);
  const [dateA, setDateA] = useState("Próxima disponibilidad");
  const [optA, setOptA] = useState("standard");
  const [saved, setSaved] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [openFaq, setOpenFaq] = useState(-1);

  const tl = useMemo(() => buildActivityTimeline(act), [act.id]);

  const options = [
    { k: "economy", name: "Compartida", pr: Math.round(act.price*0.8), feats: ["Grupo de hasta 10", "Transporte compartido", "Guía general"] },
    { k: "standard", name: "Regular", pr: act.price, feats: ["Grupo de hasta 6", "Traslado desde hotel", "Guía especializado"], featured: true },
    { k: "private", name: "Privada", pr: Math.round(act.price*1.8), feats: ["Solo tu grupo", "Horario personalizable", "Guía senior"] },
  ];

  const recs = [
    { t: "Ropa", d: "Cómoda y por capas. Zapatos cerrados con agarre." },
    { t: "Llevar", d: "Agua, cámara, protector solar y repelente." },
    { t: "No llevar", d: "Valores innecesarios ni zapatos nuevos." },
    { t: "Nivel", d: LEVEL_LABELS[act.level] + " · apto si puedes caminar a paso medio." },
  ];

  const faqs = [
    { q: "¿Se puede cancelar?", a: "Sí. Cancelación gratuita hasta 48h antes. Después de ese plazo, se retiene 50%." },
    { q: "¿Qué pasa si llueve?", a: "La experiencia se realiza con lluvia ligera. Si la lluvia es fuerte, se reprograma sin costo." },
    { q: "¿Incluye recogida en hotel?", a: "Sí, si tu hotel está dentro del radio urbano del meeting point. De lo contrario, acuerdan punto cercano." },
    { q: "¿Los niños pueden participar?", a: act.level === "exigente" ? "No recomendado para menores de 14 años por nivel físico." : "Sí, desde los 7 años con acompañante." },
  ];

  const similar = ACTIVITIES.filter(x => x.id !== act.id && (x.region === act.region || x.cat === act.cat)).slice(0, 3);

  return (
    <div data-screen-label="ActivityDetail">
      {/* HERO */}
      <div className="detail-hero">
        <Scenic scene={act.dest.scene}/>
        <div className="wash"/>
        <div className="container meta">
          <Crumbs
            trail={[
              {label:"Inicio",page:"home"},
              {label:"Experiencias",page:"experiences"},
              {label:act.title}
            ]}
            onNav={onNav}
          />
          <div className="chips">
            <span className="chip chip-white" style={{textTransform:"uppercase",letterSpacing:".1em",fontSize:10}}>{act.cat}</span>
            <span className={`chip level-${LEVEL_COLORS[act.level]}`}>{LEVEL_LABELS[act.level]}</span>
            {act.badges.map(b => <span key={b} className={`chip ${b==="Más vendido"||b==="Imprescindible"?"chip-accent":"chip-white"}`}>{b}</span>)}
          </div>
          <h1 className="display-lg">{act.title} <em>— {act.subtitle}.</em></h1>
          <div style={{display:"flex",gap:20,alignItems:"center",color:"rgba(255,255,255,.92)",flexWrap:"wrap"}}>
            <Rating value={act.rating} count={act.reviews} size={16}/>
            <span style={{opacity:.8}}>·</span>
            <span style={{fontSize:14,display:"inline-flex",alignItems:"center",gap:5}}><Ic.pin s={13}/> {act.loc} · {act.region}</span>
          </div>
        </div>
        <button className="gallery-toggle" onClick={()=>setLightbox(0)}><Ic.search s={14}/> Ver 12 fotos</button>
      </div>

      <div className="container">
        {/* OVERVIEW */}
        <div className="overview-bar">
          <div className="ov-item"><small>Duración</small><strong>{act.dur}</strong></div>
          <div className="ov-item"><small>Salida</small><strong>{act.time}</strong></div>
          <div className="ov-item"><small>Nivel</small><strong>{LEVEL_LABELS[act.level]}</strong></div>
          <div className="ov-item"><small>Idiomas</small><strong>ES · EN</strong></div>
          <div className="ov-item"><small>Grupo</small><strong>Hasta 10</strong></div>
          <div className="ov-item"><small>Reseñas</small><strong>{act.rating} ★ · {act.reviews}</strong></div>
        </div>

        {/* GALLERY */}
        <GalleryStrip scene={act.dest.scene} count={6} onOpen={setLightbox}/>

        <div className="detail-body">
          <div className="detail-main">
            {/* INTRO */}
            <section>
              <h2>Qué esperar <em>de esta experiencia.</em></h2>
              <p className="body-lg">{act.desc}</p>

              <div className="highlights-grid" style={{marginTop:28}}>
                {act.highlights.map((h, i) => (
                  <div className="hl-card" key={i}>
                    <div className="ic"><Ic.sparkle s={18}/></div>
                    <b>{h}</b>
                  </div>
                ))}
              </div>
            </section>

            {/* TIMELINE */}
            <section>
              <h2>Programa <em>paso a paso</em></h2>
              <p className="body-md" style={{marginTop:-8,marginBottom:24}}>Tiempos aproximados — ajustables por clima y ritmo del grupo.</p>
              {tl.map((block, bi) => (
                <div key={bi} className="act-timeline-block">
                  {tl.length > 1 && <div className="atb-label"><b>{block.day}</b></div>}
                  <div className="act-timeline">
                    {block.items.map((e, i) => <DayEvent key={i} e={e}/>)}
                  </div>
                </div>
              ))}
            </section>

            {/* MEETING POINT MAP */}
            <section>
              <h2>Punto de <em>encuentro</em></h2>
              <div className="meeting-map">
                <div className="mm-map">
                  <Scenic scene={act.dest.scene}/>
                  <div className="mm-pin">
                    <div className="mm-pulse"/>
                    <div className="mm-dot"><Ic.pin s={16}/></div>
                  </div>
                  <div className="mm-chip">Meeting point</div>
                </div>
                <div className="mm-info">
                  <small className="label">Dirección</small>
                  <b>{act.loc}</b>
                  <p>Encuentro con tu guía en el punto acordado. Te enviamos la ubicación exacta con indicaciones al confirmar la reserva.</p>
                  <div className="mm-details">
                    <div><Ic.clock s={14}/> Llegada: 10 min antes de las {act.time}</div>
                    <div><Ic.compass s={14}/> Cómo llegar: taxi, Uber o caminando</div>
                    <div><Ic.users s={14}/> Tu guía lleva camiseta de ColombiaTours</div>
                  </div>
                </div>
              </div>
            </section>

            {/* OPTIONS TABLE */}
            <section>
              <h2>Opciones <em>disponibles</em></h2>
              <div className="price-table">
                {options.map(o => (
                  <div key={o.k} className={`price-col ${o.featured?"featured":""} ${optA===o.k?"selected":""}`} onClick={()=>setOptA(o.k)}>
                    <h4>{o.name}</h4>
                    <div>
                      <div className="pr"><sup>USD</sup>{o.pr.toLocaleString()}</div>
                      <div className="per">por persona</div>
                    </div>
                    <ul>{o.feats.map(f => <li key={f}>{f}</li>)}</ul>
                    <button className={`btn ${optA===o.k?"btn-accent":"btn-outline"}`} style={{marginTop:"auto",justifyContent:"center"}}>
                      {optA===o.k?"Seleccionada":"Elegir"}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* INCLUDE */}
            <section>
              <h2>Qué <em>incluye</em></h2>
              <div className="incl-grid">
                <div className="incl-col yes">
                  <b>Incluido</b>
                  <ul>
                    {act.includes.map(x => <li key={x}><span className="mark"><Ic.check s={16}/></span>{x}</li>)}
                  </ul>
                </div>
                <div className="incl-col no">
                  <b>No incluido</b>
                  <ul>
                    {["Traslado desde/al hotel (opcional)","Propinas al guía","Bebidas extra","Gastos personales"].map(x => (
                      <li key={x}><span className="mark"><Ic.close s={14}/></span>{x}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* RECOMMENDATIONS */}
            <section>
              <h2>Recomendaciones <em>para el día</em></h2>
              <div className="recs-grid">
                {recs.map((r, i) => (
                  <div key={i} className="rec-card">
                    <small className="label">{r.t}</small>
                    <p>{r.d}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* TRUST */}
            <section>
              <h2>Con <em>respaldo</em></h2>
              <TrustBadges/>
            </section>

            {/* FAQ */}
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

            {/* SIMILAR */}
            {similar.length > 0 && (
              <section style={{borderTop:"none",paddingTop:20}}>
                <h2>Experiencias <em>similares</em></h2>
                <div className="exp-grid">
                  {similar.map(x => (
                    <ExpCard key={x.id} a={x} saved={false}
                      onToggleSave={()=>{}}
                      onOpen={(a)=>onNav("activity",{act:a})}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* STICKY RAIL */}
          <aside className="detail-rail">
            <div>
              <div style={{fontSize:11,letterSpacing:".14em",textTransform:"uppercase",color:"var(--c-muted)",fontWeight:600,marginBottom:4}}>Desde · por persona</div>
              <div className="rail-price">
                {act.price === 0 ? (
                  <span className="big" style={{color:"var(--c-accent-3)"}}>Gratis</span>
                ) : (
                  <span className="big"><sup>USD</sup>{act.price.toLocaleString()}</span>
                )}
              </div>
              <div style={{fontSize:12,color:"var(--c-muted)",marginTop:4}}>Opción {options.find(o=>o.k===optA).name.toLowerCase()}</div>
            </div>
            <div className="rail-form">
              <div className="fld"><label>Fecha</label><select value={dateA} onChange={e=>setDateA(e.target.value)}>
                <option>Próxima disponibilidad</option>
                <option>Mañana</option>
                <option>Este fin de semana</option>
                <option>Próxima semana</option>
                <option>Elegir fecha…</option>
              </select></div>
              <div className="fld"><label>Personas</label><select value={paxA} onChange={e=>setPaxA(+e.target.value)}>
                {[1,2,3,4,5,6,8,10].map(n=><option key={n} value={n}>{n} {n===1?"persona":"personas"}</option>)}
              </select></div>
              <div className="fld"><label>Opción</label><select value={optA} onChange={e=>setOptA(e.target.value)}>
                {options.map(o => <option key={o.k} value={o.k}>{o.name} — ${o.pr}</option>)}
              </select></div>
            </div>
            <button className="btn btn-accent" style={{justifyContent:"center"}}>Reservar experiencia <Ic.arrow s={14}/></button>
            <button className="btn btn-outline" style={{justifyContent:"center"}} onClick={()=>onNav("contact")}>
              Sumar a un paquete
            </button>
            <div className="rail-share">
              <button onClick={()=>setSaved(s=>!s)} style={saved?{color:"var(--c-accent)"}:null}>
                <Ic.heart s={14} fill={saved?"currentColor":"none"}/> {saved?"Guardado":"Guardar"}
              </button>
              <button><Ic.arrowUpRight s={14}/> Compartir</button>
            </div>
            <div className="rail-trust">
              <div><Ic.check s={12}/> Cancelación hasta 48h antes</div>
              <div><Ic.check s={12}/> Guía bilingüe certificado</div>
              <div><Ic.check s={12}/> Grupos pequeños</div>
            </div>
          </aside>
        </div>
      </div>

      <div className="mobile-bar">
        <div>
          <div style={{fontSize:11,color:"var(--c-muted)"}}>Desde</div>
          <b>{act.price===0?"Gratis":`$${act.price} USD`}</b>
        </div>
        <button className="btn btn-accent btn-sm">Reservar <Ic.arrow s={14}/></button>
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div className="lightbox" onClick={()=>setLightbox(null)}>
          <button className="lb-close" onClick={()=>setLightbox(null)}><Ic.close s={22}/></button>
          <div className="lb-stage" onClick={e=>e.stopPropagation()}>
            <Scenic scene={act.dest.scene}/>
            <div className="lb-meta">
              <small>Foto {lightbox+1} de 12</small>
              <b>{act.title}</b>
            </div>
          </div>
          <div className="lb-nav">
            <button onClick={()=>setLightbox(l => Math.max(0, l-1))} disabled={lightbox===0}>‹</button>
            <button onClick={()=>setLightbox(l => Math.min(11, l+1))} disabled={lightbox===11}>›</button>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { PackageDetailV2, ActivityDetail, GalleryStrip, RouteMap, TrustBadges });
