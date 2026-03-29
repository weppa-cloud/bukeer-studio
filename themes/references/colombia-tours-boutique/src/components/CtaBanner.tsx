"use client";
import { motion } from "framer-motion";

export default function CtaBanner() {
  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=1920&q=75')" }} />
      <div className="absolute inset-0 bg-black/60" />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative max-w-3xl mx-auto px-6 text-center"
      >
        <p className="font-mono text-xs tracking-[0.15em] uppercase text-sand-400 mb-4">Tu aventura comienza aquí</p>
        <h2 className="font-display text-white mb-6" style={{ fontSize: "var(--text-display-lg)" }}>
          ¿Listo para descubrir la Colombia real?
        </h2>
        <p className="font-sans text-stone-300 text-base mb-8 max-w-xl mx-auto leading-relaxed">
          Habla con un experto local y diseñemos juntos el viaje de tu vida. Sin compromisos, sin comisiones ocultas.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="#tours" className="px-8 py-4 rounded-full font-sans font-medium text-sm bg-sand-400 text-stone-950 hover:bg-sand-200 hover:scale-[1.03] active:scale-[0.97] transition-all">
            Explorar tours
          </a>
          <a href="https://wa.me/573001234567" target="_blank" rel="noopener noreferrer" className="px-8 py-4 rounded-full font-sans font-medium text-sm border border-white/20 text-white hover:bg-white/10 transition-all">
            WhatsApp directo
          </a>
        </div>
      </motion.div>
    </section>
  );
}
