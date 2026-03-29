"use client";
import { Phone } from "lucide-react";

const exploreLinks = ["Destinos", "Tours", "Actividades", "Hoteles", "Blog"];
const destinoLinks = ["Cartagena", "Eje Cafetero", "Medellín", "San Andrés", "Amazonas", "Santa Marta"];

export default function SiteFooter() {
  return (
    <>
      {/* Fix #8: Gradient transition before footer in light mode */}
      <div className="h-16" style={{ background: "linear-gradient(to bottom, var(--bg), #1a1714)" }} />

      <footer className="bg-stone-950" role="contentinfo">
        <div className="max-w-7xl mx-auto px-6">
          <div className="py-16 grid grid-cols-1 md:grid-cols-4 gap-12">
            <div>
              <p className="font-mono text-xs tracking-widest uppercase mb-4">
                <span className="text-sand-400">Colombia</span>
                <span className="text-stone-600">Tours</span>
              </p>
              <p className="text-stone-500 text-sm leading-relaxed mb-6">
                Tours diseñados por locales. Experiencias auténticas en toda Colombia.
              </p>
              {/* Fix #3: Social icons with min 44px touch target */}
              <div className="flex gap-2">
                {[
                  { label: "Instagram", text: "IG" },
                  { label: "Facebook", text: "FB" },
                  { label: "TikTok", text: "TT" },
                  { label: "YouTube", text: "YT" },
                ].map((s) => (
                  <a
                    key={s.text}
                    href="#"
                    aria-label={s.label}
                    className="w-11 h-11 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-stone-500 text-xs hover:bg-white/[0.08] hover:text-white transition-all duration-150"
                  >
                    {s.text}
                  </a>
                ))}
              </div>
            </div>

            <nav aria-label="Explorar">
              <h3 className="font-mono text-xs text-stone-400 tracking-widest uppercase mb-4">Explora</h3>
              <ul className="space-y-2">
                {exploreLinks.map((l) => (
                  <li key={l}><a href="#" className="text-stone-500 text-sm hover:text-white transition-colors duration-150">{l}</a></li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Destinos populares">
              <h3 className="font-mono text-xs text-stone-400 tracking-widest uppercase mb-4">Destinos</h3>
              <ul className="space-y-2">
                {destinoLinks.map((l) => (
                  <li key={l}><a href="#" className="text-stone-500 text-sm hover:text-white transition-colors duration-150">{l}</a></li>
                ))}
              </ul>
            </nav>

            <div>
              <h3 className="font-mono text-xs text-stone-400 tracking-widest uppercase mb-4">Contacto</h3>
              <ul className="space-y-3 text-stone-500 text-sm">
                <li>info@colombiatours.travel</li>
                <li>+57 300 123 4567</li>
                <li>Lun-Sáb 8am-8pm (COL)</li>
              </ul>
              <a
                href="https://wa.me/573001234567"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 bg-jungle-600 text-white text-sm font-medium px-5 py-2.5 rounded-full hover:brightness-110 transition-all"
              >
                <Phone size={14} /> WhatsApp
              </a>
            </div>
          </div>

          <div className="border-t border-white/[0.06] py-6 flex flex-col md:flex-row justify-between items-center gap-3 text-stone-600 text-xs">
            <p>&copy; 2026 Colombia Tours Travel</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-stone-400 transition-colors">Términos</a>
              <span aria-hidden="true">·</span>
              <a href="#" className="hover:text-stone-400 transition-colors">Privacidad</a>
              <span aria-hidden="true">·</span>
              <a href="#" className="hover:text-stone-400 transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
