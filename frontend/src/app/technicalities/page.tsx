import Visible from "@/components/common/Visible";
import AnimatedSection from "@/components/common/AnimatedSection";
import CallToActionSection from "@/components/technicalities/CallToActionSection";
import DetailsSection from "@/components/technicalities/DetailsSection";
import HeroSection from "@/components/technicalities/HeroSection";

export default function TechnicalitiesPage() {
  return (
    <div className="bg-[#f6efe7] text-[#2f241d]">
      <Visible id="technicalities.hero">
      <AnimatedSection direction="up">
        <HeroSection />
      </AnimatedSection>
      </Visible>
      <Visible id="technicalities.details">
      <AnimatedSection direction="up" delay={0.08}>
        <DetailsSection />
      </AnimatedSection>
      </Visible>
      <Visible id="technicalities.cta">
      <AnimatedSection direction="up" delay={0.12}>
        <CallToActionSection />
      </AnimatedSection>
      </Visible>
    </div>
  );
}
