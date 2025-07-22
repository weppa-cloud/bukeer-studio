"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { 
  Palmtree, 
  Mountain, 
  Building2, 
  Trees, 
  Waves, 
  Compass,
  Sparkles,
  Heart
} from "lucide-react"

const categories = [
  {
    id: 1,
    name: "Playa y Sol",
    icon: Palmtree,
    count: 32,
    color: "from-blue-400 to-cyan-400",
    link: "/tours/playa"
  },
  {
    id: 2,
    name: "Aventura",
    icon: Mountain,
    count: 28,
    color: "from-green-400 to-emerald-400",
    link: "/tours/aventura"
  },
  {
    id: 3,
    name: "Ciudad y Cultura",
    icon: Building2,
    count: 45,
    color: "from-purple-400 to-pink-400",
    link: "/tours/cultura"
  },
  {
    id: 4,
    name: "Naturaleza",
    icon: Trees,
    count: 24,
    color: "from-emerald-400 to-green-400",
    link: "/tours/naturaleza"
  },
  {
    id: 5,
    name: "Deportes Acuáticos",
    icon: Waves,
    count: 18,
    color: "from-cyan-400 to-blue-400",
    link: "/tours/deportes"
  },
  {
    id: 6,
    name: "Tours Guiados",
    icon: Compass,
    count: 52,
    color: "from-amber-400 to-orange-400",
    link: "/tours/guiados"
  },
  {
    id: 7,
    name: "Experiencias Únicas",
    icon: Sparkles,
    count: 15,
    color: "from-pink-400 to-rose-400",
    link: "/tours/experiencias"
  },
  {
    id: 8,
    name: "Luna de Miel",
    icon: Heart,
    count: 22,
    color: "from-red-400 to-pink-400",
    link: "/tours/romance"
  }
];

export default function TourCategories() {
  return (
    <section className="py-16 bg-neutral-light/30">
      <div className="container">
        {/* Section Header */}
        <div className="text-center mb-12">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-brand-emerald font-medium mb-2"
          >
            EXPLORA POR CATEGORÍA
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-display font-bold text-neutral-charcoal mb-4"
          >
            Encuentra tu Tipo de Aventura
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-neutral-medium max-w-2xl mx-auto"
          >
            Desde playas paradisíacas hasta aventuras en la selva, 
            tenemos la experiencia perfecta para cada viajero
          </motion.p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={category.link}>
                  <div className="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                    {/* Background Gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                    
                    {/* Icon Container */}
                    <div className={`relative w-16 h-16 bg-gradient-to-br ${category.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    
                    {/* Content */}
                    <h3 className="font-semibold text-neutral-charcoal mb-1 group-hover:text-brand-emerald transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-sm text-neutral-medium">
                      {category.count} Tours disponibles
                    </p>
                    
                    {/* Hover Arrow */}
                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-8 h-8 bg-neutral-light rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-neutral-charcoal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}