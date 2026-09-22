"use client";

import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

import { useLanguage } from "../../context/LanguageContext";


export default function ProcessSection() {

  const { language } = useLanguage();


  const t =
    language === "en"
      ? en.process
      : bn.process;


  return (

    <section className="bg-[#f7efe6] px-4 py-14 text-[#2f241d] lg:py-20">

      <div className="mx-auto max-w-7xl">


        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">


          <div>

            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a15e2b]">
              {t.title}
            </p>


            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t.heading}
            </h2>


          </div>



          <p className="max-w-2xl text-sm leading-7 text-[#6d5442] lg:justify-self-end lg:text-right">
            {t.description}
          </p>


        </div>



        <div className="mt-10 grid gap-4 lg:grid-cols-3">


          {t.steps.map((step) => (

            <article

              key={step.number}

              className="
              rounded-md
              border
              border-[#e3c8a7]
              bg-linear-to-b
              from-white
              to-[#f7ebdc]
              p-6
              shadow-[0_18px_60px_rgba(93,56,29,0.08)]
              "

            >


              <div
                className="
                inline-flex
                items-center
                rounded-full
                border
                border-[#d9be9b]
                bg-white/70
                px-3
                py-1
                text-xs
                font-semibold
                tracking-[0.2em]
                text-[#7a563d]
                "
              >

                {step.number}

              </div>



              <h3
                className="
                mt-5
                text-xl
                font-semibold
                text-[#2f241d]
                "
              >

                {step.title}

              </h3>



              <p
                className="
                mt-3
                text-sm
                leading-7
                text-[#6d5442]
                "
              >

                {step.text}

              </p>



            </article>


          ))}


        </div>


      </div>


    </section>

  );

}
