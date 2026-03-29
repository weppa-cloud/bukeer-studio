"use client";
import { motion } from "framer-motion";
import { MapPin, Clock, Check } from "lucide-react";

export interface Package {
  id: string;
  name: string;
  image: string;
  destination: string;
  duration: string;
  price: string;
  highlights: string[];
  category: string;
  slug: string;
}

export function PackageCard({ pkg, index = 0 }: { pkg: Package; index?: number }) {
  return (
    <motion.a
      href={`/paquetes#${pkg.slug}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: index * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      className="group block rounded-2xl overflow-hidden"
      style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
    >
      <div className="relative h-48 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={{ backgroundImage: `url('${pkg.image}')` }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, var(--card-gradient), transparent)" }} />
        <div className="absolute top-3 left-3">
          <span className="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full backdrop-blur-sm" style={{ backgroundColor: "var(--card-badge-bg)", border: "1px solid var(--card-badge-border)", color: "var(--card-badge-text)" }}>
            {pkg.category}
          </span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-display text-xl leading-tight mb-2" style={{ color: "var(--text-heading)" }}>{pkg.name}</h3>
        <div className="flex items-center gap-3 mb-3 text-xs" style={{ color: "var(--text-muted)" }}>
          <span className="flex items-center gap-1"><MapPin size={11} /> {pkg.destination}</span>
          <span className="flex items-center gap-1"><Clock size={11} /> {pkg.duration}</span>
        </div>
        <ul className="space-y-1.5 mb-4">
          {pkg.highlights.slice(0, 3).map((h) => (
            <li key={h} className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              <Check size={12} className="text-jungle-600 shrink-0" /> {h}
            </li>
          ))}
        </ul>
        <div className="pt-3 flex items-center justify-between" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <span className="font-display text-xl" style={{ color: "var(--accent)" }}>{pkg.price}</span>
          <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "var(--accent)" }}>Ver Paquete →</span>
        </div>
      </div>
    </motion.a>
  );
}
