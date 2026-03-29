"use client";
import { motion } from "framer-motion";
import { MapPin, Star } from "lucide-react";

export interface Hotel {
  id: string;
  name: string;
  image: string;
  location: string;
  rating: number;
  price: string;
  slug: string;
}

export function HotelCard({ hotel, index = 0 }: { hotel: Hotel; index?: number }) {
  return (
    <motion.a
      href={`/hoteles/${hotel.slug}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: index * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      className="group block rounded-2xl overflow-hidden"
      style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
    >
      <div className="relative overflow-hidden" style={{ aspectRatio: "16/10" }}>
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={{ backgroundImage: `url('${hotel.image}')` }}
        />
        <div className="absolute top-3 right-3 flex items-center gap-0.5 px-2 py-1 rounded-full backdrop-blur-sm" style={{ backgroundColor: "var(--card-badge-bg)", border: "1px solid var(--card-badge-border)" }}>
          {Array.from({ length: hotel.rating }).map((_, i) => (
            <Star key={i} size={10} className="text-sand-400 fill-sand-400" />
          ))}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-display text-lg leading-tight mb-1" style={{ color: "var(--text-heading)" }}>{hotel.name}</h3>
        <div className="flex items-center gap-1 mb-3">
          <MapPin size={12} style={{ color: "var(--text-muted)" }} />
          <span className="font-sans text-xs" style={{ color: "var(--text-muted)" }}>{hotel.location}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-display text-lg" style={{ color: "var(--accent)" }}>{hotel.price}</span>
          <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "var(--accent)" }}>Ver Hotel →</span>
        </div>
      </div>
    </motion.a>
  );
}
