"use client";


import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

import { useLanguage } from "../../context/LanguageContext";



export default function DetailsSection(){


const {language}=useLanguage();



const t =
language==="en"
?
en.technicalities?.details
:
bn.technicalities?.details;



if(!t) return null;



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



<div className="max-w-3xl">


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
mt-10
grid
gap-4
lg:grid-cols-3
">


{t.items.map((item)=>(


<article

key={item.title}

className="
rounded-md
border
border-[#e3c8a7]
bg-white/70
p-6
"

>


<h3 className="
text-lg
font-semibold
">

{item.title}

</h3>



<p className="
mt-3
text-sm
leading-7
text-[#6d5442]
">

{item.text}

</p>


</article>


))}



</div>





<div className="
mt-10
rounded-md
border
border-[#e3c8a7]
bg-[#f8ebdc]
p-8
sm:p-10
">


<div className="
grid
gap-8
lg:grid-cols-[1.05fr_0.95fr]
lg:items-center
">


<div>


<p className="
text-xs
font-semibold
uppercase
tracking-[0.24em]
text-[#a15e2b]
">

{t.considered.badge}

</p>



<h3 className="
mt-3
text-2xl
font-semibold
sm:text-3xl
">

{t.considered.heading}

</h3>


</div>





<div className="
space-y-3
text-sm
leading-7
text-[#6d5442]
">


{t.considered.points.map((point,index)=>(

<p key={index}>
• {point}
</p>

))}



</div>


</div>


</div>



</div>


</section>


);


}
