"use client";
import { useState } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

const NAV_LINKS = [
  { label: "Destinos", href: "#destinos" },
  { label: "Hoteles", href: "/hoteles" },
  { label: "Actividades", href: "/actividades" },
  { label: "Paquetes", href: "/paquetes" },
  { label: "Blog", href: "/blog" },
];

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => {
    setScrolled(y > 60);
    setHidden(y > 200 && y > (scrollY.getPrevious() ?? 0));
  });

  return (
    <>
      <motion.header
        animate={{ y: hidden ? "-100%" : "0%" }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "backdrop-blur-xl border-b"
            : "bg-transparent"
        )}
        style={scrolled ? { backgroundColor: "var(--nav-bg-scroll)", borderColor: "var(--border-subtle)" } : undefined}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-8 h-16 flex items-center justify-between">
          <a href="/" className="font-mono text-xs tracking-widest uppercase">
            <span className="text-sand-400">Colombia</span>
            <span style={{ color: "var(--text-muted)" }}>Tours</span>
          </a>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-4 py-2 rounded-lg text-sm transition-all duration-150"
                style={{ color: "var(--nav-link)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--nav-link-hover)";
                  e.currentTarget.style.backgroundColor = "var(--nav-link-hover-bg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--nav-link)";
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <a
              href="#tours"
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
              style={{ backgroundColor: "var(--accent)", color: "var(--accent-text)" }}
            >
              Reservar tour
            </a>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <button
              style={{ color: "var(--nav-link)" }}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-stone-950/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8"
          >
            {NAV_LINKS.map((link, i) => (
              <motion.a
                key={link.href}
                href={link.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => setMenuOpen(false)}
                className="font-display text-3xl text-white"
              >
                {link.label}
              </motion.a>
            ))}
            <a
              href="#tours"
              onClick={() => setMenuOpen(false)}
              className="mt-4 px-8 py-3 rounded-full bg-sand-400 text-stone-950 font-medium"
            >
              Reservar tour
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
