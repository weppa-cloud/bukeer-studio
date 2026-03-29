"use client";

import { motion } from "framer-motion";
import { MapPin, Star, Check, X, Shield, Clock, Headphones } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";


const amenities = [
  { emoji: "🏊", label: "Pool" },
  { emoji: "📶", label: "WiFi" },
  { emoji: "🅿️", label: "Parking" },
  { emoji: "🍽️", label: "Restaurant" },
  { emoji: "💆", label: "Spa" },
  { emoji: "🍸", label: "Bar" },
  { emoji: "🏋️", label: "Gym" },
  { emoji: "🛎️", label: "Room Service" },
];

const includes = [
  "Desayuno buffet",
  "Acceso a la piscina",
  "WiFi de alta velocidad",
  "Servicio de concierge",
];

const excludes = [
  "Traslado aeropuerto",
  "Excursiones externas",
  "Minibar",
];

const galleryImages = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80",
  "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80",
];

const relatedHotels = [
  {
    name: "Casa San Agustín",
    location: "Cartagena",
    image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80",
    price: "$220/noche",
    rating: 5,
    slug: "casa-san-agustin",
  },
  {
    name: "Hotel Dann Carlton",
    location: "Bogotá",
    image: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&q=80",
    price: "$150/noche",
    rating: 4,
    slug: "hotel-dann-carlton",
  },
  {
    name: "Selina Medellín",
    location: "Medellín",
    image: "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=600&q=80",
    price: "$95/noche",
    rating: 4,
    slug: "selina-medellin",
  },
];

export default function HotelDetailPage() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:font-sans focus:text-sm"
        style={{ backgroundColor: "var(--accent)", color: "var(--accent-text)" }}
      >
        Saltar al contenido principal
      </a>
      <SiteHeader />
      <main id="main-content">
        {/* Hero */}
        <section
          className="relative flex items-end"
          style={{ height: "50vh", minHeight: 400 }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1400&q=80')",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, var(--bg) 0%, transparent 60%)",
            }}
          />
          <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pb-10">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
              custom={0}
            >
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className="text-sand-400 fill-sand-400"
                  />
                ))}
              </div>
              <h1
                className="font-display"
                style={{
                  fontSize: "var(--text-display-md)",
                  color: "var(--text-heading)",
                }}
              >
                Ananda Hotel Boutique
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <MapPin size={16} style={{ color: "var(--accent)" }} />
                <span
                  className="font-sans text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Cartagena, Colombia
                </span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-6 py-4">
          <nav
            className="font-mono text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            <a
              href="/"
              className="hover:underline"
              style={{ color: "var(--text-muted)" }}
            >
              Inicio
            </a>
            <span className="mx-2">/</span>
            <a
              href="/hoteles"
              className="hover:underline"
              style={{ color: "var(--text-muted)" }}
            >
              Hoteles
            </a>
            <span className="mx-2">/</span>
            <span style={{ color: "var(--accent)" }}>Ananda</span>
          </nav>
          <a
            href="/hoteles"
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider mt-3"
            style={{ color: "var(--accent)" }}
          >
            ← Volver a hoteles
          </a>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 pb-24">
          <div className="grid gap-10 lg:grid-cols-3">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-16">
              {/* Description */}
              <motion.section
                aria-label="Sobre el Hotel"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
                custom={0.1}
              >
                <h2
                  className="font-display text-2xl mb-6"
                  style={{ color: "var(--text-heading)" }}
                >
                  Sobre el Hotel
                </h2>
                <p
                  className="font-sans leading-relaxed mb-4"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Ananda Hotel Boutique es un refugio de lujo ubicado en el
                  corazón del centro histórico de Cartagena. Con una arquitectura
                  colonial restaurada con meticuloso detalle, el hotel combina la
                  elegancia del siglo XVII con todas las comodidades modernas que
                  un viajero exigente necesita.
                </p>
                <p
                  className="font-sans leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Cada una de sus 20 habitaciones ha sido diseñada de manera
                  única, con obras de artistas locales y textiles artesanales.
                  Desde la terraza del rooftop podrás disfrutar de vistas
                  panorámicas a la ciudad amurallada mientras saboreas un cóctel
                  de autor inspirado en los sabores del Caribe colombiano.
                </p>
              </motion.section>

              {/* Amenities */}
              <motion.section
                aria-label="Amenidades"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
                custom={0.15}
              >
                <h2
                  className="font-display text-2xl mb-6"
                  style={{ color: "var(--text-heading)" }}
                >
                  Amenidades
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {amenities.map((a) => (
                    <div
                      key={a.label}
                      className="flex flex-col items-center gap-2 py-5 rounded-xl text-center"
                      style={{
                        backgroundColor: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <span className="text-2xl">{a.emoji}</span>
                      <span
                        className="font-sans text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {a.label}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.section>

              {/* Gallery */}
              <motion.section
                aria-label="Galería"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
                custom={0.2}
              >
                <h2
                  className="font-display text-2xl mb-6"
                  style={{ color: "var(--text-heading)" }}
                >
                  Galería
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {galleryImages.map((src, i) => (
                    <div
                      key={i}
                      className="relative rounded-xl overflow-hidden"
                      style={{ aspectRatio: "4/3" }}
                    >
                      <img
                        src={src}
                        alt={`Ananda Hotel galería ${i + 1}`}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </motion.section>

              {/* Includes / Excludes */}
              <motion.section
                aria-label="Incluye y no incluye"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
                custom={0.25}
              >
                <h2
                  className="font-display text-2xl mb-6"
                  style={{ color: "var(--text-heading)" }}
                >
                  Incluye / No incluye
                </h2>
                <div className="grid sm:grid-cols-2 gap-8">
                  <div>
                    <h3
                      className="font-sans font-medium text-sm uppercase tracking-wider mb-4"
                      style={{ color: "var(--text-heading)" }}
                    >
                      Incluye
                    </h3>
                    <ul className="space-y-3">
                      {includes.map((item) => (
                        <li key={item} className="flex items-center gap-3">
                          <Check
                            size={16}
                            className="shrink-0"
                            style={{ color: "#217a45" }}
                          />
                          <span
                            className="font-sans text-sm"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3
                      className="font-sans font-medium text-sm uppercase tracking-wider mb-4"
                      style={{ color: "var(--text-heading)" }}
                    >
                      No incluye
                    </h3>
                    <ul className="space-y-3">
                      {excludes.map((item) => (
                        <li key={item} className="flex items-center gap-3">
                          <X
                            size={16}
                            className="shrink-0"
                            style={{ color: "#dc2626" }}
                          />
                          <span
                            className="font-sans text-sm"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.section>
            </div>

            {/* Right Column — Sticky Price Card */}
            <div>
              <div className="lg:sticky lg:top-28">
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
                  custom={0.2}
                  className="rounded-2xl p-6 space-y-5"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div>
                    <span
                      className="font-mono text-xs uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Desde
                    </span>
                    <div
                      className="font-display text-3xl mt-1"
                      style={{ color: "var(--accent)" }}
                    >
                      $180
                      <span
                        className="font-sans text-base"
                        style={{ color: "var(--text-muted)" }}
                      >
                        /noche
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className="text-sand-400 fill-sand-400"
                      />
                    ))}
                    <span
                      className="font-sans text-xs ml-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      5.0 (128 reseñas)
                    </span>
                  </div>

                  <div
                    className="h-px"
                    style={{ backgroundColor: "var(--border-subtle)" }}
                  />

                  <button
                    className="w-full py-3.5 rounded-xl font-sans font-medium text-sm tracking-wide transition-colors cursor-pointer"
                    style={{
                      backgroundColor: "var(--accent)",
                      color: "var(--accent-text)",
                    }}
                  >
                    Cotizar
                  </button>

                  <div
                    className="h-px"
                    style={{ backgroundColor: "var(--border-subtle)" }}
                  />

                  <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                      <Shield
                        size={16}
                        style={{ color: "var(--text-muted)" }}
                      />
                      <span
                        className="font-sans text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Pago seguro
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Clock
                        size={16}
                        style={{ color: "var(--text-muted)" }}
                      />
                      <span
                        className="font-sans text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Cancelación 48h
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Headphones
                        size={16}
                        style={{ color: "var(--text-muted)" }}
                      />
                      <span
                        className="font-sans text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Soporte 24/7
                      </span>
                    </li>
                  </ul>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Related Hotels */}
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
            custom={0.1}
            className="mt-24"
          >
            <h2
              className="font-display text-2xl mb-8"
              style={{ color: "var(--text-heading)" }}
            >
              Hoteles Relacionados
            </h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {relatedHotels.map((hotel, i) => (
                <motion.a
                  key={hotel.slug}
                  href={`/hoteles/${hotel.slug}`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{
                    delay: i * 0.1,
                    duration: 0.6,
                    ease: "easeOut",
                  }}
                  whileHover={{ y: -4 }}
                  className="group block rounded-2xl overflow-hidden"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div
                    className="relative overflow-hidden"
                    style={{ aspectRatio: "16/10" }}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                      style={{ backgroundImage: `url('${hotel.image}')` }}
                    />
                    <div
                      className="absolute top-3 right-3 flex items-center gap-0.5 px-2 py-1 rounded-full backdrop-blur-sm"
                      style={{
                        backgroundColor: "var(--card-badge-bg)",
                        border: "1px solid var(--card-badge-border)",
                      }}
                    >
                      {Array.from({ length: hotel.rating }).map((_, j) => (
                        <Star
                          key={j}
                          size={10}
                          className="text-sand-400 fill-sand-400"
                        />
                      ))}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3
                      className="font-display text-lg leading-tight mb-1"
                      style={{ color: "var(--text-heading)" }}
                    >
                      {hotel.name}
                    </h3>
                    <div className="flex items-center gap-1 mb-3">
                      <MapPin
                        size={12}
                        style={{ color: "var(--text-muted)" }}
                      />
                      <span
                        className="font-sans text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {hotel.location}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className="font-display text-lg"
                        style={{ color: "var(--accent)" }}
                      >
                        {hotel.price}
                      </span>
                      <span
                        className="font-mono text-[10px] uppercase tracking-wider"
                        style={{ color: "var(--accent)" }}
                      >
                        Ver Hotel →
                      </span>
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>
          </motion.section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
