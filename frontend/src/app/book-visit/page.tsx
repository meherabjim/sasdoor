import Visible from "@/components/common/Visible";
import AnimatedSection from "@/components/common/AnimatedSection";
import BookVisitDetailsSection from "@/components/book-visit/BookVisitDetailsSection";
import BookVisitHeroSection from "@/components/book-visit/BookVisitHeroSection";
import BookVisitStepsSection from "@/components/book-visit/BookVisitStepsSection";

export default function BookVisitPage() {
  return (
    <div className="bg-[#f6efe7] text-[#2f241d]">
      <Visible id="bookVisit.hero">
      <AnimatedSection direction="up">
        <BookVisitHeroSection />
      </AnimatedSection>
      </Visible>
      <Visible id="bookVisit.steps">
      <AnimatedSection direction="up" delay={0.08}>
        <BookVisitStepsSection />
      </AnimatedSection>
      </Visible>
      <Visible id="bookVisit.details">
      <AnimatedSection direction="up" delay={0.12}>
        <BookVisitDetailsSection />
      </AnimatedSection>
      </Visible>
    </div>
  );
}
