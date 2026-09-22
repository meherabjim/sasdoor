"use client";


import Link from "next/link";


import en from "../../messages/en.json";
import bn from "../../messages/bn.json";


import { useLanguage } from "../../context/LanguageContext";



export default function ContactCard(){


const {language}=useLanguage();



const t =
language==="en"
?
en.about?.contact
:
bn.about?.contact;



if(!t) return null;



return (

<section
className="
bg-[#f6efe7]
px-4
py-16
"
>


<div
className="
mx-auto
max-w-5xl
rounded-md
bg-[#8b5a3c]
p-10
text-white
"
>



<p
className="
text-xs
font-semibold
uppercase
tracking-[0.24em]
"
>

{t.title}

</p>





<h2
className="
mt-3
text-3xl
font-semibold
"
>

{t.heading}

</h2>





<p
className="
mt-4
leading-7
"
>

{t.description}

</p>





<Link

href="/book-visit"

className="
mt-6
inline-block
rounded-md
bg-white
px-6
py-3
font-semibold
text-[#8b5a3c]
"

>

{t.button}

</Link>



</div>


</section>


);


}
