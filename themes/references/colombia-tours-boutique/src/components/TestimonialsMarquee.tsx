"use client";
import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

const REVIEWS = [
  { id: 1, name: "Aurelio Sandoval", rating: 5, text: "Fue una experiencia que rebasó nuestras expectativas. Desde la asesoría para programar el viaje, todo estuvo perfectamente coordinado.", tour: "Colombia Ritmo y Sabor" },
  { id: 2, name: "María García", rating: 5, text: "Una experiencia increíble. El tour por Cartagena fue mágico y nuestro guía conocía cada rincón de la ciudad.", tour: "Cartagena Colonial" },
  { id: 3, name: "John Smith", rating: 5, text: "Best trip ever! The coffee region tour exceeded all expectations. Professional service from start to finish.", tour: "Eje Cafetero" },
  { id: 4, name: "Ana Rodríguez", rating: 5, text: "Más que una agencia, fueron amigos que nos guiaron por la Colombia real. Sin duda volveremos.", tour: "Amazonas" },
  { id: 5, name: "Sarah M.", rating: 5, text: "The Amazon tour was life-changing. Our guide knew every bird, every plant. Unforgettable experience.", tour: "Amazonas Safari" },
];

export default function TestimonialsMarquee() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setActive((p) => (p + 1) % REVIEWS.length), []);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(next, 5000);
    return () => clearInterval(interval);
  }, [paused, next]);

  return (
    <section
      className="py-24 max-w-7xl mx-auto px-6"
      aria-label="Testimonios de viajeros"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <h2
        className="font-display mb-16 text-center"
        style={{ fontSize: "var(--text-display-lg)", color: "var(--text-heading)" }}
      >
        Lo que dicen nuestros viajeros
      </h2>

      <div className="relative max-w-2xl mx-auto min-h-[280px]" role="region" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.blockquote
            key={REVIEWS[active].id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            <div className="flex justify-center gap-1 mb-6">
              {Array.from({ length: REVIEWS[active].rating }).map((_, i) => (
                <span key={i} className="text-sand-400 text-lg" aria-hidden="true">★</span>
              ))}
              <span className="sr-only">{REVIEWS[active].rating} de 5 estrellas</span>
            </div>
            <p className="font-display text-xl md:text-2xl leading-relaxed mb-8 italic" style={{ color: "var(--text-heading)" }}>
              &ldquo;{REVIEWS[active].text}&rdquo;
            </p>
            <div className="flex flex-col items-center gap-1">
              <p className="font-sans text-sm font-medium" style={{ color: "var(--text-primary)" }}>{REVIEWS[active].name}</p>
              <p className="font-mono text-xs tracking-wide uppercase" style={{ color: "var(--text-muted)" }}>
                Tour: {REVIEWS[active].tour}
              </p>
            </div>
          </motion.blockquote>
        </AnimatePresence>

        {/* Fix #2 & #3: Dot navigation with aria-labels and larger touch targets */}
        <div className="flex justify-center gap-3 mt-10" role="tablist" aria-label="Testimonios">
          {REVIEWS.map((review, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              role="tab"
              aria-selected={i === active}
              aria-label={`Testimonio de ${review.name}`}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200"
            >
              <span
                className="block rounded-full transition-all duration-200"
                style={{
                  width: i === active ? "12px" : "8px",
                  height: i === active ? "12px" : "8px",
                  background: i === active ? "var(--accent)" : "var(--text-muted)",
                }}
              />
            </button>
          ))}
        </div>

        {/* Fix #7: Auto-advance indicator */}
        {!paused && (
          <div className="flex justify-center mt-3">
            <div className="w-16 h-0.5 rounded-full overflow-hidden" style={{ background: "var(--border-medium)" }}>
              <motion.div
                key={active}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 5, ease: "linear" }}
                className="h-full rounded-full"
                style={{ background: "var(--accent)" }}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
