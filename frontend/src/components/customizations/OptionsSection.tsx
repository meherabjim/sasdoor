"use client";


import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

import { useLanguage } from "../../context/LanguageContext";



export default function OptionsSection(){


const {language}=useLanguage();



const t =
language==="en"
?
en.customizations?.options
:
bn.customizations?.options;



if(!t) return null;



return(

<section className="bg-[#fbf4eb] px-4 py-14 text-[#2f241d] lg:py-20">


<div className="mx-auto max-w-7xl">


<div className="max-w-3xl">


<p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a15e2b]">

{t.badge}

</p>


<h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">

{t.heading}

</h2>


</div>



<div className="mt-10 grid gap-4 lg:grid-cols-3">


{t.items.map((option)=>(


<article
key={option.title}
className="
rounded-md
border
border-[#e3c8a7]
bg-white/70
p-6
"
>


<h3 className="text-lg font-semibold">

{option.title}

</h3>



<p className="mt-3 text-sm leading-7 text-[#6d5442]">

{option.text}

</p>



</article>


))}


</div>


</div>


</section>

);


}
