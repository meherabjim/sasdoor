"use client";

import {
  FaShieldHalved,
  FaLock,
  FaFingerprint,
  FaHelmetSafety,
} from "react-icons/fa6";

import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

import { useLanguage } from "../../context/LanguageContext";


const icons = [
  FaShieldHalved,
  FaLock,
  FaFingerprint,
  FaHelmetSafety,
];


export default function SecurityFeatures() {


  const { language } = useLanguage();


  const t =
    language === "en"
      ? en.safetySecurity?.features
      : bn.safetySecurity?.features;



  if (!t) {
    return null;
  }



  return (

    <section className="
      bg-[#fbf4eb]
      px-4
      py-14
      text-[#2f241d]
      lg:py-20
    ">


      <div className="
        mx-auto
        max-w-7xl
      ">



        <div className="
          max-w-2xl
        ">


          <p className="
            text-xs
            font-semibold
            uppercase
            tracking-[0.24em]
            text-[#a15e2b]
          ">

            {t.title}

          </p>




          <h2 className="
            mt-3
            text-3xl
            font-semibold
            tracking-tight
            sm:text-4xl
          ">

            {t.heading}

          </h2>


        </div>






        <div className="
          mt-10
          grid
          gap-4
          md:grid-cols-2
          xl:grid-cols-4
        ">



          {t.items.map((feature,index)=>{


            const Icon = icons[index] ?? FaShieldHalved;



            return (

              <article

                key={feature.title}

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



                <div className="
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
                ">


                  <Icon className="text-xl"/>


                </div>





                <h3 className="
                  mt-5
                  text-lg
                  font-semibold
                  text-[#2f241d]
                ">

                  {feature.title}

                </h3>





                <p className="
                  mt-3
                  text-sm
                  leading-7
                  text-[#6d5442]
                ">

                  {feature.description}

                </p>




              </article>


            );


          })}



        </div>



      </div>



    </section>


  );

}
