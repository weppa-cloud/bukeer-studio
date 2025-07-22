"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { MapPin, Users, Calendar, ArrowRight } from "lucide-react"

const destinations = [
  {
    id: 1,
    name: "Cartagena",
    description: "Ciudad amurallada colonial con playas caribeñas",
    image: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800",
    tours: 28,
    duration: "3-5 días",
    bestTime: "Todo el año",
    link: "/destinos/cartagena",
    featured: true
  },
  {
    id: 2,
    name: "San Andrés",
    description: "Isla paradisíaca con mar de siete colores",
    image: "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800",
    tours: 15,
    duration: "4-6 días",
    bestTime: "Ene-Sep",
    link: "/destinos/san-andres"
  },
  {
    id: 3,
    name: "Amazonas",
    description: "Selva tropical y culturas indígenas",
    image: "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=800",
    tours: 12,
    duration: "5-7 días",
    bestTime: "Jun-Nov",
    link: "/destinos/amazonas"
  },
  {
    id: 4,
    name: "Eje Cafetero",
    description: "Paisaje cultural cafetero y pueblos coloridos",
    image: "https://images.unsplash.com/photo-1606914501449-5a96b6ce24ca?w=800",
    tours: 20,
    duration: "3-4 días",
    bestTime: "Todo el año",
    link: "/destinos/eje-cafetero"
  },
  {
    id: 5,
    name: "Tayrona",
    description: "Playas vírgenes entre selva y mar",
    image: "https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=800",
    tours: 18,
    duration: "2-3 días",
    bestTime: "Dic-Mar",
    link: "/destinos/tayrona"
  },
  {
    id: 6,
    name: "Guatapé",
    description: "Pueblo colorido y piedra del Peñol",
    image: "https://images.unsplash.com/photo-1597036845321-7c5b86a874f1?w=800",
    tours: 10,
    duration: "1-2 días",
    bestTime: "Todo el año",
    link: "/destinos/guatape"
  }
];

export default function PopularDestinationsTourM() {
  return (
    <section className="py-20 bg-neutral-light/30">
      <div className="container">
        {/* Section Header */}
        <div className="text-center mb-12">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-brand-emerald font-medium mb-2"
          >
            DESTINOS POPULARES
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-display font-bold text-neutral-charcoal mb-4"
          >
            Los Lugares Más Increíbles de Colombia
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-neutral-medium max-w-2xl mx-auto"
          >
            Desde playas caribeñas hasta selvas amazónicas, descubre la diversidad 
            y belleza de nuestros destinos más solicitados
          </motion.p>
        </div>

        {/* Destinations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.map((destination, index) => (
            <motion.div
              key={destination.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={destination.featured ? "md:col-span-2 lg:col-span-1" : ""}
            >
              <Link href={destination.link}>
                <div className="group relative overflow-hidden rounded-2xl h-[400px] cursor-pointer">
                  {/* Image */}
                  <Image
                    src={destination.image}
                    alt={destination.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  
                  {/* Content */}
                  <div className="absolute inset-0 p-6 flex flex-col justify-end">
                    {/* Destination Name */}
                    <h3 className="text-3xl font-display font-bold text-white mb-2 group-hover:text-colombia-yellow transition-colors">
                      {destination.name}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-white/90 mb-4">
                      {destination.description}
                    </p>
                    
                    {/* Info Grid */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-colombia-yellow" />
                        <span className="text-sm text-white/80">{destination.tours} Tours</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-colombia-yellow" />
                        <span className="text-sm text-white/80">{destination.duration}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-colombia-yellow" />
                        <span className="text-sm text-white/80">{destination.bestTime}</span>
                      </div>
                    </div>
                    
                    {/* CTA */}
                    <div className="flex items-center gap-2 text-white group-hover:text-colombia-yellow transition-colors">
                      <span className="font-medium">Explorar destino</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                  
                  {/* Featured Badge */}
                  {destination.featured && (
                    <div className="absolute top-4 right-4 bg-colombia-yellow text-neutral-charcoal px-3 py-1 rounded-full text-sm font-semibold">
                      Más Popular
                    </div>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Link href="/destinos">
            <button className="inline-flex items-center gap-2 px-8 py-4 bg-white border-2 border-neutral-light rounded-full font-semibold text-neutral-charcoal hover:border-brand-emerald hover:text-brand-emerald transition-all group">
              Ver todos los destinos
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}