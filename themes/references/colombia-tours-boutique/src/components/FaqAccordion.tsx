"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { ChevronDown } from "lucide-react";

const FAQS = [
  { q: "¿Cuál es la mejor época para visitar Colombia?", a: "Colombia tiene clima tropical todo el año. Las mejores épocas son diciembre-marzo y julio-agosto. El Eje Cafetero es perfecto todo el año, y las ballenas llegan al Pacífico entre julio y octubre." },
  { q: "¿Es seguro viajar por Colombia?", a: "Colombia ha avanzado enormemente en seguridad turística. Con nuestros guías locales certificados y rutas planificadas, viajas tranquilo. Llevamos 10+ años y 15,000+ viajeros felices." },
  { q: "¿Qué incluyen sus paquetes?", a: "Alojamiento seleccionado, transporte terrestre y/o vuelos internos, guías bilingües certificados, actividades principales y algunas comidas. Todo es personalizable." },
  { q: "¿Puedo reservar solo una actividad?", a: "Sí. Tenemos 728 actividades disponibles que puedes reservar individualmente: desde un city tour de 4 horas hasta una expedición de 4 días a Caño Cristales." },
  { q: "¿Aceptan pagos internacionales?", a: "Sí, aceptamos pagos en COP, USD, EUR y MXN. Puedes pagar con tarjeta de crédito, transferencia bancaria o PayPal. Pago 100% seguro." },
];

export default function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14"
        >
          <p className="font-mono text-xs tracking-[0.15em] uppercase mb-3" style={{ color: "var(--accent)" }}>PREGUNTAS FRECUENTES</p>
          <h2 className="font-display" style={{ fontSize: "var(--text-display-lg)", color: "var(--text-heading)" }}>Preguntas frecuentes</h2>
        </motion.div>

        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className="font-sans font-medium text-sm pr-4" style={{ color: "var(--text-heading)" }}>{faq.q}</span>
                <motion.div animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={18} style={{ color: "var(--accent)" }} />
                </motion.div>
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  >
                    <p className="px-5 pb-5 font-sans text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
