import AnimatedSection from "../common/AnimatedSection";
import HeroSection from "./HeroSection";
import SecurityFeatures from "./SecurityFeatures";
import StandardsSection from "./StandardsSection";

export default function SafetySecurityPage() {
  return (
    <div className="bg-[#f6efe7] text-[#2f241d]">

      <AnimatedSection direction="up">
        <HeroSection />
      </AnimatedSection>

      <AnimatedSection direction="up" delay={0.08}>
        <SecurityFeatures />
      </AnimatedSection>

      <AnimatedSection direction="up" delay={0.12}>
        <StandardsSection />
      </AnimatedSection>

    </div>
  );
}
