"use client";

import Image from "next/image";
import Link from "next/link";

import door1 from "@/assets/door/decorated/decorated4.png";

import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

import { useLanguage } from "../../context/LanguageContext";


export default function BookVisitHeroSection() {


  const { language } = useLanguage();


  const t =
    language === "en"
      ? en.bookVisit?.hero
      : bn.bookVisit?.hero;



  if (!t) return null;



  return (

    <section
      className="
        relative
        overflow-hidden
        px-4
        py-16
        lg:py-24
      "
    >


      <div
        className="
          absolute
          inset-0
          bg-[radial-gradient(circle_at_top_left,rgba(177,104,47,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(122,78,42,0.12),transparent_28%)]
        "
      />



      <div
        className="
          relative
          mx-auto
          grid
          max-w-7xl
          gap-8
          px-1
          py-2
          sm:gap-10
          lg:grid-cols-[1fr_0.9fr]
          lg:items-center
          lg:px-0
        "
      >



        {/* LEFT CONTENT */}

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
              text-3xl
              font-semibold
              tracking-tight
              text-balance
              sm:text-4xl
              lg:text-6xl
            "
          >
            {t.title}
          </h1>




          <p
            className="
              mt-5
              max-w-2xl
              text-sm
              leading-7
              text-[#634a38]
              sm:text-base
              sm:leading-8
              lg:text-lg
            "
          >
            {t.description}
          </p>





          <div
            className="
              mt-8
              flex
              flex-wrap
              gap-2
              sm:gap-3
            "
          >


            {t.highlights?.map((item) => (

              <span
                key={item}
                className="
                  rounded-full
                  border
                  border-[#d9be9b]
                  bg-white/70
                  px-3
                  py-2
                  text-xs
                  text-[#634a38]
                  sm:px-4
                  sm:text-sm
                "
              >
                {item}
              </span>

            ))}


          </div>






          <div
            className="
              mt-8
              flex
              flex-col
              gap-3
              sm:flex-row
            "
          >



            <Link
              href="#request-form"
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
              {t.button1}
            </Link>





            <Link
              href="/portfolio"
              className="
                inline-flex
                items-center
                justify-center
                rounded-md
                border
                border-[#d9be9b]
                bg-white/70
                px-6
                py-3
                text-sm
                font-semibold
                text-[#2f241d]
                transition-colors
                hover:bg-white
              "
            >
              {t.button2}
            </Link>



          </div>


        </div>







        {/* IMAGE SECTION */}


        <div
          className="
            relative
            mt-2
            sm:mt-0
          "
        >



          <div
            className="
              absolute
              -left-6
              top-8
              h-28
              w-28
              rounded-full
              bg-[#b86a2f]/20
              blur-3xl
            "
          />




          <div
            className="
              relative
              overflow-hidden
              rounded-md
              border
              border-[#d9be9b]
              bg-[#fffaf4]
              p-2
              shadow-[0_20px_80px_rgba(93,56,29,0.14)]
              sm:p-3
            "
          >



            <div
              className="
                relative
                min-h-80
                overflow-hidden
                rounded-md
                sm:min-h-[500px]
              "
            >



              <Image
                src={door1}
                alt="Custom door consultation"
                fill
                sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                className="object-contain"
                priority
              />




              <div
                className="
                  absolute
                  inset-0
                  bg-gradient-to-t
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
                  rounded-md
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
                  {t.imageBadge}
                </p>




                <p
                  className="
                    mt-1
                    text-sm
                    text-[#fef4e8]
                  "
                >
                  {t.imageText}
                </p>




              </div>




            </div>


          </div>


        </div>




      </div>


    </section>

  );

}
