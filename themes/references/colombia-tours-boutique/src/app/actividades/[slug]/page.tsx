"use client";

import { motion } from "framer-motion";
import { Check, X, Clock, Users, MapPin } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";


const included = [
  "Guía bilingüe",
  "Transporte",
  "Entradas",
];

const notIncluded = [
  "Almuerzo",
  "Propinas",
];

const recommendations = [
  "Ropa cómoda y calzado para caminar",
  "Protector solar y gorra",
  "Punto de encuentro: Hotel Intercontinental, lobby",
];

const rates = [
  { label: "Adulto", price: "$45" },
  { label: "Niño (4-11 años)", price: "$25" },
];

const relatedActivities = [
  {
    name: "Tour del Cafe",
    location: "Eje Cafetero",
    image: "https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=600&q=80",
    duration: "6 horas",
    price: "$65",
    slug: "tour-del-cafe",
  },
  {
    name: "Avistamiento de Ballenas",
    location: "Nuqui",
    image: "https://images.unsplash.com/photo-1568430462989-44163eb1752f?w=600&q=80",
    duration: "8 horas",
    price: "$85",
    slug: "avistamiento-ballenas",
  },
  {
    name: "Senderismo Cocora",
    location: "Salento",
    image: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&q=80",
    duration: "5 horas",
    price: "$40",
    slug: "senderismo-cocora",
  },
];

export default function ActivityDetailPage() {
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
                "url('https://images.unsplash.com/photo-1526392060635-9d6019884377?w=1400&q=80')",
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
              variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7 } } }}
              custom={0}
            >
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs backdrop-blur-sm"
                  style={{
                    backgroundColor: "var(--card-badge-bg)",
                    border: "1px solid var(--card-badge-border)",
                    color: "var(--card-badge-text)",
                  }}
                >
                  <Clock size={12} />4 horas
                </span>
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs backdrop-blur-sm"
                  style={{
                    backgroundColor: "var(--card-badge-bg)",
                    border: "1px solid var(--card-badge-border)",
                    color: "var(--card-badge-text)",
                  }}
                >
                  <Users size={12} />Max 12 personas
                </span>
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs backdrop-blur-sm"
                  style={{
                    backgroundColor: "var(--card-badge-bg)",
                    border: "1px solid var(--card-badge-border)",
                    color: "var(--card-badge-text)",
                  }}
                >
                  <MapPin size={12} />Medellín
                </span>
              </div>
              <h1
                className="font-display"
                style={{
                  fontSize: "var(--text-display-md)",
                  color: "var(--text-heading)",
                }}
              >
                City Tour Medellín
              </h1>
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
              href="/actividades"
              className="hover:underline"
              style={{ color: "var(--text-muted)" }}
            >
              Actividades
            </a>
            <span className="mx-2">/</span>
            <span style={{ color: "var(--accent)" }}>City Tour Medellín</span>
          </nav>
          <a
            href="/actividades"
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider mt-3"
            style={{ color: "var(--accent)" }}
          >
            ← Volver a actividades
          </a>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 pb-24">
          <div className="max-w-3xl space-y-16">
            {/* Description */}
            <motion.section
              aria-label="Descripción"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7 } } }}
              custom={0.1}
            >
              <h2
                className="font-display text-2xl mb-6"
                style={{ color: "var(--text-heading)" }}
              >
                Descripción
              </h2>
              <p
                className="font-sans leading-relaxed mb-4"
                style={{ color: "var(--text-secondary)" }}
              >
                Descubre la transformación de Medellín en este recorrido guiado
                por los barrios más emblemáticos de la ciudad. Desde el centro
                histórico hasta la Comuna 13, conocerás de primera mano la
                historia de resiliencia y creatividad que convirtió a esta
                ciudad en un referente de innovación urbana en América Latina.
              </p>
              <p
                className="font-sans leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Visitarás el Parque de las Luces, la Plaza Botero, el Metro de
                Medellín, y las famosas escaleras eléctricas de la Comuna 13
                decoradas con vibrantes murales de arte callejero. Tu guía local
                compartirá anécdotas, recomendaciones gastronómicas y datos
                históricos que no encontrarás en ninguna guía turística.
              </p>
            </motion.section>

            {/* What's included */}
            <motion.section
              aria-label="Qué incluye"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7 } } }}
              custom={0.15}
            >
              <h2
                className="font-display text-2xl mb-6"
                style={{ color: "var(--text-heading)" }}
              >
                Qué incluye
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
                    {included.map((item) => (
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
                    {notIncluded.map((item) => (
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

            {/* Recommendations */}
            <motion.section
              aria-label="Recomendaciones"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7 } } }}
              custom={0.2}
            >
              <h2
                className="font-display text-2xl mb-6"
                style={{ color: "var(--text-heading)" }}
              >
                Recomendaciones
              </h2>
              <ul className="space-y-3">
                {recommendations.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      className="mt-2 w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: "var(--accent)" }}
                    />
                    <span
                      className="font-sans text-sm leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.section>

            {/* Rates */}
            <motion.section
              aria-label="Tarifas"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7 } } }}
              custom={0.25}
            >
              <h2
                className="font-display text-2xl mb-6"
                style={{ color: "var(--text-heading)" }}
              >
                Tarifas
              </h2>
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {rates.map((rate, i) => (
                  <div
                    key={rate.label}
                    className="flex items-center justify-between px-6 py-4"
                    style={{
                      backgroundColor: "var(--bg-card)",
                      borderTop:
                        i > 0 ? "1px solid var(--border-subtle)" : undefined,
                    }}
                  >
                    <span
                      className="font-sans text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {rate.label}
                    </span>
                    <span
                      className="font-display text-xl"
                      style={{ color: "var(--accent)" }}
                    >
                      {rate.price}
                    </span>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* CTA */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7 } } }}
              custom={0.3}
            >
              <button
                className="w-full sm:w-auto px-10 py-4 rounded-xl font-sans font-medium text-sm tracking-wide transition-colors cursor-pointer"
                style={{
                  backgroundColor: "var(--accent)",
                  color: "var(--accent-text)",
                }}
              >
                Reservar actividad
              </button>
            </motion.div>
          </div>

          {/* Related Activities */}
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7 } } }}
            custom={0.1}
            className="mt-24"
          >
            <h2
              className="font-display text-2xl mb-8"
              style={{ color: "var(--text-heading)" }}
            >
              Actividades Relacionadas
            </h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {relatedActivities.map((activity, i) => (
                <motion.a
                  key={activity.slug}
                  href={`/actividades/${activity.slug}`}
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
                      style={{ backgroundImage: `url('${activity.image}')` }}
                    />
                    <div
                      className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full backdrop-blur-sm font-mono text-[10px]"
                      style={{
                        backgroundColor: "var(--card-badge-bg)",
                        border: "1px solid var(--card-badge-border)",
                        color: "var(--card-badge-text)",
                      }}
                    >
                      <Clock size={10} />
                      {activity.duration}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3
                      className="font-display text-lg leading-tight mb-1"
                      style={{ color: "var(--text-heading)" }}
                    >
                      {activity.name}
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
                        {activity.location}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className="font-display text-lg"
                        style={{ color: "var(--accent)" }}
                      >
                        {activity.price}
                      </span>
                      <span
                        className="font-mono text-[10px] uppercase tracking-wider"
                        style={{ color: "var(--accent)" }}
                      >
                        Ver Actividad →
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
