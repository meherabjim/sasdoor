"use client";

import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

import { useLanguage } from "../../context/LanguageContext";


export default function BookVisitStepsSection() {


  const { language } = useLanguage();


  const t =
    language === "en"
      ? en.bookVisit?.steps
      : bn.bookVisit?.steps;


  if (!t) return null;



  return (

    <section className="px-4 pb-14 lg:pb-20">


      <div className="mx-auto max-w-7xl">


        <div className="max-w-3xl mb-10">


          <p className="
          text-xs
          font-semibold
          uppercase
          tracking-[0.24em]
          text-[#a15e2b]
          ">
            {t.badge}
          </p>



          <h2 className="
          mt-3
          text-3xl
          font-semibold
          tracking-tight
          text-[#2f241d]
          sm:text-4xl
          ">
            {t.heading}
          </h2>


        </div>




        <div className="grid gap-4 lg:grid-cols-3">


          {t.items.map((step)=>(


            <article
              key={step.title}
              className="
              rounded-md
              border
              border-[#e3c8a7]
              bg-white/70
              p-6
              shadow-[0_14px_40px_rgba(93,56,29,0.06)]
              "
            >


              <p className="
              text-xs
              font-semibold
              uppercase
              tracking-[0.24em]
              text-[#a15e2b]
              ">
                {step.number}
              </p>



              <h3 className="
              mt-3
              text-xl
              font-semibold
              text-[#2f241d]
              ">
                {step.title}
              </h3>



              <p className="
              mt-3
              text-sm
              leading-7
              text-[#6d5442]
              ">
                {step.text}
              </p>



            </article>


          ))}


        </div>


      </div>


    </section>

  );

}
