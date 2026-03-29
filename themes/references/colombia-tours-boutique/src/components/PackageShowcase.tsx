"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { PackageCard, type Package } from "./PackageCard";

const PACKAGES: Package[] = [
  { id: "1", name: "Colombia Ritmo y Sabor", image: "https://images.unsplash.com/photo-1583531352515-8884af319dc1?w=600&q=75", destination: "Cali → Medellín → Cartagena", duration: "11 días", price: "$1,800 USD", highlights: ["Alojamiento 4★", "Vuelos internos", "Guía bilingüe"], category: "Popular", slug: "ritmo-sabor" },
  { id: "2", name: "Colombia Esencia", image: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=600&q=75", destination: "Santa Marta → Eje Cafetero → Medellín", duration: "12 días", price: "$2,300 USD", highlights: ["Hotel 4-5★", "Tayrona", "Valle del Cocora"], category: "Premium", slug: "esencia" },
  { id: "3", name: "Colombia Corazón", image: "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=600&q=75", destination: "Cartagena → Cali → Medellín → Bogotá", duration: "15 días", price: "$3,000 USD", highlights: ["Hotel 5★", "Todos los vuelos", "Experiencia completa"], category: "Exclusivo", slug: "corazon" },
];

export default function PackageShowcase() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-end justify-between mb-14"
        >
          <div>
            <p className="font-mono text-xs tracking-[0.15em] uppercase mb-3" style={{ color: "var(--accent)" }}>Paquetes</p>
            <h2 className="font-display" style={{ fontSize: "var(--text-display-lg)", color: "var(--text-heading)" }}>Viajes diseñados por expertos</h2>
          </div>
          <a href="/paquetes" className="block font-mono text-xs tracking-wider uppercase" style={{ color: "var(--accent)" }}>Ver todos →</a>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PACKAGES.map((p, i) => <PackageCard key={p.id} pkg={p} index={i} />)}
        </div>
      </div>
    </section>
  );
}
