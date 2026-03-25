import type { Metadata } from "next";
import { Inter, Playfair_Display, Montserrat } from "next/font/google";
import "./globals.css";

// Optimized font loading with next/font (automatic swap, self-hosted)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "700"],
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-special",
  display: "swap",
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL || 'https://colombiatours.com'),
  title: "Colombia Tours - Descubre la Magia de Colombia",
  description: "Explora Colombia con nosotros. Tours personalizados, experiencias únicas y los mejores destinos del país.",
  keywords: "tours colombia, viajes colombia, paquetes turísticos, cartagena, bogotá, medellín",
  openGraph: {
    title: "Colombia Tours - Descubre la Magia de Colombia",
    description: "Explora Colombia con nosotros. Tours personalizados y experiencias únicas.",
    images: ["/images/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning className={`${inter.variable} ${playfair.variable} ${montserrat.variable}`}>
      <head>
        {/* Preconnect to external services for faster loading */}
        <link rel="preconnect" href="https://wzlxbpicdcdvxvdcvgas.supabase.co" />
        <link rel="dns-prefetch" href="https://wzlxbpicdcdvxvdcvgas.supabase.co" />
      </head>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
