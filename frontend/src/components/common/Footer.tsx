"use client";

import Image from "next/image";
import Link from "next/link";

import Logo from "@/assets/logo/sas_door_logo.png";

import { BsInstagram, BsWhatsapp } from "react-icons/bs";
import { FaFacebook } from "react-icons/fa";

import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

import { useLanguage } from "../../context/LanguageContext";


export default function Footer() {


const { language,setLanguage } = useLanguage();


const t =
language==="en"
? en.footer
: bn.footer;



return (

<footer className="
bg-[#f6efe7]
text-[#2f241d]
border-t
border-[#e3c8a7]
">


<div className="
mx-auto
max-w-7xl
px-4
py-10
lg:py-14
">


<div className="
grid
grid-cols-1
gap-10
lg:grid-cols-3
">



{/* COMPANY */}

<div className="space-y-4">


<div className="w-28">

<Image
src={Logo}
alt="SAS DOOR"
width={240}
height={240}
className="w-full h-auto"
/>

</div>



<h4 className="
font-semibold
text-lg
text-[#2f241d]
">

{t.company}

</h4>



<address className="
not-italic
text-sm
leading-7
text-[#6d5442]
">


<p>
{t.office}
</p>


<p>
{t.factory}
</p>


</address>


</div>





{/* LINKS */}


<div className="lg:col-span-2">


<div className="
flex
flex-col
gap-8
lg:flex-row
lg:justify-between
">



<nav>


<ul className="
flex
gap-5
text-sm
font-medium
text-[#6d5442]
">


<li>
<Link
href="/"
className="hover:text-[#a15e2b]"
>
{t.home}
</Link>
</li>


<li>
<Link
href="/portfolio"
className="hover:text-[#a15e2b]"
>
{t.portfolio}
</Link>
</li>



<li>
<Link
href="/book-visit"
className="hover:text-[#a15e2b]"
>
{t.bookVisit}
</Link>
</li>


</ul>


</nav>





<p className="
max-w-xl
text-sm
leading-7
text-[#6d5442]
">

{t.description}

</p>




</div>







<div className="
mt-8
flex
justify-end
items-center
gap-5
">


<div className="
flex
gap-2
text-sm
text-[#6d5442]
">


<button
onClick={()=>setLanguage("en")}
className="hover:text-[#a15e2b]"
>
English
</button>


<span>|</span>


<button
onClick={()=>setLanguage("bn")}
className="hover:text-[#a15e2b]"
>
বাংলা
</button>


</div>




<div className="
flex
gap-4
text-[#6d5442]
">


{/* Placeholder links used to point at instagram.com / facebook.com / an empty wa.me.
    They are editable text now (Website Management -> Footer) and simply do not render
    until a real address is filled in - better an absent icon than one that goes nowhere. */}
{t.instagram ? (
<Link href={t.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
<BsInstagram/>
</Link>
) : null}


{t.whatsapp ? (
<Link href={t.whatsapp.startsWith("http") ? t.whatsapp : `https://wa.me/${t.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
<BsWhatsapp/>
</Link>
) : null}


{t.facebook ? (
<Link href={t.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
<FaFacebook/>
</Link>
) : null}


</div>


</div>



</div>


</div>


</div>





{/* COPYRIGHT */}


<div className="
bg-[#2b160c]
text-white
">


<div className="
mx-auto
max-w-7xl
px-4
py-4
flex
flex-col
gap-3
items-center
justify-between
text-sm
lg:flex-row
">


<div className="text-white/80">


Copyright © {new Date().getFullYear()} SAS DOOR, {t.copyright}{" "}


<a
href="https://www.neurosoftic.com"
target="_blank"
className="underline"
>

NeuroSoftic

</a>


</div>



<div className="
flex
gap-5
text-white/80
">


<Link href="/privacy">
{t.privacy}
</Link>


<Link href="/terms">
{t.terms}
</Link>


</div>


</div>


</div>



</footer>

);


}