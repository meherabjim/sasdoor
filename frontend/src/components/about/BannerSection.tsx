"use client";

import Image from "next/image";

import aboutImage from "@/assets/door/full-design/dual-design2.png";

import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

import { useLanguage } from "../../context/LanguageContext";


export default function BannerSection() {


  const { language } = useLanguage();


  const t =
    language === "en"
      ? en.about.banner
      : bn.about.banner;



  return (

    <section
      className="
        relative
        overflow-hidden
        bg-[#f6efe7]
        px-4
        py-16
        text-[#2f241d]
        lg:py-24
      "
    >


      <div
        className="
          mx-auto
          grid
          max-w-7xl
          gap-10
          lg:grid-cols-2
          lg:items-center
        "
      >



        <div>


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
              sm:text-5xl
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
            "
          >

            {t.description}

          </p>



        </div>






        <div
          className="
            relative
            h-[420px]
            overflow-hidden
            rounded-md
          "
        >


          <Image

            src={aboutImage}

            alt="SAS Door premium entrance"

            fill

            sizes="(max-width: 768px) 100vw, 50vw"

            priority

            className="object-cover"

          />





          <div
            className="
              absolute
              bottom-5
              left-5
              right-5
              rounded-md
              bg-black/50
              p-4
              text-white
            "
          >


            <p className="text-sm font-semibold">

              {t.imageTitle}

            </p>




            <p className="mt-2 text-sm">

              {t.imageText}

            </p>



          </div>



        </div>



      </div>



    </section>


  );

}
