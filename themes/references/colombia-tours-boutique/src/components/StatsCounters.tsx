"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const STATS = [
  { num: "15,000+", label: "Viajeros felices" },
  { num: "50+", label: "Destinos" },
  { num: "728", label: "Experiencias" },
  { num: "4.9★", label: "Calificación Google" },
];

export default function StatsCounters() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-16 md:py-20" style={{ borderTop: "1px solid var(--stat-border)", borderBottom: "1px solid var(--stat-border)" }} aria-label="Estadísticas">
      {/* Fix #9: Responsive gap and font size for mobile */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:flex md:justify-center gap-8 md:gap-16">
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            <p className="font-display text-3xl md:text-5xl mb-1" style={{ color: "var(--accent)" }}>{stat.num}</p>
            <p className="font-mono text-[9px] md:text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
