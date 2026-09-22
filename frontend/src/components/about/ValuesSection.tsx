"use client";

import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

import { useLanguage } from "../../context/LanguageContext";


export default function ValuesSection() {


  const { language } = useLanguage();


  const t =
    language === "en"
      ? en.about?.values
      : bn.about?.values;



  if (!t) return null;



  return (

    <section
      className="
        bg-[#f7efe6]
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
            {t.title}
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
            {t.heading}
          </h2>


        </div>





        <div
          className="
            mt-10
            grid
            gap-5
            md:grid-cols-3
          "
        >


          {t.items?.map((item)=>(
            
            <article

              key={item.title}

              className="
                rounded-md
                border
                border-[#e3c8a7]
                bg-white/70
                p-6
                transition
                hover:-translate-y-1
              "

            >


              <h3
                className="
                  text-xl
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


          ))}


        </div>


      </div>


    </section>

  );

}
