import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
