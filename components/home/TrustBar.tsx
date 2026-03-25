"use client"

import { Shield, Users, Clock, CreditCard } from "lucide-react";

const trustItems = [
  {
    icon: Users,
    text: "500+ Familias Felices",
    subtext: "Experiencias verificadas"
  },
  {
    icon: Shield,
    text: "Expertos Locales Verificados",
    subtext: "Guías certificados"
  },
  {
    icon: Clock,
    text: "Soporte 24/7",
    subtext: "En tu idioma"
  },
  {
    icon: CreditCard,
    text: "Pagos Seguros",
    subtext: "100% Garantizados"
  },
];

export default function TrustBar() {
  return (
    <section className="py-8 bg-white border-b border-neutral-light">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {trustItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="text-center group">
                <div className="mb-3 flex justify-center">
                  <div className="w-12 h-12 bg-brand-emerald/10 rounded-full flex items-center justify-center group-hover:bg-brand-emerald/20 transition-colors">
                    <Icon className="h-6 w-6 text-brand-emerald" />
                  </div>
                </div>
                <h3 className="font-semibold text-neutral-charcoal text-sm md:text-base mb-1">
                  {item.text}
                </h3>
                <p className="text-xs text-neutral-medium">
                  {item.subtext}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}