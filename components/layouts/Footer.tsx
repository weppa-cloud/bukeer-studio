"use client"

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Phone, 
  Mail, 
  MapPin, 
  Instagram, 
  Facebook, 
  Youtube,
  MessageCircle,
  Shield,
  Award,
  Clock
} from "lucide-react";

const quickLinks = [
  { name: "Destinos", href: "/destinos" },
  { name: "Itinerarios", href: "/itinerarios" },
  { name: "Hoteles", href: "/hoteles" },
  { name: "Experiencias", href: "/actividades" },
];

const company = [
  { name: "Sobre Nosotros", href: "/sobre-nosotros" },
  { name: "Nuestro Equipo", href: "/equipo" },
  { name: "Sostenibilidad", href: "/sostenibilidad" },
  { name: "Prensa", href: "/prensa" },
];

const support = [
  { name: "Centro de Ayuda", href: "/ayuda" },
  { name: "Política de Cancelación", href: "/politicas" },
  { name: "Términos y Condiciones", href: "/terminos" },
  { name: "Privacidad", href: "/privacidad" },
];

const destinations = [
  { name: "Cartagena", href: "/destinos/cartagena" },
  { name: "San Andrés", href: "/destinos/san-andres" },
  { name: "Medellín", href: "/destinos/medellin" },
  { name: "Eje Cafetero", href: "/destinos/eje-cafetero" },
];

export default function Footer() {
  return (
    <footer className="bg-neutral-charcoal text-white">
      {/* Newsletter Section */}
      <div className="border-b border-white/10">
        <div className="container py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-display font-bold mb-2">
                Inspírate para tu Próximo Viaje
              </h3>
              <p className="text-white/70">
                Recibe ofertas exclusivas, destinos secretos y consejos de viaje 
                de nuestros expertos en turismo de lujo
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Tu email"
                className="flex-1 px-4 py-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-colombia-yellow"
              />
              <Button variant="colombia" className="whitespace-nowrap">
                Suscribirse
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center space-x-1 mb-6">
              <span className="text-2xl font-display font-bold text-colombia-yellow">
                Colombia
              </span>
              <span className="text-2xl font-display font-bold text-brand-emerald">
                Tours
              </span>
            </Link>
            
            <p className="text-white/70 mb-6 leading-relaxed">
              Especialistas en viajes de lujo por Colombia. Creamos experiencias 
              únicas e inolvidables para familias exigentes que buscan lo mejor 
              del país más acogedor del mundo.
            </p>

            {/* Trust Indicators */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-brand-emerald" />
                <span className="text-sm text-white/70">100% Seguro</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-colombia-yellow" />
                <span className="text-sm text-white/70">Certificado</span>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-colombia-yellow" />
                <span className="text-sm text-white/90">+57 (300) 123-4567</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-colombia-yellow" />
                <span className="text-sm text-white/90">info@colombiatours.travel</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-colombia-yellow" />
                <span className="text-sm text-white/90">Cartagena, Colombia</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-colombia-yellow" />
                <span className="text-sm text-white/90">24/7 Soporte</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-bold mb-4">Viajes</h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href} 
                    className="text-white/70 hover:text-colombia-yellow transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Destinations */}
          <div>
            <h4 className="font-display font-bold mb-4">Destinos</h4>
            <ul className="space-y-3">
              {destinations.map((dest) => (
                <li key={dest.name}>
                  <Link 
                    href={dest.href} 
                    className="text-white/70 hover:text-colombia-yellow transition-colors text-sm"
                  >
                    {dest.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display font-bold mb-4">Empresa</h4>
            <ul className="space-y-3">
              {company.map((item) => (
                <li key={item.name}>
                  <Link 
                    href={item.href} 
                    className="text-white/70 hover:text-colombia-yellow transition-colors text-sm"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-display font-bold mb-4">Soporte</h4>
            <ul className="space-y-3">
              {support.map((item) => (
                <li key={item.name}>
                  <Link 
                    href={item.href} 
                    className="text-white/70 hover:text-colombia-yellow transition-colors text-sm"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="bg-gradient-to-r from-colombia-blue to-brand-emerald rounded-2xl p-6 md:p-8">
            <div className="text-center">
              <h3 className="text-xl md:text-2xl font-display font-bold mb-2">
                ¿Listo para tu Próxima Aventura?
              </h3>
              <p className="text-white/90 mb-6">
                Habla con nuestros expertos y diseña el viaje perfecto para tu familia
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="colombia" size="lg" className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Hablar con Asesor
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="bg-white/10 backdrop-blur-sm text-white border-white hover:bg-white hover:text-neutral-charcoal"
                >
                  Ver Destinos
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-white/60">
              © 2025 Colombia Tours. Todos los derechos reservados. | RNT: 12345 | NIT: 900.123.456-7
            </div>
            
            {/* Social Links */}
            <div className="flex items-center gap-4">
              <Link 
                href="#" 
                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-colombia-yellow hover:text-neutral-charcoal transition-colors"
              >
                <Instagram className="h-4 w-4" />
              </Link>
              <Link 
                href="#" 
                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-colombia-yellow hover:text-neutral-charcoal transition-colors"
              >
                <Facebook className="h-4 w-4" />
              </Link>
              <Link 
                href="#" 
                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-colombia-yellow hover:text-neutral-charcoal transition-colors"
              >
                <Youtube className="h-4 w-4" />
              </Link>
              <Link 
                href="#" 
                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-brand-emerald hover:text-white transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}