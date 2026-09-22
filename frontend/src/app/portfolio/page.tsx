import PortfolioHero from "../../components/catelog/PortfolioPage";
import ProjectsSection from "../../components/catelog/ProjectsSection";
import GallerySection from "../../components/catelog/GallerySection";

/**
 * /portfolio used to render the hero and nothing else.
 *
 * ProjectsSection and GallerySection existed, and ProjectsSection is what reads the
 * admin's "Portfolio projects" editor - but neither was ever mounted. So editing a
 * project in Website Management changed nothing on the site. They are mounted now.
 */
export default function PortfolioRoute() {
  return (
    <>
      <PortfolioHero />
      <ProjectsSection />
      <GallerySection />
    </>
  );
}
