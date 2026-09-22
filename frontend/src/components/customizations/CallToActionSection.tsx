"use client";

import Link from "next/link";

import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

import { useLanguage } from "../../context/LanguageContext";


export default function CallToActionSection() {


  const { language } = useLanguage();


  const t =
    language === "en"
      ? en.customizations?.cta
      : bn.customizations?.cta;



  if (!t) return null;



  return (

    <section className="bg-[#f6efe7] px-4 py-14 lg:py-20">

      <div className="mx-auto max-w-7xl">

        <div
          className="
            rounded-md
            border
            border-[#e3c8a7]
            bg-[#fffaf4]
            p-8
            shadow-[0_18px_60px_rgba(93,56,29,0.08)]
            sm:p-10
          "
        >

          <div
            className="
              flex
              flex-col
              gap-6
              lg:flex-row
              lg:items-end
              lg:justify-between
            "
          >


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



              <h2
                className="
                  mt-3
                  text-3xl
                  font-semibold
                  tracking-tight
                  text-[#2f241d]
                  sm:text-4xl
                "
              >

                {t.title}

              </h2>


            </div>



            <Link
              href="/book-visit"
              className="
                inline-flex
                items-center
                justify-center
                rounded-md
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


      </div>


    </section>

  );

}
