// Blog: listing + detail pages
// Wired via router: page="blog" (listing), page="post" (detail)

const BLOG_POSTS = [
  {
    id: "cartagena-secretos",
    cat: "Guías",
    title: "Cartagena más allá de la ciudad amurallada",
    emphasis: "— siete rincones que no salen en las guías.",
    excerpt: "Un recorrido lento por Getsemaní, San Diego y esquinas que solo conocen quienes viven ahí.",
    author: "Mariana Vélez",
    authorRole: "Planner · Caribe",
    date: "2026-03-28",
    read: 7,
    scene: DESTINATIONS[0].scene,
    tags: ["Caribe", "Guía", "Cartagena"],
    featured: true,
    body: [
      { t: "h2", c: "Una ciudad <em>que se cuenta caminando.</em>" },
      { t: "p", c: "Cartagena es la postal de Colombia, pero la Cartagena que enamora no está en la plaza principal. Está dos calles al fondo, cuando el bullicio de los cruceros se diluye y el pregón del limonero vuelve a oírse. Esta es una guía para quedarse unos días más." },
      { t: "p", c: "Cuando llevo a viajeros por primera vez, empezamos siempre por el mismo lugar — no es una iglesia ni un museo, es una panadería en Getsemaní donde la señora Dulce hace pan de bono desde hace cuarenta años. Esa taza de chocolate a las 6:30am es el mejor prólogo posible a la ciudad." },
      { t: "h3", c: "01 · Getsemaní al amanecer" },
      { t: "p", c: "Antes de las ocho, Getsemaní pertenece a sus vecinos. Las puertas azules y amarillas se abren, los niños van al colegio, los gatos vuelven de sus expediciones nocturnas. Es el mejor momento para fotografiar las calles sin gente, y para entender por qué este barrio popular resiste la gentrificación." },
      { t: "quote", c: "Lo que más extrañan los viajeros al volver no es la playa. Es el ritmo. La forma en que la ciudad los enseñó a ir más despacio." },
      { t: "h3", c: "02 · La Boquilla, pescadores al amanecer" },
      { t: "p", c: "A 15 minutos del centro, la Boquilla es un pueblo de pescadores afrocolombianos. Los botes salen a las cinco y vuelven con el sol alto. Si llegas a las nueve, puedes ver la subasta y almorzar lo que acaba de salir del mar." },
      { t: "h3", c: "03 · San Basilio de Palenque" },
      { t: "p", c: "Una hora tierra adentro, el primer pueblo libre de América. Patrimonio UNESCO. Aquí se conserva el palenquero, lengua criolla única en el mundo, y una tradición musical que cambió la música popular colombiana." },
      { t: "h2", c: "Dónde quedarse <em>para ver esta Cartagena.</em>" },
      { t: "p", c: "Getsemaní tiene dos hoteles boutique excelentes: Casa Lola y Townhouse Boutique. Ambos con rooftop, ambos a precios razonables. Evita las cadenas grandes del centro histórico — te aíslan de lo que hace interesante a la ciudad." },
      { t: "h3", c: "Consejos prácticos" },
      { t: "ul", c: ["Reserva tour a Palenque con guía local, no con agencia grande. Mínimo dos horas de conversación.", "Llévate efectivo: la Boquilla y los pueblos cercanos no tienen red confiable de tarjetas.", "Noviembre a marzo es temporada seca — mejor época para caminar sin sudar.", "El mar de las islas del Rosario es mejor los días entre semana."] },
      { t: "p", c: "Cartagena da para una semana sin repetir esquina. Lo importante es quedarse lo suficiente para que la ciudad deje de ser postal y empiece a ser casa." },
    ],
  },
  {
    id: "cocora-caminata",
    cat: "Aventura",
    title: "Caminar el Valle de Cocora sin turistas",
    emphasis: "— salir a las 6am cambia todo.",
    excerpt: "La palma de cera y el silencio. Por qué el horario que recomiendan los hoteles es precisamente el que hay que evitar.",
    author: "Andrés Restrepo",
    authorRole: "Planner · Andes",
    date: "2026-03-14",
    read: 6,
    scene: DESTINATIONS[2].scene,
    tags: ["Eje Cafetero", "Trekking", "Cocora"],
    body: [
      { t: "h2", c: "La hora <em>que nadie te dice.</em>" },
      { t: "p", c: "Cocora es uno de esos lugares donde el timing lo es todo. A las 10am hay 200 personas haciendo la misma foto. A las 6:30am, estás solo con las palmas de cera más altas del mundo y el sonido del viento." },
      { t: "p", c: "El truco es dormir en Salento la noche anterior y salir antes que los buses turísticos desde Armenia. A las 5:45 estás en el pueblo, a las 6:15 comenzando el sendero, a las 8 ya habrás vivido lo mejor del valle." },
      { t: "h3", c: "La ruta corta vs la ruta larga" },
      { t: "p", c: "Hay dos circuitos: el corto (2h, solo palmas) y el largo (5h, selva nubosa + santuario de colibríes + palmas). Si puedes, haz el largo — sale caro en piernas pero paga en biodiversidad." },
      { t: "quote", c: "El silencio del bosque de niebla a las 7am es la razón por la que camino. Todo lo demás viene después." },
      { t: "h3", c: "Qué llevar" },
      { t: "ul", c: ["Botas con agarre: hay dos cruces de río con troncos resbalosos.", "Chaqueta impermeable — incluso en seco, cae lluvia fina.", "Agua y snacks para 5 horas.", "Poncho o algo para cubrir la cámara."] },
      { t: "p", c: "Al volver, para en la Casa de la Trucha. No es la más turística, pero sí la que mejor cocina lo que saca el día." },
    ],
  },
  {
    id: "amazonas-primer-viaje",
    cat: "Naturaleza",
    title: "Tu primer viaje al Amazonas colombiano",
    emphasis: "— todo lo que hubiera querido saber antes.",
    excerpt: "Qué esperar de Leticia, cómo elegir lodge en la selva, y por qué los delfines rosados son solo el comienzo.",
    author: "Luisa Carrizosa",
    authorRole: "Planner · Amazonas",
    date: "2026-02-25",
    read: 10,
    scene: DESTINATIONS[7].scene,
    tags: ["Amazonas", "Selva", "Primera vez"],
    body: [
      { t: "h2", c: "El Amazonas <em>no es lo que esperas.</em>" },
      { t: "p", c: "Todos llegan pensando en Tarzán. La realidad es más lenta, más sonora, más tejida. La selva no es una escenografía — es un sistema que respira, y tú solo pasas tres días adentro." },
      { t: "h3", c: "Leticia como punto de partida" },
      { t: "p", c: "Leticia es pequeña — se camina en una hora. Al atardecer, ve al parque Santander: miles de pericos aterrizan en los árboles al mismo tiempo, el cielo se vuelve verde." },
      { t: "h3", c: "Dentro de la selva" },
      { t: "p", c: "Los lodges van desde muy rústicos hasta eco-boutique. El factor que más importa no es la estrella del lodge sino el guía. Un buen guía indígena convierte una caminata por el monte en una enciclopedia viva." },
      { t: "quote", c: "La selva no te impresiona con lo grande, te impresiona con lo pequeño. Una hormiga bala, una rana diminuta, una semilla que viaja cien metros con el viento." },
    ],
  },
  {
    id: "cafe-de-origen",
    cat: "Cultura",
    title: "El café colombiano que no llega al supermercado",
    emphasis: "— visita a tres fincas de origen.",
    excerpt: "De la semilla a la taza, guiado por las familias que cultivan los granos que después puntúan sobre 88 en el mundo.",
    author: "Andrés Restrepo",
    authorRole: "Planner · Andes",
    date: "2026-02-10",
    read: 8,
    scene: DESTINATIONS[2].scene,
    tags: ["Café", "Eje Cafetero", "Gastronomía"],
    body: [
      { t: "h2", c: "Café <em>como oficio,</em> no como bebida." },
      { t: "p", c: "El Eje Cafetero exporta casi todo su café de especialidad, y compra Nescafé para el desayuno. Este es el chiste cruel de la región. Pero si sabes dónde ir, bebes lo que el resto del mundo paga a precio de oro." },
      { t: "h3", c: "Tres fincas, tres filosofías" },
      { t: "p", c: "Cada finca tiene su obsesión: una con el proceso natural, otra con la altitud, otra con la biodiversidad del suelo. Lo rico es probar las tres el mismo día y entender que no hay un solo café colombiano — hay cientos." },
    ],
  },
  {
    id: "tayrona-pueblito",
    cat: "Aventura",
    title: "Ascenso a Pueblito en el Parque Tayrona",
    emphasis: "— el pueblo Tayrona que sobrevive.",
    excerpt: "Una ruta dura de tres horas desde Cabo San Juan hasta uno de los asentamientos prehispánicos más conservados del Caribe.",
    author: "Juan David Ortiz",
    authorRole: "Planner · Aventura",
    date: "2026-01-22",
    read: 9,
    scene: DESTINATIONS[3].scene,
    tags: ["Tayrona", "Trekking", "Arqueología"],
    body: [
      { t: "h2", c: "Tres horas <em>que parecen mil años.</em>" },
      { t: "p", c: "Pueblito Chairama es lo que queda visible de la civilización Tayrona en la parte baja de la sierra. Llegar exige un ascenso técnico: piedras grandes, raíces, y humedad del 95%." },
      { t: "p", c: "Pero al llegar, se entiende la ingeniería precolombina: terrazas circulares, canales de agua que aún funcionan, caminos de piedra perfectamente pulidos." },
      { t: "quote", c: "Los kogui no consideran este lugar ruinas. Consideran que sigue vivo, que solo está dormido." },
    ],
  },
  {
    id: "san-andres-buceo",
    cat: "Naturaleza",
    title: "Buceo en San Andrés para principiantes",
    emphasis: "— el mar de siete colores, visto desde abajo.",
    excerpt: "Cómo empezar, qué centros son serios, y los cinco sitios imprescindibles aunque sea tu primera inmersión.",
    author: "Mariana Vélez",
    authorRole: "Planner · Caribe",
    date: "2026-01-08",
    read: 6,
    scene: DESTINATIONS[1].scene,
    tags: ["San Andrés", "Buceo", "Mar"],
    body: [
      { t: "h2", c: "Visibilidad <em>de treinta metros,</em> casi todo el año." },
      { t: "p", c: "San Andrés es una de las mejores islas del Caribe para empezar a bucear. Agua tibia, corrientes suaves, arrecifes poco profundos y visibilidad excepcional." },
    ],
  },
];

// -------- Blog listing --------
function BlogList({ onNav, onOpenPost }) {
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const cats = ["all", ...Array.from(new Set(BLOG_POSTS.map(p => p.cat)))];
  const featured = BLOG_POSTS.find(p => p.featured) || BLOG_POSTS[0];
  const filtered = useMemo(() => {
    let arr = BLOG_POSTS.filter(p => p.id !== featured.id);
    if (cat !== "all") arr = arr.filter(p => p.cat === cat);
    if (q.trim()) {
      const m = q.toLowerCase();
      arr = arr.filter(p => p.title.toLowerCase().includes(m) || p.excerpt.toLowerCase().includes(m) || p.tags.some(t=>t.toLowerCase().includes(m)));
    }
    return arr;
  }, [cat, q, featured.id]);

  const fmt = (d) => new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div data-screen-label="Blog">
      <PageHero
        eyebrow="Blog"
        title="Historias" emphasis="desde adentro."
        subtitle="Escrito por los planners que caminan Colombia todos los meses. Guías, itinerarios, oficios y rincones."
        scene={DESTINATIONS[0].scene}
        trail={[{label:"Inicio",page:"home"},{label:"Blog"}]}
        onNav={onNav}
      />
      <section className="section" style={{paddingTop: 56}}>
        <div className="container">
          {/* Featured */}
          <article className="blog-featured" onClick={() => onOpenPost(featured)}>
            <div className="blog-feat-media"><Scenic scene={featured.scene}/></div>
            <div className="blog-feat-body">
              <span className="chip chip-accent">{featured.cat}</span>
              <h2 className="display-md" style={{margin:"14px 0 12px"}}>
                {featured.title} <span className="serif" style={{color:"var(--c-accent)"}}>{featured.emphasis}</span>
              </h2>
              <p className="body-lg" style={{maxWidth:"54ch"}}>{featured.excerpt}</p>
              <div className="blog-meta">
                <span>{featured.author}</span>
                <span>·</span>
                <span>{fmt(featured.date)}</span>
                <span>·</span>
                <span>{featured.read} min de lectura</span>
              </div>
              <button className="btn btn-ink btn-sm" style={{marginTop:20}}>Leer artículo <Ic.arrow s={14}/></button>
            </div>
          </article>

          {/* Toolbar */}
          <div className="blog-toolbar">
            <div className="blog-cats">
              {cats.map(c => (
                <button key={c} className={`filter-tab ${cat===c?"active":""}`} onClick={()=>setCat(c)}>
                  {c === "all" ? "Todo" : c}
                  <span className="count">{c==="all" ? BLOG_POSTS.length : BLOG_POSTS.filter(p=>p.cat===c).length}</span>
                </button>
              ))}
            </div>
            <div className="blog-search">
              <Ic.search s={16}/>
              <input placeholder="Buscar historias…" value={q} onChange={e=>setQ(e.target.value)}/>
            </div>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div style={{padding:"80px 20px",textAlign:"center",background:"var(--c-surface)",borderRadius:20,border:"1px solid var(--c-line)"}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:22,marginBottom:10}}>Nada con esos criterios</div>
              <p className="body-md">Prueba otra categoría o palabra.</p>
            </div>
          ) : (
            <div className="blog-grid">
              {filtered.map(p => (
                <article key={p.id} className="blog-card" onClick={() => onOpenPost(p)}>
                  <div className="blog-card-media"><Scenic scene={p.scene}/>
                    <span className="chip chip-white blog-cat-tag">{p.cat}</span>
                  </div>
                  <div className="blog-card-body">
                    <h3>{p.title}</h3>
                    <p>{p.excerpt}</p>
                    <div className="blog-meta">
                      <span>{p.author}</span>
                      <span>·</span>
                      <span>{fmt(p.date)}</span>
                      <span>·</span>
                      <span>{p.read} min</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div style={{textAlign:"center",marginTop:48}}>
            <button className="btn btn-ghost">Cargar más historias <Ic.arrow s={14}/></button>
          </div>
        </div>
      </section>
    </div>
  );
}

// -------- Blog detail --------
function BlogPost({ post, onNav, onOpenPost }) {
  const fmt = (d) => new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
  const related = BLOG_POSTS.filter(p => p.id !== post.id && p.cat === post.cat).slice(0, 3);
  const fallback = BLOG_POSTS.filter(p => p.id !== post.id).slice(0, 3);
  const rel = related.length ? related : fallback;

  const renderBlock = (b, i) => {
    if (b.t === "h2") return <h2 key={i} dangerouslySetInnerHTML={{__html:b.c}}/>;
    if (b.t === "h3") return <h3 key={i}>{b.c}</h3>;
    if (b.t === "p")  return <p key={i}>{b.c}</p>;
    if (b.t === "quote") return <blockquote key={i}>{b.c}</blockquote>;
    if (b.t === "ul") return <ul key={i}>{b.c.map((x,j)=><li key={j}>{x}</li>)}</ul>;
    return null;
  };

  return (
    <div data-screen-label="BlogPost">
      <div className="post-hero">
        <Scenic scene={post.scene}/>
        <div className="wash"/>
        <div className="container meta">
          <Crumbs
            trail={[
              {label:"Inicio",page:"home"},
              {label:"Blog",page:"blog"},
              {label:post.cat}
            ]}
            onNav={onNav}
          />
          <span className="chip chip-accent" style={{alignSelf:"flex-start"}}>{post.cat}</span>
          <h1 className="display-lg" style={{maxWidth:"22ch"}}>
            {post.title} <em>{post.emphasis}</em>
          </h1>
          <div className="post-author-line">
            <div className="av" style={{background: PLANNERS.find(pl=>pl.name===post.author)?.av || "linear-gradient(135deg,#e85c3c,#f3b13b)"}}/>
            <div>
              <b>{post.author}</b>
              <small>{post.authorRole} · {fmt(post.date)} · {post.read} min de lectura</small>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="post-body">
          <aside className="post-rail">
            <div className="post-share">
              <div style={{fontSize:11,letterSpacing:".14em",textTransform:"uppercase",color:"var(--c-muted)",fontWeight:600,marginBottom:8}}>Compartir</div>
              <div style={{display:"flex",gap:8}}>
                <button className="icon-btn" aria-label="Compartir"><Ic.arrowUpRight s={16}/></button>
                <button className="icon-btn" aria-label="Guardar"><Ic.heart s={16}/></button>
                <button className="icon-btn" aria-label="WhatsApp"><Ic.whatsapp s={16}/></button>
              </div>
            </div>
            <div className="post-tags">
              <div style={{fontSize:11,letterSpacing:".14em",textTransform:"uppercase",color:"var(--c-muted)",fontWeight:600,marginBottom:8}}>Etiquetas</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {post.tags.map(t => <span key={t} className="chip chip-ink">{t}</span>)}
              </div>
            </div>
          </aside>

          <article className="post-main">
            {post.body.map(renderBlock)}

            <div className="post-cta">
              <div>
                <div className="label" style={{color:"rgba(255,255,255,.75)"}}>¿Te gustaría vivirlo?</div>
                <h3>Diseñamos un viaje a tu medida <em>por esta región.</em></h3>
                <p>Cuéntale a {post.author.split(" ")[0]} qué te interesa y recibe una propuesta en 24h.</p>
              </div>
              <div style={{display:"flex",gap:10,flexDirection:"column"}}>
                <button className="btn btn-accent" onClick={()=>onNav("contact")}>Planear mi viaje <Ic.arrow s={14}/></button>
                <button className="btn btn-ghost" style={{color:"#fff"}}><Ic.whatsapp s={14}/> WhatsApp</button>
              </div>
            </div>

            <div className="post-author-card">
              <div className="av" style={{background: PLANNERS.find(pl=>pl.name===post.author)?.av || "linear-gradient(135deg,#e85c3c,#f3b13b)"}}/>
              <div>
                <small className="label">Escrito por</small>
                <b>{post.author}</b>
                <p>{post.authorRole}. Diseña rutas en Colombia para viajeros que quieren ir más hondo que la guía.</p>
                <button className="btn btn-outline btn-sm">Ver perfil <Ic.arrow s={14}/></button>
              </div>
            </div>
          </article>
        </div>

        <section className="post-related">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:28}}>
            <h2 className="display-md">Sigue <span className="serif">leyendo.</span></h2>
            <button className="btn btn-ghost btn-sm" onClick={()=>onNav("blog")}>Ver todo el blog <Ic.arrow s={14}/></button>
          </div>
          <div className="blog-grid">
            {rel.map(p => (
              <article key={p.id} className="blog-card" onClick={() => onOpenPost(p)}>
                <div className="blog-card-media"><Scenic scene={p.scene}/>
                  <span className="chip chip-white blog-cat-tag">{p.cat}</span>
                </div>
                <div className="blog-card-body">
                  <h3>{p.title}</h3>
                  <p>{p.excerpt}</p>
                  <div className="blog-meta">
                    <span>{p.author}</span><span>·</span><span>{p.read} min</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

Object.assign(window, { BLOG_POSTS, BlogList, BlogPost });
