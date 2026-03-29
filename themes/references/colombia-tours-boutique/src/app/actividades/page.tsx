"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { ListingHero } from "@/components/ListingHero";

interface Activity {
  id: string;
  name: string;
  image: string;
  price: string;
  duration: string;
  slug: string;
}

const ACTIVITIES: Activity[] = [
  {
    id: "1",
    name: "City Tour Medellín",
    image: "https://images.unsplash.com/photo-1583531352515-8884af319dc1?w=600&q=75",
    price: "$45 USD",
    duration: "4h",
    slug: "city-tour-medellin",
  },
  {
    id: "2",
    name: "Rafting San Gil",
    image: "https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=600&q=75",
    price: "$65 USD",
    duration: "6h",
    slug: "rafting-san-gil",
  },
  {
    id: "3",
    name: "Avistamiento Ballenas",
    image: "https://images.unsplash.com/photo-1568430462989-44163eb1752f?w=600&q=75",
    price: "$120 USD",
    duration: "8h",
    slug: "avistamiento-ballenas",
  },
  {
    id: "4",
    name: "Street Food Cartagena",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=75",
    price: "$35 USD",
    duration: "3h",
    slug: "street-food-cartagena",
  },
  {
    id: "5",
    name: "Valle de Cocora",
    image: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=600&q=75",
    price: "$50 USD",
    duration: "5h",
    slug: "valle-de-cocora",
  },
  {
    id: "6",
    name: "Buceo San Andrés",
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=75",
    price: "$80 USD",
    duration: "4h",
    slug: "buceo-san-andres",
  },
];

const CATEGORIES = ["Todos", "City Tours", "Naturaleza", "Aventura", "Náutico", "Gastronomía"];

export default function ActividadesPage() {
  const [activeCategory, setActiveCategory] = useState("Todos");

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-sand-400 focus:text-stone-950 focus:font-medium focus:text-sm">
        Ir al contenido principal
      </a>
      <SiteHeader />
      <main id="main-content">
        <ListingHero
          eyebrow="Experiencias"
          title="Actividades y Tours"
          subtitle="728 experiencias únicas en toda Colombia"
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
              {ACTIVITIES.map((activity, i) => (
                <motion.a
                  key={activity.id}
                  href={`/actividades/${activity.slug}`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: i * 0.1, duration: 0.6, ease: "easeOut" }}
                  whileHover={{ y: -4 }}
                  className="group relative block rounded-2xl overflow-hidden"
                  style={{ aspectRatio: "1/1" }}
                >
                  {/* Image */}
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundImage: `url('${activity.image}')` }}
                  />

                  {/* Gradient overlay */}
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.2) 100%)" }}
                  />

                  {/* Duration badge */}
                  <div
                    className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full backdrop-blur-sm"
                    style={{
                      backgroundColor: "var(--card-badge-bg)",
                      border: "1px solid var(--card-badge-border)",
                    }}
                  >
                    <Clock size={10} style={{ color: "var(--card-badge-text)" }} />
                    <span className="font-mono text-[10px] tracking-wider" style={{ color: "var(--card-badge-text)" }}>
                      {activity.duration}
                    </span>
                  </div>

                  {/* Bottom info */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="font-display text-xl leading-tight mb-1" style={{ color: "#fff" }}>
                      {activity.name}
                    </h3>
                    <span className="font-display text-lg" style={{ color: "var(--accent)" }}>
                      {activity.price}
                    </span>
                  </div>
                </motion.a>
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
