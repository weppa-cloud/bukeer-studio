"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "w-full fixed top-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-lg"
          : "bg-transparent"
      )}
    >
      {/* Main Navigation */}
      <nav className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-1">
            <span className="text-2xl font-display font-bold text-colombia-blue">
              Colombia
            </span>
            <span className="text-2xl font-display font-bold text-brand-emerald">
              Tours
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-8">
            <Link
              href="/destinos"
              className={cn(
                "text-sm font-medium transition-colors",
                isScrolled
                  ? "text-neutral-charcoal hover:text-colombia-blue"
                  : "text-white hover:text-colombia-yellow"
              )}
            >
              Destinos
            </Link>
            <Link
              href="/itinerarios"
              className={cn(
                "text-sm font-medium transition-colors",
                isScrolled
                  ? "text-neutral-charcoal hover:text-colombia-blue"
                  : "text-white hover:text-colombia-yellow"
              )}
            >
              Itinerarios
            </Link>
            <Link
              href="/hoteles"
              className={cn(
                "text-sm font-medium transition-colors",
                isScrolled
                  ? "text-neutral-charcoal hover:text-colombia-blue"
                  : "text-white hover:text-colombia-yellow"
              )}
            >
              Hoteles
            </Link>
            <Link
              href="/actividades"
              className={cn(
                "text-sm font-medium transition-colors",
                isScrolled
                  ? "text-neutral-charcoal hover:text-colombia-blue"
                  : "text-white hover:text-colombia-yellow"
              )}
            >
              Experiencias
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "gap-2",
                isScrolled ? "" : "text-white hover:text-white hover:bg-white/20"
              )}
            >
              <MessageCircle className="h-4 w-4" />
              Hablar con Asesor
            </Button>
            <Button variant="emerald" size="sm">
              Diseña tu Viaje
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X
                className={cn(
                  "h-6 w-6",
                  isScrolled ? "text-neutral-charcoal" : "text-white"
                )}
              />
            ) : (
              <Menu
                className={cn(
                  "h-6 w-6",
                  isScrolled ? "text-neutral-charcoal" : "text-white"
                )}
              />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border/50 bg-white/95 backdrop-blur-md rounded-b-xl">
            <div className="flex flex-col gap-4">
              <Link
                href="/destinos"
                className="text-neutral-charcoal hover:text-colombia-blue px-4 py-2"
              >
                Destinos
              </Link>
              <Link
                href="/itinerarios"
                className="text-neutral-charcoal hover:text-colombia-blue px-4 py-2"
              >
                Itinerarios
              </Link>
              <Link
                href="/hoteles"
                className="text-neutral-charcoal hover:text-colombia-blue px-4 py-2"
              >
                Hoteles
              </Link>
              <Link
                href="/actividades"
                className="text-neutral-charcoal hover:text-colombia-blue px-4 py-2"
              >
                Experiencias
              </Link>
              <div className="flex flex-col gap-2 px-4 pt-4 border-t">
                <Button variant="outline" className="w-full gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Hablar con Asesor
                </Button>
                <Button variant="emerald" className="w-full">
                  Diseña tu Viaje
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}