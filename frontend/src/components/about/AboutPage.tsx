import AnimatedSection from "../common/AnimatedSection";
import BannerSection from "./BannerSection";
import ContactCard from "./ContactCard";
import StorySection from "./StorySection";
import ValuesSection from "./ValuesSection";

export default function AboutPage() {
  return (
    <div className="bg-[#f6efe7] text-[#2f241d]">
      <AnimatedSection direction="up">
        <BannerSection />
      </AnimatedSection>
      <AnimatedSection direction="up" delay={0.08}>
        <StorySection />
      </AnimatedSection>
      <AnimatedSection direction="up" delay={0.12}>
        <ValuesSection />
      </AnimatedSection>
      <AnimatedSection direction="up" delay={0.16}>
        <ContactCard />
      </AnimatedSection>
    </div>
  );
}
