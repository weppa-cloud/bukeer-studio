"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { ListingHero } from "@/components/ListingHero";
import { HotelCard, type Hotel } from "@/components/HotelCard";

const HOTELS: Hotel[] = [
  {
    id: "1",
    name: "Hotel Casa San Agustín",
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=75",
    location: "Cartagena",
    rating: 5,
    price: "$320 USD",
    slug: "casa-san-agustin",
  },
  {
    id: "2",
    name: "Hotel Boutique Casa Kiwi",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=75",
    location: "Medellín",
    rating: 4,
    price: "$95 USD",
    slug: "casa-kiwi",
  },
  {
    id: "3",
    name: "Cayena Beach Villa",
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=75",
    location: "San Andrés",
    rating: 5,
    price: "$280 USD",
    slug: "cayena-beach",
  },
  {
    id: "4",
    name: "Hacienda Bambusa",
    image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=75",
    location: "Eje Cafetero",
    rating: 4,
    price: "$145 USD",
    slug: "hacienda-bambusa",
  },
  {
    id: "5",
    name: "Hotel Dann Carlton",
    image: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&q=75",
    location: "Bogotá",
    rating: 4,
    price: "$110 USD",
    slug: "dann-carlton",
  },
  {
    id: "6",
    name: "Irotama Resort",
    image: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=75",
    location: "Santa Marta",
    rating: 5,
    price: "$210 USD",
    slug: "irotama-resort",
  },
];

const DESTINATIONS = ["Todos", "Cartagena", "Santa Marta", "Medellín", "Eje Cafetero", "San Andrés", "Bogotá"];
const STAR_RATINGS = ["Todos", "3★", "4★", "5★"];

export default function HotelesPage() {
  const [activeRating, setActiveRating] = useState("Todos");

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-sand-400 focus:text-stone-950 focus:font-medium focus:text-sm">
        Ir al contenido principal
      </a>
      <SiteHeader />
      <main id="main-content">
        <ListingHero
          eyebrow="Alojamiento"
          title="Hoteles en Colombia"
          subtitle="397 opciones desde boutique hasta resort"
        />

        {/* Filters */}
        <section className="pb-10">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center gap-4"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {/* Search */}
              <div className="relative flex-1 w-full md:w-auto">
                <label className="font-mono text-xs tracking-wider uppercase block mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Buscar
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    placeholder="Nombre del hotel..."
                    aria-label="Buscar hotel"
                    className="w-full pl-9 pr-4 py-2 rounded-lg font-sans text-sm outline-none"
                    style={{
                      backgroundColor: "var(--bg)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-heading)",
                    }}
                  />
                </div>
              </div>

              {/* Destination */}
              <div className="flex-1 w-full md:w-auto">
                <label className="font-mono text-xs tracking-wider uppercase block mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Destino
                </label>
                <select
                  className="w-full px-4 py-2 rounded-lg font-sans text-sm outline-none appearance-none cursor-pointer"
                  style={{
                    backgroundColor: "var(--bg)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-heading)",
                  }}
                >
                  {DESTINATIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Star rating pills */}
              <div>
                <label className="font-mono text-xs tracking-wider uppercase block mb-1.5" style={{ color: "var(--text-muted)" }}>
                  Estrellas
                </label>
                <div className="flex gap-2">
                  {STAR_RATINGS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setActiveRating(r)}
                      className="px-3 py-1.5 rounded-lg font-mono text-xs transition-colors cursor-pointer"
                      style={{
                        backgroundColor: activeRating === r ? "var(--accent)" : "var(--nav-link-hover-bg)",
                        color: activeRating === r ? "var(--bg)" : "var(--text-secondary)",
                        border: `1px solid ${activeRating === r ? "var(--accent)" : "var(--border-medium)"}`,
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Grid */}
        <section className="pb-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {HOTELS.map((hotel, i) => (
                <HotelCard key={hotel.id} hotel={hotel} index={i} />
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
