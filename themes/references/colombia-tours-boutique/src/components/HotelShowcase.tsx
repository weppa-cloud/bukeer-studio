"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { HotelCard, type Hotel } from "./HotelCard";

const HOTELS: Hotel[] = [
  { id: "1", name: "Ananda Hotel Boutique", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=75", location: "Cartagena", rating: 5, price: "Desde $180/noche", slug: "ananda-boutique" },
  { id: "2", name: "Ecohabs Tequendama", image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=75", location: "Parque Tayrona", rating: 4, price: "Desde $120/noche", slug: "ecohabs-tayrona" },
  { id: "3", name: "Hacienda El Percal", image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=75", location: "Eje Cafetero", rating: 4, price: "Desde $95/noche", slug: "hacienda-percal" },
];

export default function HotelShowcase() {
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
            <p className="font-mono text-xs tracking-[0.15em] uppercase mb-3" style={{ color: "var(--accent)" }}>Alojamiento</p>
            <h2 className="font-display" style={{ fontSize: "var(--text-display-lg)", color: "var(--text-heading)" }}>Hoteles seleccionados</h2>
          </div>
          <a href="/hoteles" className="block font-mono text-xs tracking-wider uppercase" style={{ color: "var(--accent)" }}>Ver todos →</a>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {HOTELS.map((h, i) => <HotelCard key={h.id} hotel={h} index={i} />)}
        </div>
      </div>
    </section>
  );
}
