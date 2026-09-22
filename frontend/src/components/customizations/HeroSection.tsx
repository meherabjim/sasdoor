"use client";

import Link from "next/link";

import {
  FaPalette,
  FaRulerCombined,
  FaScrewdriverWrench,
} from "react-icons/fa6";

import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

import { useLanguage } from "../../context/LanguageContext";


const icons = [
  FaPalette,
  FaRulerCombined,
  FaScrewdriverWrench,
];


export default function HeroSection() {


  const { language } = useLanguage();


  const t =
    language === "en"
      ? en.customizations?.hero
      : bn.customizations?.hero;



  if (!t) return null;



  return (

    <section className="relative overflow-hidden bg-[#f6efe7] text-[#2f241d]">


      <div
        className="
          absolute
          inset-0
          bg-[radial-gradient(circle_at_top_left,rgba(177,104,47,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(122,78,42,0.12),transparent_28%)]
        "
      />


      <div
        className="
          relative
          mx-auto
          grid
          max-w-7xl
          gap-8
          px-4
          py-10
          sm:gap-10
          sm:py-14
          lg:grid-cols-[1.05fr_0.95fr]
          lg:items-center
          lg:px-0
          lg:py-20
        "
      >


        <div className="max-w-3xl">


          <div
            className="
              inline-flex
              items-center
              rounded-full
              border
              border-[#d9be9b]
              bg-white/70
              px-4
              py-2
              text-xs
              font-medium
              uppercase
              tracking-[0.22em]
              text-[#8a5330]
            "
          >

            {t.badge}

          </div>



          <h1
            className="
              mt-6
              text-3xl
              font-semibold
              leading-tight
              tracking-tight
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




          <div className="mt-8 flex flex-col gap-3 sm:flex-row">


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
                hover:bg-[#7e4320]
              "
            >

              {t.button1}

            </Link>



            <Link
              href="/technicalities"
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
              "
            >

              {t.button2}

            </Link>


          </div>




          <div className="mt-8 flex flex-wrap gap-2">


            {t.highlights.map((item)=>(
              <span
                key={item}
                className="
                  rounded-full
                  border
                  border-[#d9be9b]
                  bg-white/65
                  px-4
                  py-2
                  text-xs
                "
              >

                {item}

              </span>
            ))}


          </div>



        </div>





        <div
          className="
            rounded-md
            border
            border-[#e3c8a7]
            bg-[#fffaf4]
            p-4
            shadow-[0_20px_80px_rgba(93,56,29,0.12)]
            sm:p-6
          "
        >


          <div className="grid gap-3 sm:grid-cols-2">


          {t.cards.map((item,index)=>{


            const Icon = icons[index];


            return (

              <div
                key={item.title}
                className="
                  rounded-md
                  border
                  border-[#e7d3bc]
                  bg-[#f8ebdc]
                  p-4
                "
              >


                <div
                  className="
                    flex
                    h-11
                    w-11
                    items-center
                    justify-center
                    rounded-md
                    bg-[#9b5528]/12
                    text-[#9b5528]
                  "
                >

                  <Icon className="text-lg"/>

                </div>



                <h3 className="mt-4 text-base font-semibold">

                  {item.title}

                </h3>



                <p className="mt-2 text-sm leading-6 text-[#6d5442]">

                  {item.text}

                </p>


              </div>

            );


          })}



          </div>


        </div>



      </div>


    </section>

  );

}
