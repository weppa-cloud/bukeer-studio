"use client";
import { useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";

export default function WhyChooseUs() {
  const ref = useRef(null);
  const spotRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    const el = spotRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
      el.style.setProperty("--my", `${e.clientY - rect.top}px`);
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <section
      id="nosotros"
      ref={spotRef}
      className="relative py-32 overflow-hidden"
      style={{
        borderTop: "1px solid var(--stat-border)",
        borderBottom: "1px solid var(--stat-border)",
        background: "radial-gradient(600px circle at var(--mx, 50%) var(--my, 50%), var(--spotlight-color), transparent 70%)",
      }}
    >
      <div ref={ref} className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="font-mono text-xs tracking-[0.15em] uppercase mb-4" style={{ color: "var(--accent)" }}>
            Por qué elegirnos
          </p>
          <h2 className="font-display mb-6" style={{ fontSize: "var(--text-display-lg)", color: "var(--text-heading)" }}>
            Turismo <em className="not-italic text-sand-400">auténtico,</em><br />
            experiencias reales
          </h2>
          <p className="font-sans text-base leading-relaxed mb-8" style={{ color: "var(--text-secondary)" }}>
            Cada tour está diseñado y operado por locales que conocen cada rincón del destino. No somos intermediarios — somos los guías.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {[
              { num: "100%", label: "Guías locales certificados" },
              { num: "24/7", label: "Soporte en español" },
              { num: "0", label: "Comisiones ocultas" },
              { num: "4.9★", label: "Calificación promedio" },
            ].map((item) => (
              <div
                key={item.label}
                className="p-4 rounded-xl"
                style={{ border: "1px solid var(--border-subtle)", backgroundColor: "var(--nav-link-hover-bg)" }}
              >
                <p className="font-display text-2xl mb-1" style={{ color: "var(--accent)" }}>{item.num}</p>
                <p className="font-sans text-xs leading-tight" style={{ color: "var(--text-muted)" }}>{item.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-2xl overflow-hidden"
          style={{ aspectRatio: "4/5" }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=800&q=75')" }}
          />
        </motion.div>
      </div>
    </section>
  );
}
