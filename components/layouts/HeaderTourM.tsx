"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Menu,
  X,
  Phone,
  Mail,
  Clock,
  ChevronDown,
  Globe,
  User,
  Search
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Inicio", href: "/" },
  { 
    name: "Destinos", 
    href: "/destinos",
    submenu: [
      { name: "Cartagena", href: "/destinos/cartagena" },
      { name: "San Andrés", href: "/destinos/san-andres" },
      { name: "Amazonas", href: "/destinos/amazonas" },
      { name: "Eje Cafetero", href: "/destinos/eje-cafetero" },
      { name: "Ver todos", href: "/destinos" },
    ]
  },
  { 
    name: "Tours", 
    href: "/tours",
    submenu: [
      { name: "Aventura", href: "/tours/aventura" },
      { name: "Playa y Sol", href: "/tours/playa" },
      { name: "Cultural", href: "/tours/cultural" },
      { name: "Naturaleza", href: "/tours/naturaleza" },
      { name: "Ver todos", href: "/tours" },
    ]
  },
  { name: "Crear Itinerario", href: "/crear-itinerario" },
  { name: "Sobre Nosotros", href: "/nosotros" },
  { name: "Blog", href: "/blog" },
  { name: "Contacto", href: "/contacto" },
];

export default function HeaderTourM() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Top Bar */}
      <div className={cn(
        "bg-neutral-charcoal/90 backdrop-blur-sm text-white text-sm transition-all duration-300",
        scrolled ? "h-0 overflow-hidden" : "py-2"
      )}>
        <div className="container">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm">
              <a href="tel:+573001234567" className="flex items-center gap-1 hover:text-colombia-yellow transition-colors">
                <Phone className="h-3 w-3" />
                <span>+57 300 123 4567</span>
              </a>
              <a href="mailto:info@colombiatours.co" className="flex items-center gap-1 hover:text-colombia-yellow transition-colors">
                <Mail className="h-3 w-3" />
                <span>info@colombiatours.co</span>
              </a>
              <div className="hidden md:flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Lun - Sab: 8:00 AM - 7:00 PM</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-1 hover:text-colombia-yellow transition-colors">
                <Globe className="h-3 w-3" />
                <span>ES</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              <Link href="/login" className="flex items-center gap-1 hover:text-colombia-yellow transition-colors">
                <User className="h-3 w-3" />
                <span>Ingresar</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "bg-white shadow-lg" : "bg-transparent",
        scrolled ? "py-2" : "py-4 mt-9"
      )}>
        <div className="container">
          <nav className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <div className="relative">
                <h1 className={cn(
                  "text-2xl font-display font-bold transition-colors",
                  scrolled ? "text-neutral-charcoal" : "text-white"
                )}>
                  Colombia<span className="text-colombia-yellow">Tours</span>
                </h1>
                <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-colombia-yellow to-brand-emerald" />
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              {navigation.map((item) => (
                <div
                  key={item.name}
                  className="relative"
                  onMouseEnter={() => setActiveDropdown(item.name)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1 font-medium transition-colors",
                      scrolled 
                        ? "text-neutral-charcoal hover:text-brand-emerald" 
                        : "text-white hover:text-colombia-yellow"
                    )}
                  >
                    {item.name}
                    {item.submenu && <ChevronDown className="h-4 w-4" />}
                  </Link>

                  {/* Dropdown Menu */}
                  {item.submenu && (
                    <AnimatePresence>
                      {activeDropdown === item.name && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-2"
                        >
                          {item.submenu.map((subitem) => (
                            <Link
                              key={subitem.name}
                              href={subitem.href}
                              className="block px-4 py-2 text-neutral-charcoal hover:bg-neutral-light hover:text-brand-emerald transition-colors"
                            >
                              {subitem.name}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-4">
              <button className={cn(
                "p-2 rounded-full transition-colors",
                scrolled 
                  ? "hover:bg-neutral-light" 
                  : "hover:bg-white/10"
              )}>
                <Search className={cn(
                  "h-5 w-5",
                  scrolled ? "text-neutral-charcoal" : "text-white"
                )} />
              </button>
              <Link href="/cotizar">
                <Button 
                  className={cn(
                    "font-semibold",
                    scrolled
                      ? "bg-brand-emerald hover:bg-brand-emerald/90 text-white"
                      : "bg-colombia-yellow hover:bg-colombia-yellow/90 text-neutral-charcoal"
                  )}
                >
                  Cotizar Viaje
                </Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              className="lg:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className={cn(
                  "h-6 w-6",
                  scrolled ? "text-neutral-charcoal" : "text-white"
                )} />
              ) : (
                <Menu className={cn(
                  "h-6 w-6",
                  scrolled ? "text-neutral-charcoal" : "text-white"
                )} />
              )}
            </button>
          </nav>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden bg-white border-t"
            >
              <div className="container py-4">
                <div className="space-y-1">
                  {navigation.map((item) => (
                    <div key={item.name}>
                      <Link
                        href={item.href}
                        className="block py-2 text-neutral-charcoal hover:text-brand-emerald font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {item.name}
                      </Link>
                      {item.submenu && (
                        <div className="ml-4 space-y-1">
                          {item.submenu.map((subitem) => (
                            <Link
                              key={subitem.name}
                              href={subitem.href}
                              className="block py-1 text-sm text-neutral-medium hover:text-brand-emerald"
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              {subitem.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="pt-4 border-t">
                    <Link href="/cotizar" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full bg-brand-emerald hover:bg-brand-emerald/90 text-white">
                        Cotizar Viaje
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}