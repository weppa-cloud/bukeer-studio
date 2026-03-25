"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  Search,
  MapPin,
  Calendar,
  Users,
  ChevronLeft,
  ChevronRight,
  Play
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

const heroSlides = [
  {
    id: 1,
    title: "Descubre la Magia de",
    highlight: "Cartagena",
    subtitle: "Ciudad colonial, playas paradisíacas y cultura vibrante",
    image: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=1600",
    price: "Desde $2,890,000",
    rating: 4.9,
    reviews: 234
  },
  {
    id: 2,
    title: "Aventura en el",
    highlight: "Amazonas",
    subtitle: "Naturaleza salvaje, culturas ancestrales y biodiversidad única",
    image: "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=1600",
    price: "Desde $3,590,000",
    rating: 4.8,
    reviews: 189
  },
  {
    id: 3,
    title: "Relájate en",
    highlight: "San Andrés",
    subtitle: "Mar de siete colores, buceo espectacular y ambiente caribeño",
    image: "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=1600",
    price: "Desde $3,290,000",
    rating: 4.9,
    reviews: 312
  }
];

export function HeroSectionTourM() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [searchData, setSearchData] = useState({
    destination: "",
    date: "",
    guests: "2 Adultos"
  });

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  // Auto-advance slides
  React.useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(timer);
  }, [currentSlide]);

  return (
    <section className="relative h-screen min-h-[800px] overflow-hidden">
      {/* Background Slider */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0"
        >
          <Image
            src={heroSlides[currentSlide].image}
            alt={heroSlides[currentSlide].title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/50" />
        </motion.div>
      </AnimatePresence>

      {/* Content Container */}
      <div className="relative z-10 h-full flex flex-col justify-center">
        <div className="container mt-20">
          <div className="max-w-6xl mx-auto">
            {/* Center Content */}
            <div className="text-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-white/90 text-lg md:text-xl mb-4 font-light tracking-wider"
                >
                  Vive la aventura en Colombia con nosotros
                </motion.p>

                {/* Title */}
                <AnimatePresence mode="wait">
                  <motion.h1
                    key={currentSlide}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.5 }}
                    className="text-5xl md:text-7xl lg:text-8xl font-display font-bold text-white mb-6 leading-tight"
                  >
                    <span className="block">{heroSlides[currentSlide].title}</span>
                    <span className="text-colombia-yellow">{heroSlides[currentSlide].highlight}</span>
                  </motion.h1>
                </AnimatePresence>

                {/* CTA Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex flex-wrap gap-4 justify-center mb-12"
                >
                  <Link href="/tours">
                    <Button 
                      size="lg" 
                      className="bg-colombia-yellow hover:bg-colombia-yellow/90 text-neutral-charcoal font-semibold px-8 py-6"
                    >
                      Explorar Tours
                    </Button>
                  </Link>
                  <button className="inline-flex items-center gap-2 px-8 py-6 bg-white/10 backdrop-blur-md border border-white/30 rounded-lg text-white font-semibold hover:bg-white/20 transition-colors">
                    <Play className="h-5 w-5" />
                    Ver Video
                  </button>
                </motion.div>


                {/* Slide Indicators */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={prevSlide}
                    className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5 text-white" />
                  </button>
                  <div className="flex gap-2">
                    {heroSlides.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          index === currentSlide 
                            ? "w-8 bg-colombia-yellow" 
                            : "w-2 bg-white/40"
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={nextSlide}
                    className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                  >
                    <ChevronRight className="h-5 w-5 text-white" />
                  </button>
                </div>
              </motion.div>

            </div>

            {/* Search Form */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-8"
            >
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2">
                <div className="bg-white rounded-xl p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  
                    {/* Destination */}
                    <div>
                      <label className="block text-xs text-neutral-medium mb-1">Destino</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-medium" />
                        <input
                          type="text"
                          placeholder="¿A dónde?"
                          className="w-full pl-10 pr-4 py-3 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-emerald"
                          value={searchData.destination}
                          onChange={(e) => setSearchData({...searchData, destination: e.target.value})}
                        />
                      </div>
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-xs text-neutral-medium mb-1">Fecha</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-medium" />
                        <input
                          type="date"
                          className="w-full pl-10 pr-4 py-3 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-emerald"
                          value={searchData.date}
                          onChange={(e) => setSearchData({...searchData, date: e.target.value})}
                        />
                      </div>
                    </div>

                    {/* Guests */}
                    <div>
                      <label className="block text-xs text-neutral-medium mb-1">Viajeros</label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-medium" />
                        <select
                          className="w-full pl-10 pr-4 py-3 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-emerald appearance-none bg-white"
                          value={searchData.guests}
                          onChange={(e) => setSearchData({...searchData, guests: e.target.value})}
                        >
                          <option>1 Adulto</option>
                          <option>2 Adultos</option>
                          <option>3 Adultos</option>
                          <option>4 Adultos</option>
                          <option>Grupo</option>
                        </select>
                      </div>
                    </div>

                    {/* Search Button */}
                    <Button className="h-full bg-brand-emerald hover:bg-brand-emerald/90 text-white font-semibold">
                      <Search className="h-5 w-5 mr-2" />
                      Buscar
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

      </div>
    </section>
  );
}