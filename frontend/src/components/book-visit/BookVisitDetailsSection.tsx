"use client";

import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

import { FormEvent, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { apiRequest } from "@/lib/api";


export default function BookVisitDetailsSection() {


  const { language } = useLanguage();
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submitVisit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    let phone = String(fd.get("phone") || "").replace(/[^0-9]/g, "").replace(/^880/, "");
    if (/^1\d{9}$/.test(phone)) phone = `0${phone}`;
    const note = [String(fd.get("email") || "") && `Email: ${fd.get("email")}`, String(fd.get("note") || "")].filter(Boolean).join("\n");
    setSending(true); setMsg(null);
    try {
      await apiRequest("/api/public/book-visit", { method: "POST", body: JSON.stringify({ name: fd.get("name"), phone, preferredDate: fd.get("preferredDate") || null, note: note || null }) });
      form.reset();
      setMsg({ ok: true, text: language === "en" ? "Request sent! We will call you soon." : "রিকোয়েস্ট পাঠানো হয়েছে! আমরা শিগগিরই ফোন করব।" });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Failed" });
    } finally { setSending(false); }
  }


  const t =
    language === "en"
      ? en.bookVisit.details
      : bn.bookVisit.details;

  // Phone and email live with the rest of the footer contact text, so there is one
  // place to change them rather than two hardcoded strings on this page.
  const contact = language === "en" ? en.footer : bn.footer;



  if (!t) return null;



  return (

    <section className="px-4 pb-16 lg:pb-24">

      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">


        {/* LEFT SIDE */}

        <div className="space-y-6">


          <div>

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
              sm:text-4xl
            ">
              {t.heading}
            </h2>


          </div>




          <div className="
            rounded-md
            border
            border-[#e3c8a7]
            bg-white/75
            p-6
          ">


            <ul className="
              space-y-4
              text-sm
              leading-7
              text-[#6d5442]
            ">


              {t.items.map((item) => (

                <li key={item.title}>

                  <span className="font-semibold text-[#2f241d]">
                    {item.title}
                  </span>

                  <br />

                  {item.text}

                </li>

              ))}


            </ul>


          </div>





          <div className="
            rounded-md
            border
            border-[#d9be9b]
            bg-gradient-to-r
            from-white
            via-[#fff7ef]
            to-white
            p-6
          ">


            <p className="
              text-sm
              font-semibold
              uppercase
              tracking-[0.2em]
              text-[#a15e2b]
            ">
              {t.contact.title}
            </p>



            <p className="
              mt-3
              text-sm
              leading-7
              text-[#6d5442]
            ">
              {t.contact.text}
            </p>



            <div className="
              mt-4
              flex
              flex-col
              gap-2
              text-sm
              font-medium
              text-[#2f241d]
            ">


              {/* The developer's own phone and mailbox were sitting on the client's
                  contact page. Editable now (Website Management -> Footer), and hidden
                  until filled rather than sending customers to the wrong inbox. */}
              {contact.phone ? (
              <a href={`tel:${contact.phone.replace(/\s+/g, "")}`}>
                {contact.phone}
              </a>
              ) : null}


              {contact.email ? (
              <a href={`mailto:${contact.email}`}>
                {contact.email}
              </a>
              ) : null}


            </div>


          </div>


        </div>







        {/* FORM */}


        <div
          id="request-form"
          className="
            rounded-md
            border
            border-[#d9be9b]
            bg-[#fffaf4]
            p-6
            shadow-[0_20px_70px_rgba(93,56,29,0.12)]
            lg:p-8
          "
        >


          <div>


            <p className="
              text-xs
              font-semibold
              uppercase
              tracking-[0.24em]
              text-[#a15e2b]
            ">
              {language === "en"
                ? "Request form"
                : "রিকোয়েস্ট ফর্ম"}
            </p>



            <h2 className="
              mt-3
              text-3xl
              font-semibold
              tracking-tight
              sm:text-4xl
            ">

              {language === "en"
                ? "Tell us about your project."
                : "আপনার প্রজেক্ট সম্পর্কে জানান।"}

            </h2>


          </div>





          <form onSubmit={submitVisit} className="mt-8 grid gap-4">


            <div className="grid gap-4 sm:grid-cols-2">


              <label className="grid gap-2 text-sm font-medium text-[#634a38]">

                {language === "en" ? "Full name" : "পুরো নাম"}

                <input
                  name="name"
                  required
                  minLength={2}
                  type="text"
                  placeholder={
                    language === "en"
                      ? "Your name"
                      : "আপনার নাম"
                  }
                  className="
                    rounded-md
                    border
                    border-[#d9be9b]
                    bg-white
                    px-4
                    py-3
                    text-[#2f241d]
                    outline-none
                    focus:border-[#9b5528]
                  "
                />

              </label>





              <label className="grid gap-2 text-sm font-medium text-[#634a38]">


                {language === "en"
                  ? "Phone number"
                  : "ফোন নম্বর"}


                <input
                  name="phone"
                  required
                  type="tel"
                  placeholder="(+880) 1XXXXXXXXX"
                  className="
                    rounded-md
                    border
                    border-[#d9be9b]
                    bg-white
                    px-4
                    py-3
                    text-[#2f241d]
                    outline-none
                    focus:border-[#9b5528]
                  "
                />

              </label>


            </div>






            <div className="grid gap-4 sm:grid-cols-2">


              <label className="grid gap-2 text-sm font-medium text-[#634a38]">


                {language === "en"
                  ? "Email address"
                  : "ইমেইল ঠিকানা"}


                <input
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  className="
                    rounded-md
                    border
                    border-[#d9be9b]
                    bg-white
                    px-4
                    py-3
                    text-[#2f241d]
                    outline-none
                    focus:border-[#9b5528]
                  "
                />


              </label>





              <label className="grid gap-2 text-sm font-medium text-[#634a38]">


                {language === "en"
                  ? "Preferred visit date"
                  : "পছন্দের ভিজিট তারিখ"}



                <input
                  name="preferredDate"
                  type="date"
                  className="
                    rounded-md
                    border
                    border-[#d9be9b]
                    bg-white
                    px-4
                    py-3
                    text-[#2f241d]
                    outline-none
                    focus:border-[#9b5528]
                  "
                />


              </label>


            </div>






            <label className="grid gap-2 text-sm font-medium text-[#634a38]">


              {language === "en"
                ? "Project details"
                : "প্রজেক্টের বিস্তারিত"}



              <textarea
                name="note"
                rows={6}
                placeholder={
                  language === "en"
                    ? "Tell us about your door style, size, or security needs."
                    : "আপনার দরজার ডিজাইন, মাপ বা নিরাপত্তার প্রয়োজন সম্পর্কে জানান।"
                }
                className="
                  rounded-md
                  border
                  border-[#d9be9b]
                  bg-white
                  px-4
                  py-3
                  text-[#2f241d]
                  outline-none
                  focus:border-[#9b5528]
                "
              />


            </label>





            {msg && <p role="status" className={`rounded-md p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
            <button
              type="submit"
              disabled={sending}
              className="
                disabled:opacity-60
                mt-2
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

              {language === "en"
                ? "Submit request"
                : "রিকোয়েস্ট পাঠান"}

            </button>



          </form>


        </div>



      </div>


    </section>

  );

}
