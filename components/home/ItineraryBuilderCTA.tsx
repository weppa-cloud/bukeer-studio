"use client"

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Calendar, Heart, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const steps = [
  {
    icon: MapPin,
    title: "Elige Destinos",
    description: "Selecciona entre los lugares más increíbles de Colombia"
  },
  {
    icon: Calendar,
    title: "Selecciona Fechas",
    description: "Define cuándo quieres vivir tu aventura perfecta"
  },
  {
    icon: Heart,
    title: "Define Preferencias",
    description: "Cuéntanos qué tipo de experiencias amas"
  },
];

export default function ItineraryBuilderCTA() {
  return (
    <section className="section-padding bg-gradient-to-br from-brand-sand/30 to-white">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <div className="inline-flex items-center gap-2 bg-colombia-yellow/20 text-colombia-blue px-3 py-1 rounded-full text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Tecnología IA + Experiencia Humana
            </div>
            
            <h2 className="text-3xl md:text-4xl font-display font-bold text-neutral-charcoal mb-4">
              Crea tu Viaje Perfecto en{" "}
              <span className="text-brand-emerald">3 Minutos</span>
            </h2>
            
            <p className="text-lg text-neutral-medium mb-8">
              Nuestra inteligencia artificial, combinada con la experiencia de nuestros 
              expertos locales, diseña el itinerario ideal para tu familia en tiempo real.
            </p>

            {/* Steps */}
            <div className="space-y-4 mb-8">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={index} className="flex items-start gap-4 group">
                    <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center flex-shrink-0 group-hover:bg-brand-emerald/10 transition-colors">
                      <Icon className="h-5 w-5 text-brand-emerald" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-charcoal mb-1">
                        {step.title}
                      </h3>
                      <p className="text-sm text-neutral-medium">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Testimonial */}
            <Card className="border-0 bg-white/80 backdrop-blur-sm luxury-shadow mb-8">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Image
                    src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200"
                    alt="María González"
                    width={48}
                    height={48}
                    className="rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-neutral-charcoal mb-2">
                      "En menos de 5 minutos tenía un itinerario increíble para Cartagena. 
                      La IA capturó perfectamente lo que buscábamos para nuestros hijos."
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-neutral-charcoal">
                        María González
                      </span>
                      <span className="text-xs text-neutral-medium">
                        • Familia de Madrid
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <Link href="/crear-itinerario">
              <Button size="lg" variant="emerald" className="group min-w-[240px]">
                Comenzar Ahora
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {/* Right Visual */}
          <div className="relative">
            {/* Main Preview Card */}
            <Card className="border-0 luxury-shadow transform rotate-2 hover:rotate-0 transition-transform duration-500">
              <CardContent className="p-0">
                <div className="relative h-64 rounded-lg overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800"
                    alt="Preview itinerario Cartagena"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h3 className="font-display font-bold text-lg mb-1">
                      Tu Itinerario Personalizado
                    </h3>
                    <p className="text-sm opacity-90">
                      Cartagena • 4 días • Familia con niños
                    </p>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-medium">Día 1</span>
                      <span className="font-medium text-neutral-charcoal">Centro Histórico</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-medium">Día 2</span>
                      <span className="font-medium text-neutral-charcoal">Islas del Rosario</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-medium">Día 3</span>
                      <span className="font-medium text-neutral-charcoal">Castillo + Playa</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-colombia-yellow rounded-full flex items-center justify-center animate-bounce">
              <Sparkles className="h-6 w-6 text-neutral-charcoal" />
            </div>
            
            <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-brand-emerald rounded-full flex items-center justify-center">
              <Heart className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}