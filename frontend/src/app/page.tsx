import Visible from "@/components/common/Visible";
import AnimatedSection from "../components/common/AnimatedSection";
import CallToActionSection from "../components/home/CallToActionSection";
import HeroSection from "../components/home/HeroSection";
import HighlightsSection from "../components/home/HighlightsSection";
import PortfolioPreview from "../components/home/PortfolioPreview";
import ProcessSection from "../components/home/ProcessSection";

export default function Home() {
  return (
    <div className="bg-[#f6efe7] text-[#2f241d]">
      <Visible id="home.hero">
      <AnimatedSection direction="up">
        <HeroSection />
      </AnimatedSection>
      </Visible>
      <Visible id="home.highlights">
      <AnimatedSection direction="up" delay={0.08}>
        <HighlightsSection />
      </AnimatedSection>
      </Visible>
      <Visible id="home.process">
      <AnimatedSection direction="up" delay={0.12}>
        <ProcessSection />
      </AnimatedSection>
      </Visible>
      <Visible id="home.portfolio">
      <AnimatedSection direction="up" delay={0.16}>
        <PortfolioPreview />
      </AnimatedSection>
      </Visible>
      <Visible id="home.cta">
      <AnimatedSection direction="up" delay={0.2}>
        <CallToActionSection />
      </AnimatedSection>
      </Visible>
    </div>
  );
}
