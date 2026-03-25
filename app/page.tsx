import HeaderTourM from "@/components/layouts/HeaderTourM";
import Footer from "@/components/layouts/Footer";
import { HeroSectionTourM } from "@/components/features/HeroSectionTourM";
import TourCategories from "@/components/home/TourCategories";
import FeaturedToursTourM from "@/components/home/FeaturedToursTourM";
import WhyChooseUsTourM from "@/components/home/WhyChooseUsTourM";
import PopularDestinationsTourM from "@/components/home/PopularDestinationsTourM";
import ItineraryBuilderCTA from "@/components/home/ItineraryBuilderCTA";
import Testimonials from "@/components/home/Testimonials";

export default function Home() {
  return (
    <>
      <HeaderTourM />
      <main>
        <HeroSectionTourM />
        <TourCategories />
        <FeaturedToursTourM />
        <PopularDestinationsTourM />
        <WhyChooseUsTourM />
        <ItineraryBuilderCTA />
        <Testimonials />
      </main>
      <Footer />
    </>
  );
}