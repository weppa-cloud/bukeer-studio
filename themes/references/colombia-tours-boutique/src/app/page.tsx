import SiteHeader from "@/components/SiteHeader";
import HeroImmersive from "@/components/HeroImmersive";
import DestinationShowcase from "@/components/DestinationShowcase";
import ExperienceDiscovery from "@/components/ExperienceDiscovery";
import HotelShowcase from "@/components/HotelShowcase";
import PackageShowcase from "@/components/PackageShowcase";
import StatsCounters from "@/components/StatsCounters";
import WhyChooseUs from "@/components/WhyChooseUs";
import TestimonialsMarquee from "@/components/TestimonialsMarquee";
import BlogPreview from "@/components/BlogPreview";
import FaqAccordion from "@/components/FaqAccordion";
import CtaBanner from "@/components/CtaBanner";
import SiteFooter from "@/components/SiteFooter";
import WhatsAppFloat from "@/components/WhatsAppFloat";

export default function Home() {
  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-sand-400 focus:text-stone-950 focus:font-medium focus:text-sm">
        Ir al contenido principal
      </a>
      <SiteHeader />
      <main id="main-content">
        <HeroImmersive />
        <DestinationShowcase />
        <ExperienceDiscovery />
        <HotelShowcase />
        <PackageShowcase />
        <StatsCounters />
        <WhyChooseUs />
        <TestimonialsMarquee />
        <BlogPreview />
        <FaqAccordion />
        <CtaBanner />
      </main>
      <SiteFooter />
      <WhatsAppFloat />
    </>
  );
}
