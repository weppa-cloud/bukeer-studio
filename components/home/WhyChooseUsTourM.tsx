"use client"

import { motion } from "framer-motion"
import { 
  Shield, 
  Award, 
  Users, 
  Globe, 
  HeartHandshake,
  Phone,
  DollarSign,
  Sparkles
} from "lucide-react"

const features = [
  {
    icon: Shield,
    title: "100% Seguro",
    description: "Pagos protegidos y garantía total en todas tus reservas",
    color: "from-blue-400 to-blue-600"
  },
  {
    icon: Award,
    title: "Mejor Precio Garantizado",
    description: "Encuentra las mejores tarifas o te devolvemos la diferencia",
    color: "from-green-400 to-emerald-600"
  },
  {
    icon: Users,
    title: "Guías Expertos Locales",
    description: "Conoce Colombia con quienes mejor la conocen",
    color: "from-purple-400 to-purple-600"
  },
  {
    icon: Globe,
    title: "+50 Destinos",
    description: "Explora los rincones más increíbles de Colombia",
    color: "from-orange-400 to-red-600"
  },
  {
    icon: HeartHandshake,
    title: "Experiencias Personalizadas",
    description: "Viajes diseñados especialmente para ti y tu familia",
    color: "from-pink-400 to-rose-600"
  },
  {
    icon: Phone,
    title: "Soporte 24/7",
    description: "Estamos contigo en cada momento de tu aventura",
    color: "from-cyan-400 to-blue-600"
  }
];

export default function WhyChooseUsTourM() {
  return (
    <section className="py-20 bg-gradient-to-br from-neutral-light/50 to-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
      </div>

      <div className="container relative">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 bg-brand-emerald/10 text-brand-emerald px-4 py-2 rounded-full text-sm font-medium mb-4"
          >
            <Sparkles className="h-4 w-4" />
            ¿POR QUÉ ELEGIRNOS?
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-neutral-charcoal mb-4"
          >
            Somos Tu Mejor Opción para
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-colombia-yellow to-brand-emerald">
              Viajar por Colombia
            </span>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-neutral-medium max-w-3xl mx-auto"
          >
            Con más de 10 años de experiencia, hemos ayudado a miles de familias 
            a crear recuerdos inolvidables en los destinos más hermosos de Colombia
          </motion.p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <div className="relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 h-full">
                  {/* Hover Effect Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-neutral-light/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                  
                  {/* Icon */}
                  <div className="relative mb-6">
                    <div className={`w-20 h-20 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                      <Icon className="h-10 w-10 text-white" />
                    </div>
                    {/* Decorative Element */}
                    <div className={`absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br ${feature.color} rounded-full opacity-50`} />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-neutral-charcoal mb-3 group-hover:text-brand-emerald transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-neutral-medium leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Bottom Line Effect */}
                  <div className="absolute bottom-0 left-8 right-8 h-1 bg-gradient-to-r from-transparent via-brand-emerald to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <div className="inline-flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <DollarSign className="h-12 w-12 text-amber-600" />
            <div className="text-left">
              <p className="text-lg font-semibold text-neutral-charcoal">
                ¡Ahorra hasta un 30% reservando con anticipación!
              </p>
              <p className="text-neutral-medium">
                Los mejores precios para quienes planean con tiempo
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}