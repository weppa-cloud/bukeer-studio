// ============================================================
// Maps — custom editorial Colombia map (original illustration,
// not a reproduction of any branded map product).
//
// We project approximate geographic coordinates (lat/lng) into
// an SVG viewBox sized to Colombia's bounding box, then render
// a hand-built silhouette path along with pins, labels and routes.
// ============================================================

// --- Approximate geographic coordinates for our destinations & landmarks ---
// (Rough lat/lng for editorial mapping — not survey-grade.)
const GEO = {
  // Destinations
  "cartagena":    { lat: 10.42, lng: -75.55, name: "Cartagena", region: "Caribe" },
  "san-andres":   { lat: 12.58, lng: -81.70, name: "San Andrés", region: "Caribe" },
  "eje-cafetero": { lat:  4.64, lng: -75.62, name: "Eje Cafetero", region: "Andes" },
  "tayrona":      { lat: 11.30, lng: -74.05, name: "Tayrona", region: "Caribe" },
  "medellin":     { lat:  6.24, lng: -75.58, name: "Medellín", region: "Andes" },
  "guatape":      { lat:  6.23, lng: -75.16, name: "Guatapé", region: "Andes" },
  "desierto":     { lat: 12.20, lng: -71.96, name: "La Guajira", region: "Caribe" },
  "amazonas":     { lat: -4.21, lng: -69.94, name: "Amazonas", region: "Selva" },
  // Extra landmarks that appear in package itineraries
  "islas-rosario":{ lat: 10.18, lng: -75.76, name: "Islas del Rosario" },
  "santa-marta":  { lat: 11.24, lng: -74.20, name: "Santa Marta" },
  "minca":        { lat: 11.14, lng: -74.12, name: "Minca" },
  "salento":      { lat:  4.63, lng: -75.57, name: "Salento" },
  "filandia":     { lat:  4.68, lng: -75.66, name: "Filandia" },
  "cocora":       { lat:  4.63, lng: -75.49, name: "Valle de Cocora" },
  "pereira":      { lat:  4.81, lng: -75.69, name: "Pereira" },
  "comuna-13":    { lat:  6.25, lng: -75.61, name: "Comuna 13" },
  "riohacha":     { lat: 11.54, lng: -72.91, name: "Riohacha" },
  "cabo-vela":    { lat: 12.20, lng: -72.17, name: "Cabo de la Vela" },
  "punta-gallinas":{lat: 12.46, lng: -71.66, name: "Punta Gallinas" },
  "leticia":      { lat: -4.21, lng: -69.94, name: "Leticia" },
  "puerto-narino":{ lat: -3.77, lng: -70.38, name: "Puerto Nariño" },
  "tarapoto":     { lat: -3.78, lng: -70.45, name: "Lagos de Tarapoto" },
  "cali":         { lat:  3.42, lng: -76.53, name: "Cali" },
  "san-gil":      { lat:  6.55, lng: -73.13, name: "San Gil" },
  "bogota":       { lat:  4.71, lng: -74.07, name: "Bogotá" },
  "palenque":     { lat: 10.10, lng: -75.20, name: "San Basilio de Palenque" },
};

// Bounding box for projection: latitude [-4.5, 13.0], longitude [-82.0, -66.5]
// Map viewBox is 800 × 1000 (portrait) — Colombia roughly square but we add breathing room for San Andrés & Amazonas
const MAP_BOX = { minLat: -4.8, maxLat: 13.2, minLng: -82.5, maxLng: -66.5, w: 800, h: 1000 };

function project({ lat, lng }) {
  const { minLat, maxLat, minLng, maxLng, w, h } = MAP_BOX;
  // Simple equirectangular projection — fine at this editorial scale
  const x = ((lng - minLng) / (maxLng - minLng)) * w;
  const y = h - ((lat - minLat) / (maxLat - minLat)) * h;
  return { x, y };
}

// ----------------------------------------------------------------
// Hand-built Colombia silhouette. Not geodetically accurate — an
// editorial illustration with recognizable shape: Guajira peninsula
// poking NE, Pacific coast bulging W, Amazonas tapering SE.
// Coordinates are in the 800×1000 viewBox, matching `project()`.
// ----------------------------------------------------------------
const COLOMBIA_PATH = [
  // Start at Guajira tip (Punta Gallinas) NE
  "M 580 92",
  "L 612 118",     // cabo de la vela
  "L 602 160",     // riohacha
  "L 568 182",     // santa marta
  "L 540 186",     // tayrona
  "L 512 196",     // barranquilla
  "L 486 208",     // cartagena
  "L 472 232",     // turbo bay
  "L 450 258",     // gulf of uraba
  "L 432 284",     // chocó pacific coast start
  "L 402 312",
  "L 380 352",     // nuquí
  "L 362 404",     // buenaventura
  "L 348 454",
  "L 338 498",     // tumaco
  "L 328 548",     // ecuador border pacific
  "L 352 576",     // narino inland
  "L 390 610",     // putumayo
  "L 432 636",     // amazonas upper
  "L 470 672",
  "L 508 710",     // southern amazon
  "L 554 760",
  "L 598 812",
  "L 632 862",     // leticia area
  "L 656 906",     // amazon tip (south)
  "L 664 938",
  // Back up the eastern side (Orinoquía & llanos, then east border)
  "L 700 910",
  "L 728 862",
  "L 748 806",
  "L 762 744",     // vichada
  "L 756 684",
  "L 738 628",
  "L 718 578",
  "L 708 528",
  "L 702 478",     // arauca
  "L 692 428",
  "L 678 386",
  "L 660 346",
  "L 640 304",     // venezuelan border
  "L 624 264",
  "L 612 220",
  "L 602 186",
  "L 598 156",
  "L 588 124",
  "Z"
].join(" ");

// San Andrés & Providencia — island off to the NW (drawn separately)
const SAN_ANDRES_ISLANDS = [
  { cx: 232, cy: 68, r: 6 },   // Providencia
  { cx: 240, cy: 110, r: 9 },  // San Andrés (larger)
];

// Andes cordillera spine — three branches, drawn as soft ridges
const ANDES_RIDGES = [
  // Western cordillera
  "M 420 296 Q 408 400 396 498 Q 388 572 372 620",
  // Central cordillera (passes Medellín → Eje Cafetero → Nevado)
  "M 468 260 Q 452 360 438 460 Q 428 542 420 610",
  // Eastern cordillera (Bogotá → Boyacá)
  "M 540 266 Q 556 360 568 456 Q 574 536 566 608",
];

// Rivers — Magdalena (central) and Amazonas (south)
const RIVERS = [
  // Magdalena — flows north from Andes into Caribbean near Barranquilla
  "M 500 580 Q 504 480 508 380 Q 510 300 512 212",
  // Amazonas — eastward across south
  "M 540 830 Q 600 850 660 900",
  // Orinoco — NE through llanos
  "M 660 400 Q 700 350 740 320",
];

// ----------------------------------------------------------------
// <ColombiaMap /> — the core SVG stage
// Props:
//   pins: [{ id, lat, lng, label, kind, active, onClick }]
//   route: [pinId, pinId, ...]  → draws connector between consecutive pins
//   variant: "default" | "editorial" | "minimal" | "compact"
//   showLabels: bool
//   showRidges: bool
//   showRivers: bool
//   height: css height
// ----------------------------------------------------------------
function ColombiaMap({
  pins = [],
  route = null,
  variant = "default",
  showLabels = true,
  showRidges = true,
  showRivers = false,
  hoveredId = null,
  onHover = () => {},
  onPinClick = () => {},
  height = 540,
  ariaLabel = "Mapa de Colombia",
}) {
  const projected = pins.map(p => {
    const geo = p.lat != null ? p : GEO[p.id];
    if (!geo) return null;
    const xy = project({ lat: geo.lat, lng: geo.lng });
    return { ...p, ...geo, ...xy };
  }).filter(Boolean);

  const routePath = route
    ? route.map((id, i) => {
        const pin = projected.find(p => p.id === id) || (GEO[id] && { ...GEO[id], ...project(GEO[id]) });
        if (!pin) return "";
        return `${i===0?"M":"L"} ${pin.x.toFixed(1)} ${pin.y.toFixed(1)}`;
      }).join(" ")
    : null;

  const isEditorial = variant === "editorial";
  const isMinimal   = variant === "minimal";
  const isCompact   = variant === "compact";

  return (
    <div className={`co-map co-map-${variant}`} style={{ height }} role="img" aria-label={ariaLabel}>
      <svg viewBox={`0 0 ${MAP_BOX.w} ${MAP_BOX.h}`} preserveAspectRatio="xMidYMid meet" className="co-map-svg">
        <defs>
          <pattern id="co-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="0.8" opacity="0.18"/>
          </pattern>
          <radialGradient id="co-glow" cx="50%" cy="40%" r="60%">
            <stop offset="0%"  stopColor="currentColor" stopOpacity="0.18"/>
            <stop offset="100%" stopColor="currentColor" stopOpacity="0"/>
          </radialGradient>
          <filter id="co-softshadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="6"/>
            <feOffset dx="0" dy="4" result="offsetblur"/>
            <feComponentTransfer><feFuncA type="linear" slope="0.28"/></feComponentTransfer>
            <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Ocean glow background */}
        {!isMinimal && (
          <rect x="0" y="0" width={MAP_BOX.w} height={MAP_BOX.h} fill="url(#co-glow)" className="co-ocean"/>
        )}

        {/* Country silhouette */}
        <g filter={isEditorial ? "url(#co-softshadow)" : ""}>
          <path d={COLOMBIA_PATH} className="co-land" fill={isEditorial ? "url(#co-hatch)" : "currentColor"} />
          <path d={COLOMBIA_PATH} className="co-land-stroke" fill="none"/>

          {/* San Andrés & Providencia islands */}
          {SAN_ANDRES_ISLANDS.map((i, k) => (
            <g key={k}>
              <circle cx={i.cx} cy={i.cy} r={i.r} className="co-land" fill={isEditorial ? "url(#co-hatch)" : "currentColor"} />
              <circle cx={i.cx} cy={i.cy} r={i.r} className="co-land-stroke" fill="none"/>
            </g>
          ))}

          {/* Dotted line showing the islands belong */}
          {!isMinimal && (
            <path d="M 244 118 Q 340 150 440 210" className="co-link-dash" fill="none"/>
          )}
        </g>

        {/* Andes ridges (editorial texture) */}
        {showRidges && !isMinimal && ANDES_RIDGES.map((d, i) => (
          <path key={i} d={d} className="co-ridge" fill="none"/>
        ))}

        {/* Rivers */}
        {showRivers && RIVERS.map((d, i) => (
          <path key={i} d={d} className="co-river" fill="none"/>
        ))}

        {/* Route polyline */}
        {routePath && (
          <g>
            <path d={routePath} className="co-route-shadow" fill="none"/>
            <path d={routePath} className="co-route" fill="none"/>
          </g>
        )}

        {/* Pins */}
        {projected.map((p, i) => {
          const active = p.active || hoveredId === p.id;
          const routeIndex = route ? route.indexOf(p.id) : -1;
          return (
            <g key={p.id || i}
               transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}
               className={`co-pin ${active ? "on" : ""} co-pin-${p.kind || "dest"}`}
               onMouseEnter={() => onHover(p.id)}
               onMouseLeave={() => onHover(null)}
               onClick={() => onPinClick(p)}
               style={{ cursor: onPinClick !== (()=>{}) ? "pointer" : "default" }}>
              {active && <circle r="22" className="co-pin-halo"/>}
              <circle r={isCompact ? 6 : 9} className="co-pin-core"/>
              <circle r={isCompact ? 3 : 4} className="co-pin-dot"/>
              {routeIndex >= 0 && (
                <text className="co-pin-num" y="1.2" textAnchor="middle">{routeIndex + 1}</text>
              )}
              {showLabels && (
                <text className="co-pin-label"
                      x={p.x > MAP_BOX.w * 0.7 ? -14 : 14}
                      y={4}
                      textAnchor={p.x > MAP_BOX.w * 0.7 ? "end" : "start"}>
                  {p.label || p.name}
                </text>
              )}
            </g>
          );
        })}

        {/* Compass rose — only on editorial variant */}
        {isEditorial && (
          <g className="co-compass" transform="translate(720 940)">
            <circle r="28" className="co-compass-ring" fill="none"/>
            <path d="M 0 -22 L 4 0 L 0 22 L -4 0 Z" className="co-compass-needle"/>
            <text y="-34" textAnchor="middle" className="co-compass-n">N</text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ----------------------------------------------------------------
// <CountryChip /> — tiny silhouette + dot for package cards
// ----------------------------------------------------------------
function CountryChip({ destId, region }) {
  const geo = GEO[destId];
  if (!geo) return null;
  const xy = project(geo);
  // Compact viewBox — we scale down
  return (
    <span className="country-chip" title={geo.name}>
      <svg viewBox={`0 0 ${MAP_BOX.w} ${MAP_BOX.h}`} className="country-chip-svg" aria-hidden="true">
        <path d={COLOMBIA_PATH} className="country-chip-land"/>
        {SAN_ANDRES_ISLANDS.map((i, k) => (
          <circle key={k} cx={i.cx} cy={i.cy} r={i.r + 2} className="country-chip-land"/>
        ))}
        <circle cx={xy.x} cy={xy.y} r="42" className="country-chip-halo"/>
        <circle cx={xy.x} cy={xy.y} r="22" className="country-chip-dot"/>
      </svg>
      <span className="country-chip-text">{region || geo.region || "Colombia"}</span>
    </span>
  );
}

// ----------------------------------------------------------------
// <RegionalMiniMap /> — small map for destination detail cards
// ----------------------------------------------------------------
function RegionalMiniMap({ pins, height = 280 }) {
  return (
    <ColombiaMap
      pins={pins}
      variant="minimal"
      showLabels={false}
      showRidges={false}
      height={height}
    />
  );
}

// ----------------------------------------------------------------
// <ItineraryMap /> — geographic route map for package detail
// Replaces (or complements) the linear RouteMap.
// ----------------------------------------------------------------
function ItineraryMap({ stops, pkgTitle }) {
  const [hover, setHover] = useState(null);
  // Build pins from stop names — match against GEO by fuzzy name
  const pins = stops.map((s, i) => {
    const key = (s.id || findGeoKey(s.name)) || "cartagena";
    const geo = GEO[key] || { lat: 6.24, lng: -75.58, name: s.name };
    return {
      id: key + "-" + i,
      lat: geo.lat, lng: geo.lng,
      label: s.name,
      kind: "stop",
      nights: s.nights,
    };
  });
  const routeIds = pins.map(p => p.id);

  return (
    <section className="itin-map">
      <div className="im-head">
        <span className="label">Ruta en el mapa</span>
        <small>{pins.length} paradas · {pins.reduce((a, p) => a + (p.nights||0), 0)} noches</small>
      </div>
      <div className="im-grid">
        <div className="im-stage">
          <ColombiaMap
            pins={pins.map(p => ({ ...p, active: hover === p.id }))}
            route={routeIds}
            variant="editorial"
            showLabels={false}
            showRidges={true}
            showRivers={true}
            hoveredId={hover}
            onHover={setHover}
            height={540}
            ariaLabel={`Mapa de la ruta para ${pkgTitle || "este paquete"}`}
          />
        </div>
        <aside className="im-legend">
          <div className="im-legend-title">Paradas del viaje</div>
          <ol>
            {pins.map((p, i) => (
              <li key={p.id}
                  className={hover === p.id ? "on" : ""}
                  onMouseEnter={() => setHover(p.id)}
                  onMouseLeave={() => setHover(null)}>
                <span className="im-num">{i+1}</span>
                <div>
                  <b>{p.label}</b>
                  <small>{p.nights} noche{p.nights!==1?"s":""}</small>
                </div>
                <span className="im-chev">›</span>
              </li>
            ))}
          </ol>
          <div className="im-foot">
            <span className="dot dot-route"/> Ruta estimada · los traslados se ajustan según vuelos y clima
          </div>
        </aside>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------
// <ListingMap /> — for /paquetes listing map view
// Shows all packages as numbered pins, with a scrollable card list
// that syncs with hover.
// ----------------------------------------------------------------
function ListingMap({ packages, onOpenDetail, hover, setHover }) {
  const pins = packages.map((p, i) => ({
    id: p.id,
    lat: GEO[p.dest.id]?.lat,
    lng: GEO[p.dest.id]?.lng,
    label: p.dest.name,
    kind: "pkg",
    active: hover === p.id,
  })).filter(p => p.lat != null);

  return (
    <div className="listing-map-view">
      <div className="listing-map-stage">
        <ColombiaMap
          pins={pins}
          variant="editorial"
          showLabels={false}
          showRidges={true}
          showRivers={false}
          hoveredId={hover}
          onHover={setHover}
          onPinClick={(p) => {
            const pkg = packages.find(x => x.id === p.id);
            if (pkg) onOpenDetail(pkg);
          }}
          height={720}
          ariaLabel="Mapa de paquetes disponibles"
        />
      </div>
      <div className="listing-map-cards">
        {packages.map(p => (
          <div
            key={p.id}
            className={`lm-card ${hover===p.id?"on":""}`}
            onMouseEnter={()=>setHover(p.id)}
            onMouseLeave={()=>setHover(null)}
            onClick={()=>onOpenDetail(p)}
          >
            <div className="lm-thumb">
              {window.Scenic && <window.Scenic scene={p.dest.scene}/>}
              <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,transparent 50%, rgba(0,0,0,.5))"}}/>
              <span className="lm-region">{p.dest.region}</span>
            </div>
            <div className="lm-body">
              <small>{p.loc} · {p.days}d</small>
              <b>{p.title}</b>
              <div className="lm-foot">
                <span>Desde <sup>{p.currency}</sup>{p.price.toLocaleString()}</span>
                <span className="lm-chev">›</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function findGeoKey(name) {
  if (!name) return null;
  const n = name.toLowerCase().trim();
  const keys = Object.keys(GEO);
  // direct match
  for (const k of keys) {
    if (GEO[k].name.toLowerCase() === n) return k;
    if (k.replace(/-/g, " ") === n) return k;
  }
  // partial
  for (const k of keys) {
    if (n.includes(GEO[k].name.toLowerCase()) || GEO[k].name.toLowerCase().includes(n)) return k;
  }
  return null;
}

Object.assign(window, {
  ColombiaMap, CountryChip, RegionalMiniMap, ItineraryMap, ListingMap,
  GEO, project, findGeoKey, MAP_BOX, COLOMBIA_PATH,
});
