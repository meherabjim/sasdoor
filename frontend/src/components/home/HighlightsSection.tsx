"use client";

import { FaTools } from "react-icons/fa";
import {
  FaPalette,
  FaRulerCombined,
  FaShieldHalved,
} from "react-icons/fa6";

import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

import { useLanguage } from "../../context/LanguageContext";


const icons = [
  FaPalette,
  FaShieldHalved,
  FaRulerCombined,
  FaTools,
];


export default function HighlightsSection() {


  const { language } = useLanguage();


  const t =
    language === "en"
      ? en.highlights
      : bn.highlights;



  const items = t?.items ?? [];



  return (

    <section
      className="
      bg-[#fbf4eb]
      px-4
      py-14
      text-[#2f241d]
      lg:py-20
      "
    >


      <div className="mx-auto max-w-7xl">



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

            {t?.title}

          </p>





          <h2
            className="
            mt-3
            text-3xl
            font-semibold
            tracking-tight
            sm:text-4xl
            "
          >

            {t?.heading}

          </h2>


        </div>







        <div
          className="
          mt-10
          grid
          gap-4
          md:grid-cols-2
          xl:grid-cols-4
          "
        >



          {items.map((item, index) => {


            const Icon =
              icons[index] || FaTools;



            return (


              <article

                key={item.title}

                className="
                group
                rounded-md
                border
                border-[#e3c8a7]
                bg-white/70
                p-6
                backdrop-blur-sm
                transition-transform
                duration-300
                hover:-translate-y-1
                hover:bg-white
                "

              >




                <div

                  className="
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-md
                  bg-[#9b5528]/15
                  text-[#9b5528]
                  transition-colors
                  group-hover:bg-[#9b5528]/20
                  "

                >

                  <Icon className="text-xl" />

                </div>






                <h3

                  className="
                  mt-5
                  text-lg
                  font-semibold
                  text-[#2f241d]
                  "

                >

                  {item.title}

                </h3>






                <p

                  className="
                  mt-3
                  text-sm
                  leading-7
                  text-[#6d5442]
                  "

                >

                  {item.description}

                </p>




              </article>


            );


          })}



        </div>




      </div>



    </section>


  );

}
