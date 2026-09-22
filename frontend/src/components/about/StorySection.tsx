"use client";


import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

import { useLanguage } from "../../context/LanguageContext";


export default function StorySection(){


const {language}=useLanguage();


const t =
language==="en"
?
en.about?.story
:
bn.about?.story;



if(!t) return null;



return(

<section className="bg-[#fbf4eb] px-4 py-16 text-[#2f241d]">


<div className="mx-auto max-w-7xl">


<p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a15e2b]">

{t.title}

</p>



<h2 className="mt-3 text-3xl font-semibold">

{t.heading}

</h2>




<div className="mt-10 grid gap-5 md:grid-cols-3">


{
t.items?.map((item)=>(


<div

key={item.title}

className="
rounded-md
border
border-[#e3c8a7]
bg-white
p-6
"


>


<h3 className="text-xl font-semibold">

{item.title}

</h3>



<p className="mt-3 text-sm leading-7 text-[#6d5442]">

{item.description}

</p>


</div>


))
}


</div>


</div>


</section>


);


}
