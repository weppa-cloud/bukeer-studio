"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";


export default function BlogPostPage() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:font-sans focus:text-sm"
        style={{ backgroundColor: "var(--accent)", color: "var(--accent-text)" }}
      >
        Saltar al contenido principal
      </a>
      <SiteHeader />
      <main id="main-content">
        <div className="max-w-4xl mx-auto px-6 pt-32 pb-24">
          {/* Breadcrumb */}
          <nav
            className="font-mono text-xs mb-8"
            style={{ color: "var(--text-muted)" }}
          >
            <a
              href="/"
              className="hover:underline"
              style={{ color: "var(--text-muted)" }}
            >
              Inicio
            </a>
            <span className="mx-2">/</span>
            <a
              href="/blog"
              className="hover:underline"
              style={{ color: "var(--text-muted)" }}
            >
              Blog
            </a>
            <span className="mx-2">/</span>
            <span style={{ color: "var(--accent)" }}>Los 10 Destinos</span>
          </nav>

          {/* Category Badge */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
            custom={0}
          >
            <span
              className="inline-block font-mono text-[10px] tracking-widest uppercase px-3 py-1.5 rounded-full mb-6"
              style={{
                backgroundColor: "var(--nav-link-hover-bg)",
                color: "var(--accent)",
              }}
            >
              Destinos
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
            custom={0.05}
            className="font-display mb-4"
            style={{
              fontSize: "var(--text-display-md)",
              color: "var(--text-heading)",
            }}
          >
            Los 10 Destinos Imperdibles de Colombia en 2026
          </motion.h1>

          {/* Date */}
          <motion.p
            initial="hidden"
            animate="visible"
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
            custom={0.1}
            className="font-mono text-xs mb-10"
            style={{ color: "var(--text-muted)" }}
          >
            15 de marzo de 2026
          </motion.p>

          {/* Featured Image */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
            custom={0.15}
            className="relative rounded-2xl overflow-hidden mb-14"
            style={{ aspectRatio: "16/9" }}
          >
            <img
              src="https://images.unsplash.com/photo-1526392060635-9d6019884377?w=1400&q=80"
              alt="Destinos de Colombia"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </motion.div>

          {/* Article Content */}
          <div className="max-w-3xl mx-auto space-y-12">
            {/* Intro */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
              custom={0.1}
            >
              <p
                className="font-sans leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Colombia se ha consolidado como uno de los destinos mas
                atractivos de Sudamerica. Con una diversidad geografica que va
                desde playas caribenas hasta nevados andinos, pasando por selvas
                amazonicas y desiertos, este pais ofrece experiencias unicas
                para todo tipo de viajero. En esta guia te presentamos los
                destinos que no puedes dejar de visitar en 2026.
              </p>
            </motion.div>

            {/* Section 1 */}
            <motion.section
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
              custom={0.1}
            >
              <h2
                className="font-display text-2xl mb-4"
                style={{ color: "var(--text-heading)" }}
              >
                Cartagena de Indias
              </h2>
              <p
                className="font-sans leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                La Heroica sigue siendo el destino estrella de Colombia. Sus
                calles empedradas, balcones coloniales cubiertos de buganvillas
                y la brisa del Caribe crean una atmosfera romantica e
                inolvidable. En 2026, la ciudad inaugura nuevas experiencias
                gastronomicas en Getsemani y el recien restaurado Baluarte de
                Santa Catalina ofrece recorridos nocturnos exclusivos que
                combinan historia, musica en vivo y cocteleria de autor.
              </p>
            </motion.section>

            {/* Section 2 */}
            <motion.section
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
              custom={0.1}
            >
              <h2
                className="font-display text-2xl mb-4"
                style={{ color: "var(--text-heading)" }}
              >
                Eje Cafetero
              </h2>
              <p
                className="font-sans leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                El Paisaje Cultural Cafetero, declarado Patrimonio de la
                Humanidad por la UNESCO, es una experiencia sensorial completa.
                Recorre fincas cafeteras donde aprenderas el proceso del grano
                desde la siembra hasta la taza, camina entre las palmas de cera
                del Valle del Cocora — las mas altas del mundo — y hospédate en
                haciendas tradicionales donde el tiempo parece detenerse entre
                montanas verdes y atardeceres naranja.
              </p>
            </motion.section>

            {/* Blockquote */}
            <motion.blockquote
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
              custom={0.1}
              className="pl-6 py-2"
              style={{
                borderLeft: "3px solid var(--accent)",
              }}
            >
              <p
                className="font-display text-xl italic leading-relaxed"
                style={{ color: "var(--text-heading)" }}
              >
                &ldquo;Colombia no se visita, se vive. Cada rincon tiene una
                historia que contar y un sabor que descubrir.&rdquo;
              </p>
              <cite
                className="font-sans text-sm mt-3 block not-italic"
                style={{ color: "var(--text-muted)" }}
              >
                — Gabriel, guia local en Cartagena
              </cite>
            </motion.blockquote>

            {/* Section 3 */}
            <motion.section
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
              custom={0.1}
            >
              <h2
                className="font-display text-2xl mb-4"
                style={{ color: "var(--text-heading)" }}
              >
                Amazonas
              </h2>
              <p
                className="font-sans leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Para los viajeros que buscan aventura autentica, el Amazonas
                colombiano es un destino imbatible. Desde Leticia, la capital
                del departamento, puedes adentrarte en la selva tropical mas
                grande del planeta. Navega por el rio Amazonas, visita
                comunidades indigenas que preservan tradiciones milenarias, y
                descubre una biodiversidad que desafia la imaginacion: delfines
                rosados, monos aulladores, guacamayas y la imponente Victoria
                regia, el lirio de agua mas grande del mundo.
              </p>
            </motion.section>

            {/* Share */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
              custom={0.1}
              className="pt-8"
              style={{ borderTop: "1px solid var(--border-subtle)" }}
            >
              <p
                className="font-sans text-sm font-medium mb-4"
                style={{ color: "var(--text-heading)" }}
              >
                Compartir articulo
              </p>
              <div className="flex items-center gap-4">
                <a
                  href="https://twitter.com/intent/tweet?text=Los%2010%20Destinos%20Imperdibles%20de%20Colombia%20en%202026"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full font-sans text-xs transition-colors min-w-[44px] min-h-[44px]"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Twitter/X
                </a>
                <a
                  href="https://www.facebook.com/sharer/sharer.php?u="
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full font-sans text-xs transition-colors min-w-[44px] min-h-[44px]"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </a>
                <a
                  href="https://api.whatsapp.com/send?text=Los%2010%20Destinos%20Imperdibles%20de%20Colombia%20en%202026"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full font-sans text-xs transition-colors min-w-[44px] min-h-[44px]"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </a>
              </div>
            </motion.div>

            {/* Back to blog */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
              custom={0.1}
              className="pt-4"
            >
              <a
                href="/blog"
                className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider transition-colors"
                style={{ color: "var(--accent)" }}
              >
                <ArrowLeft size={14} />
                Volver al blog
              </a>
            </motion.div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
