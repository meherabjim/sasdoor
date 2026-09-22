"use client";

import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import { portfolioProjects } from "@/lib/siteContent";
import en from "@/messages/en.json";
import bn from "@/messages/bn.json";

import door1 from "@/assets/door/full-design/design1.png";
import door2 from "@/assets/door/full-design/design2.png";
import door3 from "@/assets/door/full-design/design3.png";
import door4 from "@/assets/door/full-design/design4.png";
import door5 from "@/assets/door/full-design/design5.png";
import door6 from "@/assets/door/full-design/design6.png";
import door7 from "@/assets/door/full-design/design7.png";
import door8 from "@/assets/door/full-design/design8.png";
import door9 from "@/assets/door/full-design/design9.png";
import door10 from "@/assets/door/full-design/design10.png";
import door11 from "@/assets/door/full-design/design11.png";
import door12 from "@/assets/door/full-design/design12.png";
import door13 from "@/assets/door/full-design/design13.png";
import door14 from "@/assets/door/full-design/design14.png";
import door15 from "@/assets/door/full-design/dual-design1.png";
import door16 from "@/assets/door/full-design/dual-design2.png";
import door17 from "@/assets/door/full-design/dual-design3.png";


const projects = [
  {
    title: "Classic Elegance",
    subtitle: "Timeless appeal • Superior craftsmanship",
    image: door7,
  },
  {
    title: "Contemporary Appeal",
    subtitle: "Modern look • High-quality materials",
    image: door8,
  },
  {
    title: "Luxury Living",
    subtitle: "Premium finishes • Exceptional quality",
    image: door9,
  },
  {
    title: "Architectural Harmony",
    subtitle: "Designed to complement the space",
    image: door10,
  },
  {
    title: "Unique Character",
    subtitle: "Distinctive style • Personalized touch",
    image: door11,
  },
  {
    title: "Innovative Design",
    subtitle: "Cutting-edge solutions • Modern aesthetics",
    image: door12,
  },
  {
    title: "Sustainable Choice",
    subtitle: "Eco-friendly materials • Environmentally responsible",
    image: door13,
  },
  {
    title: "Custom Craftsmanship",
    subtitle: "Tailored to your specific needs",
    image: door14,
  },
  {
    title: "Dual Design Statement",
    subtitle: "Two-tone finish • Striking visual impact",
    image: door15,
  },
  {
    title: "Secure Modern Entry",
    subtitle: "Advanced security features • Contemporary style",
    image: door16,
  },
  {
    title: "Premium Finish Showcase",
    subtitle: "High-end materials • Exceptional attention to detail",
    image: door17,
  },
  {
    title: "Modern Entry Statement",
    subtitle: "Oak veneer • Matte black detail",
    image: door1,
  },
  {
    title: "Warm Contemporary Finish",
    subtitle: "Textured wood • Soft bronze accents",
    image: door2,
  },
  {
    title: "Secure Heritage Style",
    subtitle: "Solid panels • Premium locking system",
    image: door3,
  },
  {
    title: "Minimalist Luxury Look",
    subtitle: "Clean lines • Fine hardware selection",
    image: door4,
  },
  {
    title: "Elegant Simplicity",
    subtitle: "Timeless design • Refined details",
    image: door5,
  },
  {
    title: "Modern Minimalist",
    subtitle: "Clean aesthetic • Functional design",
    image: door6,
  },
];


export default function ProjectsSection() {
  const { language, content } = useLanguage();
  const t = language === "en" ? en.portfolioProjects : bn.portfolioProjects;
  const custom = portfolioProjects(content);
  const list: { title: string; subtitle: string; image: string | typeof door1 }[] = custom
    ? custom.map((p) => ({ title: (language === "en" ? p.titleEn : p.titleBn) || p.titleEn, subtitle: (language === "en" ? p.subtitleEn : p.subtitleBn) || p.subtitleEn, image: p.image }))
    : projects;
  return (
    <section className="bg-[linear-gradient(135deg,#f5e8d7_0%,#efe0c7_100%)] px-4 py-10 text-[#3b2a1f] lg:py-14">

      <div className="mx-auto max-w-7xl">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

          <div className="max-w-2xl">

            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a15e2b]">
              {t.badge}
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t.title}
            </h2>

          </div>


          <p className="max-w-xl text-sm leading-7 text-[#654c3a]">
            {t.description}
          </p>

        </div>



        <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">

          {list.map((project, i) => (

            <article
              key={`${project.title}-${i}`}
              className="group overflow-hidden rounded-md border border-[#e7d3bc] bg-[#fffdf8] shadow-[0_12px_40px_rgba(96,61,34,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(96,61,34,0.14)]"
            >

              <div className="relative m-2 overflow-hidden rounded-md bg-[#f6e8d7] p-2">

                <div className="relative h-72 min-h-72 max-h-72 overflow-hidden rounded-md sm:h-80 sm:min-h-80 sm:max-h-80">

                  <Image
                    src={project.image}
                    alt={project.title}
                    width={500}
                    height={500}
                    loading="lazy"
                    className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                  />

                </div>

              </div>



              <div className="px-4 pb-5">

                <h3 className="mt-3 text-lg font-semibold text-[#2f241d]">
                  {project.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#6d5442]">
                  {project.subtitle}
                </p>

              </div>

            </article>

          ))}

        </div>

      </div>

    </section>
  );
}
