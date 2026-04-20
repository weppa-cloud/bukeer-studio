// Primitives: Icons, Scenic, Logo
const { useState, useEffect, useRef, useMemo } = React;

// Minimal, consistent line icons (24px, 1.5 stroke) — no mixing sets
const Ic = {
  search: (p={}) => <svg viewBox="0 0 24 24" width={p.s||18} height={p.s||18} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
  arrow: (p={}) => <svg viewBox="0 0 24 24" width={p.s||18} height={p.s||18} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
  arrowUpRight: (p={}) => <svg viewBox="0 0 24 24" width={p.s||18} height={p.s||18} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>,
  calendar: (p={}) => <svg viewBox="0 0 24 24" width={p.s||18} height={p.s||18} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>,
  pin: (p={}) => <svg viewBox="0 0 24 24" width={p.s||18} height={p.s||18} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/></svg>,
  users: (p={}) => <svg viewBox="0 0 24 24" width={p.s||18} height={p.s||18} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M21 20c0-2.5-1.8-4.5-4-4.9"/></svg>,
  clock: (p={}) => <svg viewBox="0 0 24 24" width={p.s||18} height={p.s||18} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  heart: (p={}) => <svg viewBox="0 0 24 24" width={p.s||18} height={p.s||18} fill={p.fill||"none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20s-7-4.3-7-10a4.5 4.5 0 0 1 7-3.5A4.5 4.5 0 0 1 19 10c0 5.7-7 10-7 10Z"/></svg>,
  star: (p={}) => <svg viewBox="0 0 24 24" width={p.s||14} height={p.s||14} fill="currentColor"><path d="M12 2.5 14.6 8l6 .7-4.5 4 1.3 5.9L12 15.8l-5.4 2.8L8 12.7l-4.5-4 6-.7z"/></svg>,
  globe: (p={}) => <svg viewBox="0 0 24 24" width={p.s||18} height={p.s||18} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>,
  whatsapp: (p={}) => <svg viewBox="0 0 24 24" width={p.s||26} height={p.s||26} fill="currentColor"><path d="M19.1 4.9A10 10 0 0 0 4.2 18.3L3 22l3.8-1.2a10 10 0 0 0 12.3-15.9Zm-7.1 15a8.4 8.4 0 0 1-4.3-1.2l-.3-.2-2.3.7.7-2.2-.2-.3a8.4 8.4 0 1 1 6.4 3.2Zm4.6-6.2c-.3-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1c-.1.2-.3.2-.6.1a7 7 0 0 1-2-1.3 7.6 7.6 0 0 1-1.4-1.7c-.1-.3 0-.4.1-.5l.4-.5.2-.4c.1-.2 0-.3 0-.4l-.8-1.8c-.2-.4-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-1 2.2 5.3 5.3 0 0 0 1.1 2.8 12 12 0 0 0 4.6 4c.6.3 1.1.5 1.5.6a3.6 3.6 0 0 0 1.6.1 2.7 2.7 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.1-.3-.2-.5-.3Z"/></svg>,
  close: (p={}) => <svg viewBox="0 0 24 24" width={p.s||18} height={p.s||18} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>,
  plus: (p={}) => <svg viewBox="0 0 24 24" width={p.s||16} height={p.s||16} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  check: (p={}) => <svg viewBox="0 0 24 24" width={p.s||16} height={p.s||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10"/></svg>,
  menu: (p={}) => <svg viewBox="0 0 24 24" width={p.s||20} height={p.s||20} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>,
  grid: (p={}) => <svg viewBox="0 0 24 24" width={p.s||16} height={p.s||16} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  map: (p={}) => <svg viewBox="0 0 24 24" width={p.s||16} height={p.s||16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/></svg>,
  leaf: (p={}) => <svg viewBox="0 0 24 24" width={p.s||20} height={p.s||20} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20c0-9 6-14 16-14-1 11-6 16-16 16Z"/><path d="M4 20c5-4 9-6 16-14"/></svg>,
  shield: (p={}) => <svg viewBox="0 0 24 24" width={p.s||20} height={p.s||20} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 6v6c0 4.5 3.2 8.3 8 9 4.8-.7 8-4.5 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></svg>,
  sparkle: (p={}) => <svg viewBox="0 0 24 24" width={p.s||20} height={p.s||20} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>,
  compass: (p={}) => <svg viewBox="0 0 24 24" width={p.s||20} height={p.s||20} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m15 9-1.5 4.5L9 15l1.5-4.5L15 9Z"/></svg>,
  award: (p={}) => <svg viewBox="0 0 24 24" width={p.s||20} height={p.s||20} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="6"/><path d="M8.5 13.5 7 22l5-3 5 3-1.5-8.5"/></svg>,
  ig: (p={}) => <svg viewBox="0 0 24 24" width={p.s||18} height={p.s||18} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/></svg>,
  fb: (p={}) => <svg viewBox="0 0 24 24" width={p.s||18} height={p.s||18} fill="currentColor"><path d="M13 22v-8h3l.5-4H13V7.5c0-1.2.4-2 2-2H17V2a26 26 0 0 0-3-.2C11 1.8 9 3.5 9 7v3H6v4h3v8h4Z"/></svg>,
  tiktok: (p={}) => <svg viewBox="0 0 24 24" width={p.s||18} height={p.s||18} fill="currentColor"><path d="M16 3h-3v13a2.5 2.5 0 1 1-2.5-2.5V10A5.5 5.5 0 1 0 16 15.5V9.5a7 7 0 0 0 4 1.3V7.8A4 4 0 0 1 16 4V3Z"/></svg>,
};

function Scenic({ scene, className="" }) {
  if (!scene) return <div className={`scenic ${className}`} style={{ "--scene-grad": "linear-gradient(135deg, var(--c-ink), var(--c-primary) 60%, var(--c-ink-2))" }} />;
  return (
    <div className={`scenic ${className}`} style={{ background: scene.bg }}>
      <div className="scenic-sky" />
      {(scene.layers||[]).map((l, i) => {
        const base = { position: "absolute", ...(l.style||{}) };
        if (l.type === "circle") base.borderRadius = base.borderRadius || "50%";
        return <div key={i} style={base} />;
      })}
    </div>
  );
}

function Logo({ light=false, tagline=true }) {
  return (
    <span className="nav-logo" aria-label="ColombiaTours.travel">
      <img src="assets/logo.png" alt="ColombiaTours.travel" />
      {tagline && (
        <span className="logo-tag" style={light ? { color: "rgba(255,255,255,.75)" } : null}>
          Operador local · desde 2011
        </span>
      )}
    </span>
  );
}

function Rating({ value, count, size=14 }) {
  return (
    <span className="rating">
      <Ic.star s={size} /><b>{value.toFixed(1)}</b>
      {count != null && <small style={{ color: "var(--c-muted)", fontWeight: 500 }}>({count})</small>}
    </span>
  );
}

Object.assign(window, { Ic, Scenic, Logo, Rating });
