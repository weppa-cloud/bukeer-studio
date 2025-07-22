"use client"

import { MessageCircle, Calendar, Plane } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const steps = [
  {
    step: 1,
    title: "Cuéntanos tu Sueño",
    description: "Comparte con nuestros asesores especializados tus preferencias, fechas y presupuesto. Diseñamos experiencias únicas para cada familia.",
    icon: MessageCircle,
    cta: "Hablar con Asesor",
    image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2070",
  },
  {
    step: 2,
    title: "Recibe tu Itinerario Personalizado",
    description: "En menos de 24 horas tendrás un itinerario detallado con hoteles de lujo, experiencias exclusivas y toda la logística organizada.",
    icon: Calendar,
    cta: "Ver Ejemplo",
    image: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?q=80&w=2072",
  },
  {
    step: 3,
    title: "Vive la Experiencia Perfecta",
    description: "Disfruta de tu viaje sin preocupaciones. Nuestro equipo estará disponible 24/7 para asegurar que cada momento sea perfecto.",
    icon: Plane,
    cta: "Comenzar Viaje",
    image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=2070",
  },
];

export default function HowItWorks() {
  return (
    <section className="section-padding bg-neutral-light/50">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-neutral-charcoal mb-6">
            Cómo Creamos tu Viaje Perfecto
          </h2>
          <p className="text-lg text-neutral-medium max-w-3xl mx-auto">
            Un proceso simple y personalizado que transforma tus sueños de viaje 
            en experiencias extraordinarias, diseñadas específicamente para tu familia
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card key={step.step} className="group relative overflow-hidden border-0 luxury-shadow card-hover">
                {/* Step Number */}
                <div className="absolute top-6 left-6 z-10">
                  <div className="w-12 h-12 bg-colombia-yellow rounded-full flex items-center justify-center">
                    <span className="text-xl font-bold font-display text-neutral-charcoal">
                      {step.step}
                    </span>
                  </div>
                </div>

                {/* Background Image */}
                <div 
                  className="h-48 bg-cover bg-center relative"
                  style={{ backgroundImage: `url(${step.image})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-charcoal/80 via-neutral-charcoal/40 to-transparent" />
                  
                  {/* Icon */}
                  <div className="absolute bottom-6 left-6">
                    <div className="w-14 h-14 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center">
                      <Icon className="h-6 w-6 text-brand-emerald" />
                    </div>
                  </div>
                </div>

                <CardContent className="p-6">
                  <h3 className="text-xl font-display font-bold text-neutral-charcoal mb-3">
                    {step.title}
                  </h3>
                  <p className="text-neutral-medium mb-6 leading-relaxed">
                    {step.description}
                  </p>
                  
                  <Button 
                    variant="outline" 
                    className="w-full group-hover:bg-brand-emerald group-hover:text-white group-hover:border-brand-emerald transition-colors"
                  >
                    {step.cta}
                  </Button>
                </CardContent>

                {/* Connector Line (except last item) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-px bg-gradient-to-r from-colombia-yellow to-brand-emerald z-20">
                    <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-brand-emerald rounded-full border-4 border-white" />
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-colombia-blue to-brand-emerald rounded-2xl p-8 md:p-12 text-white">
          <h3 className="text-2xl md:text-3xl font-display font-bold mb-4">
            ¿Listo para Comenzar tu Aventura?
          </h3>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Nuestros asesores especializados están esperando para diseñar 
            la experiencia perfecta para tu familia
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/crear-itinerario">
              <Button size="lg" variant="colombia" className="min-w-[200px]">
                Diseñar mi Viaje
              </Button>
            </Link>
            <Link href="/contacto">
              <Button 
                size="lg" 
                variant="outline" 
                className="min-w-[200px] bg-white/10 backdrop-blur-sm text-white border-white hover:bg-white hover:text-neutral-charcoal"
              >
                Hablar con un Asesor
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}