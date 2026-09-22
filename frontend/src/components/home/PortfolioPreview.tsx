"use client";


import Image from "next/image";
import Link from "next/link";


import door4 from "@/assets/door/full-design/dual-design3.png";


import en from "../../messages/en.json";
import bn from "../../messages/bn.json";


import { useLanguage } from "../../context/LanguageContext";



export default function PortfolioPreview(){


const {language}=useLanguage();



const t =
language==="en"
?
en.portfolioPreview
:
bn.portfolioPreview;




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


<div

className="
mx-auto
grid
max-w-7xl
gap-8
lg:grid-cols-[1fr_0.9fr]
lg:items-center
"

>




{/* LEFT */}


<div>


<p

className="
text-xs
font-semibold
uppercase
tracking-[0.24em]
text-[#a15e2b]
"

>

{t.badge}

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

{t.title}

</h2>




<p

className="
mt-5
max-w-xl
text-sm
leading-7
text-[#6d5442]
"

>

{t.description}

</p>





<div

className="
mt-8
flex
flex-wrap
gap-3
"

>


{

t.tags.map((item)=>(


<span

key={item}

className="
rounded-full
border
border-[#d9be9b]
bg-white/70
px-4
py-2
text-sm
text-[#634a38]
"

>

{item}

</span>


))


}



</div>






<div className="mt-8">


<Link

href="/portfolio"

className="
inline-flex
items-center
justify-center
rounded-full
border
border-[#d9be9b]
bg-white/70
px-6
py-3
text-sm
font-semibold
text-[#2f241d]
hover:bg-white
"

>

{t.button}

</Link>


</div>



</div>









{/* IMAGE */}



<div className="relative">



<div

className="
absolute
-right-6
top-8
h-32
w-32
rounded-full
bg-[#b86a2f]/20
blur-3xl
"

/>





<div

className="
relative
overflow-hidden
rounded-md
border
border-[#d9be9b]
bg-[#fffaf4]
p-3
shadow-[0_20px_80px_rgba(93,56,29,0.14)]
"

>




{/* FIXED HEIGHT FOR IMAGE FILL */}

<div

className="
relative
h-[500px]
overflow-hidden
rounded-md
"

>



<Image

src={door4}

alt="Custom door portfolio preview"

fill

priority

sizes="
(max-width:768px) 100vw,
50vw
"

className="
object-contain
"

/>





<div

className="
absolute
inset-0
bg-gradient-to-t
from-black/45
via-black/10
to-transparent
"

/>






<div

className="
absolute
bottom-4
left-4
right-4
rounded-md
border
border-[#f1e1cf]
bg-[#34261d]/80
p-4
"

>



<p

className="
text-xs
uppercase
tracking-[0.2em]
text-[#f7e9d8]
"

>

{t.featured}

</p>



<p

className="
mt-1
text-sm
text-[#fef4e8]
"

>

{t.featuredText}

</p>



</div>





</div>



</div>



</div>



</div>



</section>



);


}