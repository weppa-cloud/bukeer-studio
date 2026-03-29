"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { ListingHero } from "@/components/ListingHero";
import { BlogCard, type BlogPost } from "@/components/BlogCard";

const POSTS: BlogPost[] = [
  {
    id: "1",
    title: "Los 10 mejores destinos de playa en Colombia para 2026",
    slug: "mejores-playas-colombia-2026",
    excerpt: "Desde las islas del Rosario hasta la costa del Pacífico, descubre las playas más espectaculares que Colombia tiene para ofrecer este año.",
    featuredImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=75",
    publishedAt: "15 Mar 2026",
    category: { name: "Destinos", slug: "destinos" },
  },
  {
    id: "2",
    title: "Guía completa para visitar el Eje Cafetero",
    slug: "guia-eje-cafetero",
    excerpt: "Todo lo que necesitas saber para planificar tu viaje al corazón cafetero de Colombia: rutas, alojamiento, actividades y gastronomía.",
    featuredImage: "https://images.unsplash.com/photo-1625235028683-3e86b6b0d515?w=600&q=75",
    publishedAt: "8 Mar 2026",
    category: { name: "Guías", slug: "guias" },
  },
  {
    id: "3",
    title: "Temporada de ballenas: cuándo y dónde verlas",
    slug: "temporada-ballenas-colombia",
    excerpt: "Cada año, las ballenas jorobadas llegan a las costas del Pacífico colombiano. Te contamos los mejores meses y puntos de avistamiento.",
    featuredImage: "https://images.unsplash.com/photo-1568430462989-44163eb1752f?w=600&q=75",
    publishedAt: "28 Feb 2026",
    category: { name: "Temporadas", slug: "temporadas" },
  },
  {
    id: "4",
    title: "La gastronomía de Cartagena: sabores que enamoran",
    slug: "gastronomia-cartagena",
    excerpt: "Un recorrido por los platos típicos, restaurantes imperdibles y mercados locales de la ciudad amurallada más deliciosa de Colombia.",
    featuredImage: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=75",
    publishedAt: "20 Feb 2026",
    category: { name: "Cultura", slug: "cultura" },
  },
  {
    id: "5",
    title: "5 consejos para hacer trekking en Ciudad Perdida",
    slug: "consejos-trekking-ciudad-perdida",
    excerpt: "Prepárate para una de las caminatas más icónicas de Sudamérica con estos consejos prácticos sobre equipo, preparación física y logística.",
    featuredImage: "https://images.unsplash.com/photo-1533130061792-64b345e4a833?w=600&q=75",
    publishedAt: "12 Feb 2026",
    category: { name: "Consejos", slug: "consejos" },
  },
  {
    id: "6",
    title: "Medellín: de ciudad de la eterna primavera a destino mundial",
    slug: "medellin-destino-mundial",
    excerpt: "Cómo Medellín se transformó en uno de los destinos más visitados de Latinoamérica y qué la hace tan especial para los viajeros.",
    featuredImage: "https://images.unsplash.com/photo-1599076794168-e6fb6fb0e38e?w=600&q=75",
    publishedAt: "5 Feb 2026",
    category: { name: "Destinos", slug: "destinos" },
  },
];

const CATEGORIES = ["Todos", "Destinos", "Guías", "Temporadas", "Cultura", "Consejos"];

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState("Todos");

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-sand-400 focus:text-stone-950 focus:font-medium focus:text-sm">
        Ir al contenido principal
      </a>
      <SiteHeader />
      <main id="main-content">
        <ListingHero
          eyebrow="Blog"
          title="Historias y guías de viaje"
          subtitle="Descubre las últimas novedades, guías y consejos"
        />

        {/* Category pills */}
        <section className="pb-10">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex flex-wrap gap-3 justify-center"
            >
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="px-5 py-2 rounded-full font-mono text-xs tracking-wider uppercase transition-colors cursor-pointer"
                  style={{
                    backgroundColor: activeCategory === cat ? "var(--accent)" : "var(--nav-link-hover-bg)",
                    color: activeCategory === cat ? "var(--bg)" : "var(--text-secondary)",
                    border: `1px solid ${activeCategory === cat ? "var(--accent)" : "var(--border-medium)"}`,
                  }}
                >
                  {cat}
                </button>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Grid */}
        <section className="pb-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {POSTS.map((post, i) => (
                <BlogCard key={post.id} post={post} index={i} />
              ))}
            </div>

            <div className="text-center mt-12">
              <a href="/" className="font-mono text-xs tracking-wider uppercase" style={{ color: "var(--accent)" }}>← Volver al inicio</a>
            </div>

            <div className="text-center mt-8">
              <button className="px-6 py-3 rounded-full font-sans text-sm font-medium transition-all" style={{ border: "1px solid var(--border-medium)", color: "var(--text-secondary)" }}>
                Cargar más resultados
              </button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
