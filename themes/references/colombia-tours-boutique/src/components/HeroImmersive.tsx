"use client";
import { useRef, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

export default function HeroImmersive() {
  const containerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);

  useEffect(() => {
    const el = spotlightRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
      el.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <section ref={containerRef} className="relative h-screen min-h-[700px] overflow-hidden">
      {/* Background with parallax */}
      <motion.div style={{ y: bgY, scale }} className="absolute inset-0 w-full h-[115%]">
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1583531352515-8884af319dc1?w=1920&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-stone-950" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />
      </motion.div>

      {/* Grain texture */}
      <div className="absolute inset-0 pointer-events-none z-[1] opacity-[0.04] overflow-hidden">
        <div
          className="absolute w-[200%] h-[200%] -inset-1/2"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
            animation: "grain 0.5s steps(1) infinite",
          }}
        />
      </div>

      {/* Spotlight */}
      <div
        ref={spotlightRef}
        className="absolute inset-0 z-10"
        style={{
          background: "radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(196,169,110,0.12) 0%, rgba(196,169,110,0.04) 40%, transparent 70%)",
        }}
      />

      {/* Content */}
      <motion.div
        style={{ opacity }}
        className="relative z-20 h-full flex flex-col justify-end pb-20 px-6 md:px-16 max-w-7xl mx-auto"
      >
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="font-mono text-xs tracking-[0.15em] uppercase text-sand-400 mb-5"
        >
          Colombia · Tours & Experiencias
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-white max-w-3xl leading-[1.05] mb-8"
          style={{ fontSize: "var(--text-display-xl)" }}
        >
          Descubre la{" "}
          <em className="text-sand-400 not-italic">Colombia</em>{" "}
          que no aparece en los mapas
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-start sm:items-center gap-6"
        >
          <p className="text-stone-300 text-base max-w-md leading-relaxed">
            Tours diseñados por locales. Experiencias auténticas. Reserva sin complicaciones.
          </p>
          <div className="flex gap-3 shrink-0">
            <a
              href="#tours"
              className="px-6 py-3 rounded-full font-sans font-medium text-sm bg-sand-400 text-stone-950 transition-all duration-[250ms] hover:bg-sand-200 hover:scale-[1.03] active:scale-[0.97]"
            >
              Ver tours
            </a>
            <a
              href="#destinos"
              className="px-6 py-3 rounded-full font-sans font-medium text-sm border border-white/20 text-white backdrop-blur-sm hover:border-white/40 hover:bg-white/10 transition-all duration-[250ms]"
            >
              Explorar destinos
            </a>
          </div>
        </motion.div>

        {/* Fix #4 & #11: Stats visible on mobile, repositioned */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="flex gap-3 mt-8 md:absolute md:bottom-8 md:right-8 md:mt-0 md:gap-4"
        >
          {[
            { num: "15,000+", label: "viajeros felices" },
            { num: "50+", label: "destinos" },
            { num: "4.9★", label: "calificación" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={cn(
                "px-3 py-2 md:px-4 md:py-3 rounded-xl text-right animate-float flex-1 md:flex-none",
                "bg-black/40 backdrop-blur-md border border-white/10"
              )}
              style={{ animationDelay: `${i * 0.3}s` }}
            >
              <p className="font-display text-base md:text-xl text-white">{stat.num}</p>
              <p className="font-mono text-[9px] md:text-[10px] text-stone-400 uppercase tracking-wide mt-0.5">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll indicator — hidden on mobile to avoid clutter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 hidden md:flex flex-col items-center gap-2"
      >
        <span className="font-mono text-[10px] text-stone-500 tracking-widest uppercase">scroll</span>
        <div className="w-px h-10 bg-gradient-to-b from-stone-500 to-transparent animate-scroll-indicator" />
      </motion.div>
    </section>
  );
}
