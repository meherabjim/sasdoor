"use client";

import Link from "next/link";

import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

import { useLanguage } from "../../context/LanguageContext";


export default function CallToActionSection() {


  const { language } = useLanguage();


  const t =
    language === "en"
      ? en.cta
      : bn.cta;



  return (
    <section className="bg-[#f6efe7] px-4 py-16 text-[#2f241d] lg:py-20">

      <div className="mx-auto max-w-7xl rounded-md border border-[#d9be9b] bg-linear-to-r from-white via-[#fff7ef] to-white p-8 shadow-[0_18px_70px_rgba(93,56,29,0.10)] lg:p-12">


        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">


          <div>


            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a15e2b]">
              {t.badge}
            </p>


            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t.title}
            </h2>


            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6d5442]">
              {t.description}
            </p>


          </div>



          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">


            <Link
              href="/book-visit"
              className="inline-flex items-center justify-center rounded-full bg-[#9b5528] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#7e4320]"
            >
              {t.bookVisit}
            </Link>



            <Link
              href="/about"
              className="inline-flex items-center justify-center rounded-full border border-[#d9be9b] bg-white/70 px-6 py-3 text-sm font-semibold text-[#2f241d] transition-colors hover:bg-white"
            >
              {t.learnMore}
            </Link>


          </div>


        </div>


      </div>


    </section>
  );
}
