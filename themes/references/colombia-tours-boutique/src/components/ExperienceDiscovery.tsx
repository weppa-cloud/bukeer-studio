"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

const TOURS = [
  { title: "Colombia Ritmo y Sabor", category: "Cultural", price: 1800, duration: "11 días", maxGroup: "12", location: "Cali → Medellín → Cartagena", rating: 4.9, reviewCount: 153, description: "La salsa de Cali, la innovación de Medellín y la magia del Caribe en Cartagena.", img: "https://images.unsplash.com/photo-1583531352515-8884af319dc1?w=800&q=75", featured: true },
  { title: "Caño Cristales", category: "Aventura", price: 950, duration: "4 días", maxGroup: "8", location: "La Macarena", rating: 5.0, reviewCount: 47, description: "El río de los cinco colores. Una experiencia única entre julio y noviembre.", img: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800&q=75" },
  { title: "Cartagena Colonial", category: "Historia", price: 1200, duration: "5 días", maxGroup: "10", location: "Cartagena", rating: 4.8, reviewCount: 89, description: "Centro histórico, Getsemaní, Islas del Rosario y gastronomía caribeña auténtica.", img: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&q=75" },
];

export default function ExperienceDiscovery() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="tours" ref={ref} className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-14"
        >
          <p className="font-mono text-xs tracking-[0.15em] uppercase mb-3" style={{ color: "var(--accent)" }}>
            Tours destacados
          </p>
          <h2 className="font-display" style={{ fontSize: "var(--text-display-lg)", color: "var(--text-heading)" }}>
            Experiencias que no se pueden googlear
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {TOURS.map((tour, i) => (
            <motion.article
              key={tour.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4 }}
              className={cn(
                "group rounded-2xl overflow-hidden",
                tour.featured && "ring-1 ring-sand-400/20"
              )}
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
            >
              <div className="relative h-56 overflow-hidden">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url('${tour.img}')` }}
                />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to top, var(--card-gradient), transparent)` }} />
                <div className="absolute top-4 left-4">
                  <span
                    className="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full backdrop-blur-sm"
                    style={{ backgroundColor: "var(--card-badge-bg)", border: "1px solid var(--card-badge-border)", color: "var(--card-badge-text)" }}
                  >
                    {tour.category}
                  </span>
                </div>
                <div className="absolute top-4 right-4 text-right">
                  <span className="font-display text-lg text-white">${tour.price.toLocaleString()}</span>
                  <span className="font-sans text-xs text-stone-300 block">por persona</span>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-display text-xl leading-tight" style={{ color: "var(--text-heading)" }}>{tour.title}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-sand-400 text-sm">★</span>
                    <span className="font-sans text-sm font-medium" style={{ color: "var(--text-primary)" }}>{tour.rating}</span>
                    <span className="font-sans text-xs" style={{ color: "var(--card-meta)" }}>({tour.reviewCount})</span>
                  </div>
                </div>

                <p className="font-sans text-sm line-clamp-2 mb-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {tour.description}
                </p>

                <div className="flex items-center gap-4 mb-5 pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  {[
                    { icon: "⏱", value: tour.duration },
                    { icon: "👥", value: `Máx. ${tour.maxGroup}` },
                    { icon: "📍", value: tour.location },
                  ].map((meta) => (
                    <div key={meta.value} className="flex items-center gap-1.5">
                      <span className="text-xs">{meta.icon}</span>
                      <span className="font-mono text-[11px]" style={{ color: "var(--card-meta)" }}>{meta.value}</span>
                    </div>
                  ))}
                </div>

                <a
                  href="#"
                  className="block w-full text-center py-3 rounded-xl text-sm font-medium transition-colors duration-200"
                  style={
                    tour.featured
                      ? { backgroundColor: "var(--accent)", color: "var(--accent-text)" }
                      : { backgroundColor: "var(--nav-link-hover-bg)", color: "var(--text-primary)", border: "1px solid var(--border-medium)" }
                  }
                >
                  Ver tour
                </a>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
