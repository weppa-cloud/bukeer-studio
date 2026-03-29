"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Marquee } from "@/components/Marquee";

const DESTINATIONS = [
  { name: "Cartagena", region: "Bolívar", tag: "Cultura", img: "https://images.unsplash.com/photo-1583531352515-8884af319dc1?w=500&q=75" },
  { name: "Ciudad Perdida", region: "Magdalena", tag: "Aventura", img: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=500&q=75" },
  { name: "Salento", region: "Quindío", tag: "Cafetero", img: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=500&q=75" },
  { name: "Tayrona", region: "Magdalena", tag: "Naturaleza", img: "https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=500&q=75" },
  { name: "Medellín", region: "Antioquia", tag: "Ciudad", img: "https://images.unsplash.com/photo-1599493782928-55120e5e8e67?w=500&q=75" },
  { name: "San Andrés", region: "Insular", tag: "Playa", img: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=500&q=75" },
  { name: "Amazonas", region: "Leticia", tag: "Selva", img: "https://images.unsplash.com/photo-1568430462989-44163eb1752f?w=500&q=75" },
];

function DestinationCard({ name, region, tag, img }: (typeof DESTINATIONS)[0]) {
  return (
    <div
      className="relative shrink-0 w-52 h-72 rounded-2xl overflow-hidden group cursor-pointer"
      style={{ border: "1px solid var(--border-subtle)" }}
    >
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
        style={{ backgroundImage: `url('${img}')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <span className="inline-block font-mono text-[9px] tracking-widest uppercase mb-2 px-2 py-1 rounded-full bg-sand-400/20 text-sand-400 border border-sand-400/20">
          {tag}
        </span>
        <p className="font-display text-lg text-white leading-tight">{name}</p>
        <p className="font-sans text-xs text-stone-300 mt-0.5">{region}</p>
      </div>
    </div>
  );
}

export default function DestinationShowcase() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="destinos" ref={ref} className="py-24 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-7xl mx-auto px-6 mb-12"
      >
        <p className="font-mono text-xs tracking-[0.15em] uppercase mb-3" style={{ color: "var(--accent)" }}>
          Destinos
        </p>
        <h2 className="font-display" style={{ fontSize: "var(--text-display-lg)", color: "var(--text-heading)" }}>
          Colombia, destino a destino
        </h2>
      </motion.div>

      <Marquee speed={40} direction="left" className="mb-4">
        {DESTINATIONS.map((d) => <DestinationCard key={d.name} {...d} />)}
      </Marquee>
      <Marquee speed={55} direction="right">
        {[...DESTINATIONS].reverse().map((d) => <DestinationCard key={`r-${d.name}`} {...d} />)}
      </Marquee>
    </section>
  );
}
