"use client"

import React, { useEffect, useState } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ChevronDown, MapPin, Sparkles, Star } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"

const destinations = [
  {
    title: "Cartagena de Indias",
    image: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800",
    link: "/destinos/cartagena"
  },
  {
    title: "Islas del Rosario",
    image: "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800",
    link: "/destinos/islas-rosario"
  },
  {
    title: "Caño Cristales",
    image: "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=800",
    link: "/destinos/cano-cristales"
  },
  {
    title: "Guatapé",
    image: "https://images.unsplash.com/photo-1597036845321-7c5b86a874f1?w=800",
    link: "/destinos/guatape"
  },
  {
    title: "Tayrona",
    image: "https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=800",
    link: "/destinos/tayrona"
  }
];

export function HeroSection() {
  const { scrollY } = useScroll();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  // Parallax transforms
  const y1 = useTransform(scrollY, [0, 300], [0, 50]);
  const y2 = useTransform(scrollY, [0, 300], [0, -50]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const scale = useTransform(scrollY, [0, 300], [1, 0.8]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <section className="relative min-h-[120vh] overflow-hidden bg-gradient-to-b from-neutral-charcoal via-neutral-charcoal/95 to-neutral-charcoal">
      {/* Animated Background Gradient */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-colombia-blue/20 via-transparent to-brand-emerald/20 animate-gradient" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-colombia-yellow/10 via-transparent to-transparent" />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-colombia-yellow/30 rounded-full"
            initial={{
              x: `${Math.random() * 100}%`,
              y: `${Math.random() * 100}%`,
            }}
            animate={{
              x: `${Math.random() * 100}%`,
              y: `${Math.random() * 100}%`,
            }}
            transition={{
              duration: Math.random() * 20 + 20,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Hero Content */}
      <motion.div 
        style={{ opacity, scale }}
        className="relative z-20 flex items-center justify-center min-h-screen px-4"
      >
        <div className="text-center max-w-6xl mx-auto">
          {/* Premium Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-colombia-yellow/20 to-brand-emerald/20 backdrop-blur-sm border border-white/10 px-4 py-2 rounded-full mb-8"
          >
            <Star className="h-4 w-4 text-colombia-yellow" />
            <span className="text-sm font-medium text-white">
              #1 Agencia de Lujo en Colombia
            </span>
            <Star className="h-4 w-4 text-colombia-yellow" />
          </motion.div>

          {/* Main Title with Split Animation */}
          <div className="mb-8">
            {["Vive", "Colombia", "Como", "Nunca", "Antes"].map((word, index) => (
              <motion.span
                key={word}
                initial={{ opacity: 0, y: 50, rotateX: -90 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{
                  duration: 0.8,
                  delay: index * 0.1,
                  ease: [0.215, 0.61, 0.355, 1],
                }}
                className={cn(
                  "inline-block text-5xl md:text-7xl lg:text-8xl font-display font-bold mr-2 md:mr-4",
                  index === 1 && "text-transparent bg-clip-text bg-gradient-to-r from-colombia-yellow to-brand-emerald"
                )}
              >
                {word}
              </motion.span>
            ))}
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-xl md:text-2xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            Experiencias exclusivas diseñadas para familias que buscan 
            lo extraordinario en cada momento de su viaje
          </motion.p>

          {/* CTA Buttons with Hover Effects */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <Link href="/crear-itinerario">
              <Button 
                size="lg" 
                className="group relative overflow-hidden bg-gradient-to-r from-colombia-yellow to-brand-emerald text-neutral-charcoal hover:text-white px-8 py-6 text-lg font-medium transition-all duration-300"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Crear Mi Viaje con IA
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-brand-emerald to-colombia-blue opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Button>
            </Link>
            
            <Link href="/destinos">
              <Button 
                size="lg" 
                variant="outline" 
                className="group relative overflow-hidden border-2 border-white/30 bg-white/5 backdrop-blur-md text-white hover:text-neutral-charcoal px-8 py-6 text-lg font-medium transition-all duration-300"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Explorar Destinos
                </span>
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Button>
            </Link>
          </motion.div>

          {/* Floating Destination Cards */}
          <motion.div
            style={{ y: y1 }}
            className="relative h-40 md:h-60"
          >
            {destinations.map((dest, index) => (
              <motion.div
                key={dest.title}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.9 + index * 0.1 }}
                style={{
                  x: `${(index - 2) * 120}px`,
                  rotate: `${(index - 2) * 5}deg`,
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 md:w-48 h-20 md:h-32"
              >
                <Link href={dest.link} className="block group">
                  <div className="relative h-full rounded-lg overflow-hidden border border-white/10 backdrop-blur-sm bg-white/5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-0 group-hover:border-colombia-yellow/50">
                    <Image
                      src={dest.image}
                      alt={dest.title}
                      fill
                      className="object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <p className="absolute bottom-2 left-2 right-2 text-white text-xs md:text-sm font-medium">
                      {dest.title}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Animated Scroll Indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
      >
        <div className="flex flex-col items-center gap-2">
          <p className="text-white/60 text-sm">Descubre más</p>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ChevronDown className="h-6 w-6 text-white/60" />
          </motion.div>
        </div>
      </motion.div>

      {/* Custom Cursor Follower */}
      <motion.div
        className="fixed w-64 h-64 bg-gradient-to-r from-colombia-yellow/20 to-brand-emerald/20 rounded-full filter blur-3xl pointer-events-none z-10"
        animate={{
          x: mousePosition.x - 128,
          y: mousePosition.y - 128,
        }}
        transition={{ type: "spring", damping: 30, stiffness: 200 }}
      />
    </section>
  )
}