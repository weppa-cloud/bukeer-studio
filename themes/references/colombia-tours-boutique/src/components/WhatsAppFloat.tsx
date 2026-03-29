"use client";
import { Phone } from "lucide-react";

export default function WhatsAppFloat() {
  return (
    <a
      href="https://wa.me/573001234567"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-jungle-600 text-white flex items-center justify-center shadow-lg hover:scale-110 hover:shadow-xl transition-all md:hidden"
    >
      <Phone size={24} />
    </a>
  );
}
