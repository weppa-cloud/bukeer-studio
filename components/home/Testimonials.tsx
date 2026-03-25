"use client"

import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

const testimonials = [
  {
    id: 1,
    name: "María Elena Rodríguez",
    location: "Familia de 4, Madrid",
    rating: 5,
    title: "Experiencia Inolvidable en Cartagena",
    content: "Colombia Tours superó todas nuestras expectativas. Desde el hotel boutique hasta las experiencias privadas en la ciudad amurallada, cada detalle fue perfecto. Nuestros hijos no pararon de hablar del tour privado en las murallas.",
    image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?q=80&w=1000",
    trip: "Cartagena Colonial de Lujo",
    date: "Diciembre 2024",
    verified: true,
  },
  {
    id: 2,
    name: "James & Sarah Thompson",
    location: "Familia de 5, Londres",
    rating: 5,
    title: "Aventura Amazónica Excepcional",
    content: "Never thought our teenagers would be so engaged with nature! The private guide was incredibly knowledgeable and the eco-lodge was luxurious yet authentic. The night sounds of the Amazon will stay with us forever.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=1000",
    trip: "Amazonas Expedición VIP",
    date: "Noviembre 2024",
    verified: true,
  },
  {
    id: 3,
    name: "Sophie & Laurent Dubois",
    location: "Pareja, París",
    rating: 5,
    title: "Romance Caribeño en San Andrés",
    content: "Notre voyage de noces a été magique. L'île de San Andrés avec ses eaux turquoise et le service personnalisé de Colombia Tours ont fait de ce voyage le plus beau de notre vie. Merci pour ces souvenirs précieux!",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000",
    trip: "San Andrés Exclusivo",
    date: "Octubre 2024",
    verified: true,
  },
];

const stats = [
  { number: "1,200+", label: "Familias Felices" },
  { number: "98%", label: "Satisfacción" },
  { number: "4.9", label: "Rating Promedio" },
  { number: "24/7", label: "Soporte" },
];

export default function Testimonials() {
  return (
    <section className="section-padding bg-white">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-neutral-charcoal mb-6">
            Historias que nos Inspiran
          </h2>
          <p className="text-lg text-neutral-medium max-w-3xl mx-auto">
            Cada familia que viaja con nosotros se convierte en una historia de éxito. 
            Descubre por qué somos la elección favorita para viajes de lujo en Colombia
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold font-display text-colombia-blue mb-2">
                {stat.number}
              </div>
              <div className="text-neutral-medium font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="group border-0 luxury-shadow card-hover">
              <CardContent className="p-6">
                {/* Quote Icon */}
                <div className="mb-4">
                  <Quote className="h-8 w-8 text-colombia-yellow" />
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-colombia-yellow text-colombia-yellow" />
                  ))}
                </div>

                {/* Title */}
                <h3 className="font-display font-bold text-lg text-neutral-charcoal mb-3">
                  {testimonial.title}
                </h3>

                {/* Content */}
                <p className="text-neutral-medium text-sm leading-relaxed mb-6">
                  &ldquo;{testimonial.content}&rdquo;
                </p>

                {/* Trip Info */}
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="emerald" className="text-xs">
                    {testimonial.trip}
                  </Badge>
                  <span className="text-xs text-neutral-medium">
                    {testimonial.date}
                  </span>
                </div>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden">
                    <Image
                      src={testimonial.image}
                      alt={testimonial.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-neutral-charcoal text-sm">
                        {testimonial.name}
                      </h4>
                      {testimonial.verified && (
                        <Badge variant="outline" className="text-xs px-2 py-0">
                          ✓ Verificado
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-neutral-medium">
                      {testimonial.location}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="bg-brand-sand/50 rounded-2xl p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-display font-bold text-neutral-charcoal mb-2">
                Reconocimientos
              </h3>
              <p className="text-neutral-medium">
                Certificados por las mejores organizaciones de turismo
              </p>
            </div>
            
            <div className="flex justify-center items-center gap-6 opacity-60">
              <div className="text-center">
                <div className="w-16 h-16 bg-neutral-medium/20 rounded-lg flex items-center justify-center mb-2">
                  <span className="text-xs font-bold">TripAdvisor</span>
                </div>
                <div className="text-xs text-neutral-medium">Travelers&apos; Choice</div>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-neutral-medium/20 rounded-lg flex items-center justify-center mb-2">
                  <span className="text-xs font-bold">IATA</span>
                </div>
                <div className="text-xs text-neutral-medium">Certified Agent</div>
              </div>
            </div>
            
            <div className="text-center md:text-right">
              <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full">
                <Star className="h-5 w-5 fill-colombia-yellow text-colombia-yellow" />
                <span className="font-bold text-neutral-charcoal">4.9/5</span>
                <span className="text-sm text-neutral-medium">en Google</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}