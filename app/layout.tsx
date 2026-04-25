import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  Bricolage_Grotesque,
  Instrument_Serif,
  Montserrat,
  Geist,
  Manrope,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { localeToLanguage, PUBLIC_LOCALE_HEADER_NAMES } from "@/lib/seo/locale-routing";

// Optimized font loading with next/font (automatic swap, self-hosted)
const geist = Geist({subsets:['latin'],variable:'--font-sans'});
const manrope = Manrope({ subsets: ["latin"], variable: "--font-studio-ui", display: "swap" });
const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-studio-mono", display: "swap" });

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400"],
  style: ["normal", "italic"],
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-special",
  display: "swap",
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL || 'https://studio.bukeer.com'),
  title: "Colombia Tours - Descubre la Magia de Colombia",
  description: "Explora Colombia con nosotros. Tours personalizados, experiencias únicas y los mejores destinos del país.",
  keywords: "tours colombia, viajes colombia, paquetes turísticos, cartagena, bogotá, medellín",
  openGraph: {
    title: "Colombia Tours - Descubre la Magia de Colombia",
    description: "Explora Colombia con nosotros. Tours personalizados y experiencias únicas.",
    images: ["/images/og-image.jpg"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = await headers();
  const htmlLang =
    headerList.get(PUBLIC_LOCALE_HEADER_NAMES.lang) ||
    localeToLanguage(headerList.get(PUBLIC_LOCALE_HEADER_NAMES.resolvedLocale) || 'es-CO');

  return (
    <html
      lang={htmlLang}
      suppressHydrationWarning
      className={cn(
        bricolage.variable,
        instrumentSerif.variable,
        montserrat.variable,
        geist.variable,
        manrope.variable,
        jetBrainsMono.variable,
        "font-sans",
      )}
    >
      <body className="font-sans antialiased">
        <script
          id="global-name-helper"
          dangerouslySetInnerHTML={{
            __html: `window.__name=window.__name||function(fn){return fn};`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
