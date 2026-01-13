import Image from "next/image";
import Link from "next/link";
import { Users, Star, Heart, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const tours = [
  {
    id: 1,
    name: "Cartagena Colonial de Lujo",
    destination: "Cartagena",
    duration: "4 días / 3 noches",
    groupSize: "Privado",
    price: 4890000,
    originalPrice: 5690000,
    rating: 4.9,
    reviews: 127,
    image: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800",
    highlight: "Más vendido",
    type: "Lujo",
    included: ["Hotel 5★", "Guía privado", "Traslados VIP", "Cenas gourmet"],
  },
  {
    id: 2,
    name: "San Andrés Exclusivo",
    destination: "San Andrés",
    duration: "5 días / 4 noches",
    groupSize: "Max 8 personas",
    price: 6890000,
    rating: 4.8,
    reviews: 89,
    image: "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800",
    highlight: "Todo incluido",
    type: "Premium",
    included: ["Resort Premium", "Deportes acuáticos", "Excursiones", "Spa"],
  },
  {
    id: 3,
    name: "Amazonas Expedición VIP",
    destination: "Amazonas",
    duration: "6 días / 5 noches",
    groupSize: "Max 6 personas",
    price: 8290000,
    rating: 4.7,
    reviews: 56,
    image: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800",
    highlight: "Aventura",
    type: "Expedición",
    included: ["Lodge eco-lujo", "Guía naturalista", "Equipo completo", "Comidas gourmet"],
  },
];

const getHighlightColor = (highlight: string) => {
  const colors = {
    "Más vendido": "colombia",
    "Todo incluido": "emerald",
    "Aventura": "caribbean",
  };
  return colors[highlight as keyof typeof colors] || "default";
};

export default function FeaturedTours() {
  const formatPrice = (price: number) => {
    return `$${price.toLocaleString('es-CO')}`;
  };

  return (
    <section className="section-padding bg-white">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-neutral-charcoal mb-6">
            Experiencias Exclusivas de Lujo
          </h2>
          <p className="text-lg text-neutral-medium max-w-3xl mx-auto">
            Itinerarios personalizados diseñados para familias exigentes que buscan 
            lo mejor de Colombia con el más alto nivel de servicio y comodidad
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {tours.map((tour) => (
            <Card key={tour.id} className="group overflow-hidden border-0 luxury-shadow card-hover">
              {/* Image */}
              <div className="relative h-80 overflow-hidden">
                <Image
                  src={tour.image}
                  alt={tour.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Badge variant={getHighlightColor(tour.highlight) as any} className="font-special">
                    {tour.highlight}
                  </Badge>
                  <Badge variant="outline" className="bg-white/90 backdrop-blur-sm border-white">
                    {tour.type}
                  </Badge>
                </div>

                {/* Favorite Button */}
                <button className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors">
                  <Heart className="h-4 w-4 text-neutral-medium hover:text-red-500 hover:fill-red-500 transition-colors" />
                </button>

                {/* Rating */}
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2">
                  <Star className="h-4 w-4 fill-colombia-yellow text-colombia-yellow" />
                  <span className="font-semibold text-neutral-charcoal">{tour.rating}</span>
                  <span className="text-sm text-neutral-medium">({tour.reviews})</span>
                </div>
              </div>

              <CardContent className="p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-display font-bold text-neutral-charcoal mb-2">
                    {tour.name}
                  </h3>
                  <p className="text-neutral-medium text-sm">{tour.destination}</p>
                </div>

                {/* Meta info */}
                <div className="flex items-center gap-4 text-sm text-neutral-medium mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{tour.duration}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{tour.groupSize}</span>
                  </div>
                </div>

                {/* Included Services */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-neutral-medium mb-2 uppercase tracking-wide">
                    Incluye:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {tour.included.slice(0, 2).map((item, idx) => (
                      <span key={idx} className="text-xs bg-brand-sand text-neutral-charcoal px-2 py-1 rounded">
                        {item}
                      </span>
                    ))}
                    {tour.included.length > 2 && (
                      <span className="text-xs text-neutral-medium">
                        +{tour.included.length - 2} más
                      </span>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-neutral-charcoal">
                        {formatPrice(tour.price)}
                      </span>
                      {tour.originalPrice && (
                        <span className="text-neutral-medium line-through text-lg">
                          {formatPrice(tour.originalPrice)}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-neutral-medium">por familia (4 personas)</span>
                  </div>
                </div>

                {/* CTA */}
                <div className="flex gap-2">
                  <Link href={`/itinerarios/${tour.id}`} className="flex-1">
                    <Button className="w-full" variant="emerald">
                      Ver Itinerario
                    </Button>
                  </Link>
                  <Button variant="outline" size="default" className="px-3">
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Link href="/itinerarios">
            <Button size="lg" variant="outline" className="min-w-[200px]">
              Explorar Todos los Itinerarios
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}