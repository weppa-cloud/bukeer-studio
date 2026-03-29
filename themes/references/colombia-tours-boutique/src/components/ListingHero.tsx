"use client";
import { motion } from "framer-motion";

export function ListingHero({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <section className="pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="font-mono text-xs tracking-[0.15em] uppercase mb-3"
          style={{ color: "var(--accent)" }}
        >
          {eyebrow}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="font-display mb-4"
          style={{ fontSize: "var(--text-display-lg)", color: "var(--text-heading)" }}
        >
          {title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="font-sans text-base max-w-xl mx-auto"
          style={{ color: "var(--text-secondary)" }}
        >
          {subtitle}
        </motion.p>
      </div>
    </section>
  );
}
