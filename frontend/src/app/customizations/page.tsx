import Visible from "@/components/common/Visible";
import AnimatedSection from "@/components/common/AnimatedSection";
import CallToActionSection from "@/components/customizations/CallToActionSection";
import HeroSection from "@/components/customizations/HeroSection";
import OptionsSection from "@/components/customizations/OptionsSection";

export default function CustomizationsPage() {
  return (
    <div className="bg-[#f6efe7] text-[#2f241d]">
      <Visible id="customizations.hero">
      <AnimatedSection direction="up">
        <HeroSection />
      </AnimatedSection>
      </Visible>
      <Visible id="customizations.options">
      <AnimatedSection direction="up" delay={0.08}>
        <OptionsSection />
      </AnimatedSection>
      </Visible>
      <Visible id="customizations.cta">
      <AnimatedSection direction="up" delay={0.12}>
        <CallToActionSection />
      </AnimatedSection>
      </Visible>
    </div>
  );
}
