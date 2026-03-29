"use client";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { ListingHero } from "@/components/ListingHero";
import { PackageCard, type Package } from "@/components/PackageCard";

const PACKAGES: Package[] = [
  {
    id: "1",
    name: "Colombia Ritmo y Sabor",
    image: "https://images.unsplash.com/photo-1583531352515-8884af319dc1?w=600&q=75",
    destination: "Cali → Medellín → Cartagena",
    duration: "11 días",
    price: "$1,800 USD",
    highlights: ["Alojamiento 4★", "Vuelos internos", "Guía bilingüe"],
    category: "Popular",
    slug: "ritmo-sabor",
  },
  {
    id: "2",
    name: "Colombia Esencia",
    image: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=600&q=75",
    destination: "Santa Marta → Eje Cafetero → Medellín",
    duration: "12 días",
    price: "$2,300 USD",
    highlights: ["Hotel 4-5★", "Tayrona", "Valle del Cocora"],
    category: "Premium",
    slug: "esencia",
  },
  {
    id: "3",
    name: "Colombia Corazón",
    image: "https://images.unsplash.com/photo-1599493782928-55120e5e8e67?w=600&q=75",
    destination: "Cartagena → Cali → Medellín → Bogotá",
    duration: "15 días",
    price: "$3,000 USD",
    highlights: ["Hotel 5★", "Todos los vuelos", "Experiencia completa"],
    category: "Exclusivo",
    slug: "corazon",
  },
  {
    id: "4",
    name: "Caño Cristales",
    image: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=600&q=75",
    destination: "Villavicencio → La Macarena",
    duration: "4 días",
    price: "$950 USD",
    highlights: ["Vuelo chárter", "Guía experto", "Senderos exclusivos"],
    category: "Aventura",
    slug: "cano-cristales",
  },
  {
    id: "5",
    name: "San Andrés Paradise",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=75",
    destination: "San Andrés → Providencia",
    duration: "5 días",
    price: "$680 USD",
    highlights: ["Resort all-inclusive", "Snorkel", "Isla tour"],
    category: "Playa",
    slug: "san-andres-paradise",
  },
  {
    id: "6",
    name: "Amazonas Safari",
    image: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=600&q=75",
    destination: "Leticia → Puerto Nariño",
    duration: "6 días",
    price: "$1,400 USD",
    highlights: ["Lodge en la selva", "Avistamiento fauna", "Comunidades indígenas"],
    category: "Naturaleza",
    slug: "amazonas-safari",
  },
];

export default function PaquetesPage() {
  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-sand-400 focus:text-stone-950 focus:font-medium focus:text-sm">
        Ir al contenido principal
      </a>
      <SiteHeader />
      <main id="main-content">
        <ListingHero
          eyebrow="Paquetes"
          title="Viajes diseñados por expertos"
          subtitle="Experiencias completas personalizables a tu medida"
        />

        {/* Grid */}
        <section className="pb-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {PACKAGES.map((pkg, i) => (
                <PackageCard key={pkg.id} pkg={pkg} index={i} />
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
