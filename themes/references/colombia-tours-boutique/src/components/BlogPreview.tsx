"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { BlogCard, type BlogPost } from "./BlogCard";

const POSTS: BlogPost[] = [
  { id: "1", title: "Los 10 Destinos Imperdibles de Colombia en 2026", slug: "10-destinos-2026", excerpt: "Desde las playas vírgenes del Pacífico hasta los pueblos coloniales de Boyacá, descubre los lugares que no te puedes perder.", featuredImage: "https://images.unsplash.com/photo-1583531352515-8884af319dc1?w=600&q=75", publishedAt: "15 Mar 2026", category: { name: "Destinos", slug: "destinos" } },
  { id: "2", title: "Guía Completa del Eje Cafetero: Café, Cocora y Cultura", slug: "guia-eje-cafetero", excerpt: "Todo lo que necesitas saber para vivir la experiencia cafetera auténtica en el corazón de Colombia.", featuredImage: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=600&q=75", publishedAt: "10 Mar 2026", category: { name: "Guías", slug: "guias" } },
  { id: "3", title: "Avistamiento de Ballenas: Cuándo y Dónde en Colombia", slug: "ballenas-colombia", excerpt: "Cada año entre julio y octubre, las ballenas jorobadas llegan a la costa pacífica colombiana.", featuredImage: "https://images.unsplash.com/photo-1568430462989-44163eb1752f?w=600&q=75", publishedAt: "5 Mar 2026", category: { name: "Temporadas", slug: "temporadas" } },
];

export default function BlogPreview() {
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
            <p className="font-mono text-xs tracking-[0.15em] uppercase mb-3" style={{ color: "var(--accent)" }}>Blog</p>
            <h2 className="font-display" style={{ fontSize: "var(--text-display-lg)", color: "var(--text-heading)" }}>Historias y guías de viaje</h2>
          </div>
          <a href="/blog" className="hidden md:block font-mono text-xs tracking-wider uppercase" style={{ color: "var(--accent)" }}>Ver todos →</a>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {POSTS.map((p, i) => <BlogCard key={p.id} post={p} index={i} />)}
        </div>
      </div>
    </section>
  );
}
