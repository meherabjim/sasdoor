"use client";

import Image from "next/image";
import Link from "next/link";

import door1 from "@/assets/door/decorated/decorated3.png";

import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

import { useLanguage } from "../../context/LanguageContext";


export default function PortfolioHero() {


  const { language } = useLanguage();


  const t =
    language === "en"
      ? en.portfolioHero
      : bn.portfolioHero;



  return (

    <section
      className="
      relative
      overflow-hidden
      bg-[#f6efe7]
      text-[#2f241d]
      "
    >


      <div
        className="
        absolute
        inset-0
        bg-[radial-gradient(circle_at_top_left,rgba(177,104,47,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(122,78,42,0.12),transparent_30%)]
        "
      />



      <div
        className="
        relative
        mx-auto
        grid
        max-w-7xl
        gap-10
        px-4
        py-16
        lg:grid-cols-[1fr_0.9fr]
        lg:items-center
        lg:px-0
        lg:py-24
        "
      >



        {/* TEXT SECTION */}

        <div className="max-w-2xl">


          <p
            className="
            text-xs
            font-semibold
            uppercase
            tracking-[0.24em]
            text-[#a15e2b]
            "
          >

            {t.badge}

          </p>





          <h1
            className="
            mt-4
            text-4xl
            font-semibold
            tracking-tight
            text-balance
            sm:text-5xl
            lg:text-6xl
            "
          >

            {t.title}

          </h1>





          <p
            className="
            mt-5
            text-base
            leading-8
            text-[#634a38]
            sm:text-lg
            "
          >

            {t.description}

          </p>






          <div className="mt-8">


            <Link

              href="/book-visit"

              className="
              inline-flex
              items-center
              justify-center
              rounded-full
              bg-[#9b5528]
              px-6
              py-3
              text-sm
              font-semibold
              text-white
              transition-colors
              hover:bg-[#7e4320]
              "

            >

              {t.button}

            </Link>


          </div>


        </div>







        {/* IMAGE SECTION */}


        <div className="relative">



          <div
            className="
            relative
            overflow-hidden
            rounded-xl
            border
            border-[#d9be9b]
            bg-[#fffaf4]
            p-3
            shadow-[0_20px_80px_rgba(93,56,29,0.16)]
            "
          >



            <div
              className="
              relative
              min-h-[500px]
              overflow-hidden
              rounded-md
              "
            >



              <Image

                src={door1}

                alt="Portfolio featured door"

                fill

                sizes="
                (max-width:768px) 100vw,
                50vw
                "

                priority

                className="
                object-contain
                "
              />







              <div
                className="
                absolute
                inset-0
                bg-linear-to-t
                from-black/45
                via-black/10
                to-transparent
                "
              />







              <div
                className="
                absolute
                bottom-4
                left-4
                right-4
                rounded-xl
                border
                border-[#f1e1cf]
                bg-[#34261d]/80
                p-4
                backdrop-blur-md
                "
              >



                <p
                  className="
                  text-xs
                  uppercase
                  tracking-[0.2em]
                  text-[#f7e9d8]
                  "
                >

                  {t.featured}

                </p>





                <p
                  className="
                  mt-1
                  text-sm
                  text-[#fef4e8]
                  "
                >

                  {t.featuredText}

                </p>



              </div>



            </div>



          </div>



        </div>




      </div>



    </section>

  );

}
