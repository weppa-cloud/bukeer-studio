import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Star, MapPin } from "lucide-react";

const destinations = [
  {
    id: 1,
    name: "Cartagena",
    description: "Ciudad amurallada llena de historia y encanto colonial",
    image: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800",
    category: "Colonial",
    tours: 45,
    rating: 4.9,
    priceFrom: 2890000,
  },
  {
    id: 2,
    name: "San Andrés",
    description: "Paraíso caribeño de aguas cristalinas y playas de ensueño",
    image: "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800",
    category: "Playa",
    tours: 32,
    rating: 4.8,
    priceFrom: 3590000,
  },
  {
    id: 3,
    name: "Eje Cafetero",
    description: "Paisajes de café, cultura paisa y naturaleza exuberante",
    image: "https://images.unsplash.com/photo-1606914501449-5a96b6ce24ca?w=800",
    category: "Naturaleza",
    tours: 28,
    rating: 4.7,
    priceFrom: 2190000,
  },
  {
    id: 4,
    name: "Medellín",
    description: "La ciudad de la eterna primavera e innovación",
    image: "https://images.unsplash.com/photo-1597036845321-7c5b86a874f1?w=800",
    category: "Ciudad",
    tours: 38,
    rating: 4.8,
    priceFrom: 1890000,
  },
  {
    id: 5,
    name: "Tayrona",
    description: "Parque natural con playas vírgenes y selva tropical",
    image: "https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=800",
    category: "Naturaleza",
    tours: 22,
    rating: 4.9,
    priceFrom: 2590000,
  },
  {
    id: 6,
    name: "Amazonas",
    description: "Aventura en el pulmón del mundo",
    image: "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=800",
    category: "Aventura",
    tours: 15,
    rating: 4.6,
    priceFrom: 4290000,
  },
];

const getCategoryColor = (category: string) => {
  const colors = {
    Colonial: "colombia",
    Playa: "caribbean",
    Naturaleza: "emerald",
    Ciudad: "secondary",
    Aventura: "destructive",
  };
  return colors[category as keyof typeof colors] || "default";
};

export default function FeaturedDestinations() {
  return (
    <section className="section-padding bg-brand-sand/30">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-neutral-charcoal mb-6">
            Destinos Únicos de Colombia
          </h2>
          <p className="text-lg text-neutral-medium max-w-3xl mx-auto">
            Descubre los lugares más extraordinarios de Colombia con nuestras experiencias 
            personalizadas de lujo, diseñadas para familias que buscan la perfección
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {destinations.map((destination) => (
            <Card key={destination.id} className="group overflow-hidden border-0 luxury-shadow card-hover">
              <div className="relative overflow-hidden aspect-[4/3]">
                <Image
                  src={destination.image}
                  alt={destination.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Category Badge */}
                <div className="absolute top-4 left-4">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Badge variant={getCategoryColor(destination.category) as any} className="font-special">
                    {destination.category}
                  </Badge>
                </div>

                {/* Rating Badge */}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
                  <Star className="h-3 w-3 fill-colombia-yellow text-colombia-yellow" />
                  <span className="text-xs font-semibold text-neutral-charcoal">{destination.rating}</span>
                </div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-charcoal/80 via-transparent to-transparent" />
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-xl font-display font-bold text-neutral-charcoal">{destination.name}</h3>
                  <div className="flex items-center gap-1 text-neutral-medium">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">{destination.tours}</span>
                  </div>
                </div>
                
                <p className="text-neutral-medium text-sm mb-4 line-clamp-2">
                  {destination.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs text-neutral-medium">Desde</span>
                    <span className="text-lg font-bold text-neutral-charcoal">
                      ${destination.priceFrom.toLocaleString('es-CO')}
                    </span>
                  </div>
                  
                  <Link href={`/destinos/${destination.name.toLowerCase().replace(' ', '-')}`}>
                    <Button variant="outline" size="sm" className="group-hover:bg-brand-emerald group-hover:text-white group-hover:border-brand-emerald transition-colors">
                      Ver más
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Link href="/destinos">
            <Button size="lg" variant="emerald" className="min-w-[200px]">
              Explorar Todos los Destinos
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}