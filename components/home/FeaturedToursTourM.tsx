"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Clock,
  Users,
  Star,
  MapPin,
  Heart,
  TrendingUp,
  Shield,
  Zap
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

const tours = [
  {
    id: 1,
    name: "Cartagena: Historia y Playa VIP",
    destination: "Cartagena",
    duration: "4 días",
    groupSize: "Max 10",
    price: 3890000,
    originalPrice: 4890000,
    discount: 20,
    rating: 4.9,
    reviews: 234,
    image: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800",
    badges: ["Más vendido", "Todo incluido"],
    features: ["Guía experto", "Hotel 5★", "Transporte privado"],
    nextDeparture: "En 3 días",
    spotsLeft: 3
  },
  {
    id: 2,
    name: "Aventura Amazónica Premium",
    destination: "Amazonas",
    duration: "6 días",
    groupSize: "Max 8",
    price: 5290000,
    originalPrice: 6590000,
    discount: 20,
    rating: 4.8,
    reviews: 189,
    image: "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=800",
    badges: ["Aventura", "Eco-friendly"],
    features: ["Lodge ecológico", "Actividades únicas", "Comidas gourmet"],
    nextDeparture: "Próxima semana",
    spotsLeft: 5
  },
  {
    id: 3,
    name: "San Andrés: Paraíso Caribeño",
    destination: "San Andrés",
    duration: "5 días",
    groupSize: "Max 12",
    price: 4590000,
    originalPrice: 5290000,
    discount: 15,
    rating: 4.9,
    reviews: 312,
    image: "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800",
    badges: ["Playa", "Relax"],
    features: ["Resort todo incluido", "Deportes acuáticos", "Spa"],
    nextDeparture: "Todos los sábados",
    spotsLeft: 8
  },
  {
    id: 4,
    name: "Eje Cafetero Cultural",
    destination: "Armenia",
    duration: "3 días",
    groupSize: "Max 15",
    price: 2190000,
    originalPrice: 2890000,
    discount: 25,
    rating: 4.7,
    reviews: 156,
    image: "https://images.unsplash.com/photo-1606914501449-5a96b6ce24ca?w=800",
    badges: ["Cultural", "Gastronómico"],
    features: ["Hacienda cafetera", "Cata de café", "Senderismo"],
    nextDeparture: "Este fin de semana",
    spotsLeft: 12
  }
];

export default function FeaturedToursTourM() {
  return (
    <section className="py-20 bg-white">
      <div className="container">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-brand-emerald font-medium mb-2"
            >
              TOURS DESTACADOS
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-4xl font-display font-bold text-neutral-charcoal mb-4"
            >
              Experiencias Más Populares
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-neutral-medium max-w-2xl"
            >
              Tours seleccionados por nuestros expertos con las mejores 
              valoraciones de nuestros viajeros
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <Link href="/tours">
              <Button variant="outline" className="group">
                Ver todos los tours
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Tours Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tours.map((tour, index) => (
            <motion.div
              key={tour.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="group h-full border-0 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
                {/* Image Container */}
                <div className="relative h-56 overflow-hidden">
                  <Image
                    src={tour.image}
                    alt={tour.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {/* Discount Badge */}
                  {tour.discount > 0 && (
                    <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      -{tour.discount}%
                    </div>
                  )}
                  
                  {/* Wishlist Button */}
                  <button className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors group/heart">
                    <Heart className="h-5 w-5 text-neutral-charcoal group-hover/heart:text-red-500 transition-colors" />
                  </button>
                  
                  {/* Spots Left */}
                  {tour.spotsLeft < 5 && (
                    <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium text-neutral-charcoal">
                        ¡Solo {tour.spotsLeft} cupos!
                      </span>
                    </div>
                  )}
                  
                  {/* Next Departure */}
                  <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1 text-white text-xs">
                    {tour.nextDeparture}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {tour.badges.map((badge, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {badge}
                      </Badge>
                    ))}
                  </div>

                  {/* Title and Destination */}
                  <h3 className="font-semibold text-lg text-neutral-charcoal mb-2 line-clamp-2 group-hover:text-brand-emerald transition-colors">
                    {tour.name}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-sm text-neutral-medium mb-3">
                    <MapPin className="h-4 w-4" />
                    <span>{tour.destination}</span>
                  </div>

                  {/* Tour Details */}
                  <div className="flex items-center gap-4 text-sm text-neutral-medium mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{tour.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{tour.groupSize}</span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-1 mb-4">
                    {tour.features.slice(0, 2).map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-neutral-medium">
                        <Shield className="h-3 w-3 text-brand-emerald" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-colombia-yellow text-colombia-yellow" />
                      <span className="font-semibold text-neutral-charcoal">{tour.rating}</span>
                    </div>
                    <span className="text-sm text-neutral-medium">({tour.reviews} reseñas)</span>
                  </div>

                  {/* Price and CTA */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <p className="text-xs text-neutral-medium">Desde</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-neutral-charcoal">
                          ${tour.price.toLocaleString('es-CO')}
                        </span>
                        {tour.originalPrice && (
                          <span className="text-sm text-neutral-medium line-through">
                            ${tour.originalPrice.toLocaleString('es-CO')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-medium">por persona</p>
                    </div>
                    <Link href={`/tours/${tour.id}`}>
                      <Button size="sm" className="bg-brand-emerald hover:bg-brand-emerald/90">
                        Ver más
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
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
          <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-800 px-4 py-2 rounded-full">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">
              Los precios suben en temporada alta. ¡Reserva ahora y ahorra!
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}