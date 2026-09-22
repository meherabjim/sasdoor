"use client";


import Image from "next/image";
import Link from "next/link";


import door1 from "@/assets/door/decorated/decorated1.png";
import door2 from "@/assets/door/decorated/decorated2.png";
import door3 from "@/assets/door/decorated/decorated3.png";


import en from "../../messages/en.json";
import bn from "../../messages/bn.json";


import { useLanguage } from "../../context/LanguageContext";




export default function HeroSection(){



const {language}=useLanguage();



const t =
language==="en"
?
en.hero
:
bn.hero;





return (


<section

className="
relative
overflow-hidden
bg-[#f6efe7]
text-[#2f241d]
"

>


<div

className="
absolute
inset-0
bg-[radial-gradient(circle_at_top_left,rgba(177,104,47,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(122,78,42,0.12),transparent_28%)]
"

/>




<div

className="
relative
mx-auto
grid
max-w-7xl
gap-8
px-4
py-12
lg:grid-cols-[1.15fr_0.85fr]
lg:items-center
lg:py-20
"

>




{/* LEFT CONTENT */}


<div>


<div

className="
inline-flex
rounded-full
border
border-[#d9be9b]
bg-white/70
px-4
py-2
text-xs
tracking-[0.22em]
text-[#8a5330]
"

>

{t.badge}

</div>





<h1

className="
mt-6
text-3xl
font-semibold
leading-tight
sm:text-4xl
lg:text-6xl
"

>

{t.title}

</h1>





<p

className="
mt-5
max-w-2xl
text-sm
leading-7
text-[#634a38]
lg:text-lg
"

>

{t.description}

</p>







<div

className="
mt-8
flex
flex-col
gap-3
sm:flex-row
"

>


<Link

href="/book-visit"

className="
rounded-full
bg-[#9b5528]
px-6
py-3
text-center
text-sm
font-semibold
text-white
"

>

{t.bookVisit}

</Link>




<Link

href="/portfolio"

className="
rounded-full
border
border-[#d9be9b]
bg-white/70
px-6
py-3
text-center
text-sm
font-semibold
"

>

{t.portfolio}

</Link>


</div>







<div

className="
mt-8
flex
flex-wrap
gap-3
"

>


{
t.highlights?.map(item=>(


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
"

>

{item}

</span>


))

}


</div>



</div>









{/* RIGHT IMAGE */}



<div className="relative">



<div

className="
relative
rounded-md
border
border-[#d9be9b]
bg-[#fffaf4]
p-3
shadow-lg
"

>




<div

className="
grid
gap-3
sm:grid-cols-[1.05fr_0.95fr]
"

>




{/* MAIN IMAGE */}

<div

className="
relative
h-[420px]
overflow-hidden
rounded-md
bg-black
"

>


<Image

src={door1}

alt="Custom front door design"

fill

priority

sizes="(max-width:768px) 100vw,50vw"

className="
object-cover
"

/>


<div

className="
absolute
inset-0
bg-gradient-to-t
from-black/40
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
bg-black/50
p-4
text-white
"

>

<p className="text-xs tracking-widest">

{t.signature}

</p>


<p className="mt-1 text-sm">

{t.signatureText}

</p>


</div>



</div>









{/* SMALL IMAGES */}


<div

className="
flex
flex-col
gap-3
"

>


<div

className="
relative
h-[200px]
overflow-hidden
rounded-md
"

>

<Image

src={door2}

alt="Door design"

fill

sizes="25vw"

className="object-cover"

/>

</div>





<div

className="
relative
h-[200px]
overflow-hidden
rounded-md
"

>

<Image

src={door3}

alt="Door detail"

fill

sizes="25vw"

className="object-cover"

/>

</div>



</div>





</div>









<div

className="
mt-3
grid
gap-3
sm:grid-cols-3
"

>


{

t.cards?.map(card=>(


<div

key={card.title}

className="
rounded-md
border
border-[#e3c8a7]
bg-[#f8ebdc]
p-4
"

>


<p className="font-semibold">

{card.title}

</p>


<p className="mt-1 text-xs text-[#6d5442]">

{card.text}

</p>


</div>


))

}



</div>




</div>



</div>






</div>



</section>


);


}