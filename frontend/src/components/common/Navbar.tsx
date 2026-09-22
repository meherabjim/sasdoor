"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { BsInstagram, BsWhatsapp } from "react-icons/bs";
import { FaFacebook } from "react-icons/fa";
import { MdOutlineArrowDropDown } from "react-icons/md";

import Logo from "@/assets/logo/sas_door_logo.png";

import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

import { useLanguage } from "../../context/LanguageContext";
import { isAdminRole, useAuth } from "../../context/AuthContext";



const socialLinks = [
  {
    label:"Instagram",
    href:"https://instagram.com",
    icon:<BsInstagram />
  },
  {
    label:"WhatsApp",
    href:"https://wa.me/",
    icon:<BsWhatsapp />
  },
  {
    label:"Facebook",
    href:"https://facebook.com",
    icon:<FaFacebook />
  }
];



export default function Navbar(){


const pathname = usePathname();
const router = useRouter();


const {
language,
setLanguage
}=useLanguage();


const {
hydrated,
isAuthenticated,
role,
logout
}=useAuth();



const n =
language==="en"
?
en.navbar
:
bn.navbar;


const a =
language==="en"
?
en.auth
:
bn.auth;


const account =
language==="en"
?
en.account
:
bn.account;



const [menuOpen,setMenuOpen]=useState(false);

const [dropdown,setDropdown]=useState(false);



const dashboardHref =
isAdminRole(role)
?
"/admin"
:
"/dashboard";




const navItems=[

{
label:n.home,
href:"/"
},

{
label:n.about,
href:"/about"
},

{
label:n.features,
href:"#",
dropdown:[

{
label:n.safety,
href:"/safety-security"
},

{
label:n.technicalities,
href:"/technicalities"
},

{
label:n.customizations,
href:"/customizations"
}

]

},


{
label:n.portfolio,
href:"/portfolio"
},

{
label:n.design,
href:"/design"
}

];





return (

<nav
className="
relative
z-50
border-b
border-[#d9be9b]
bg-[#46281b]
text-white
"
>


<div
className="
mx-auto
flex
max-w-7xl
items-center
justify-between
px-4
py-3
"
>


{/* LOGO */}

<Link href="/">

<Image

src={Logo}

alt="SAS DOOR"

width={150}

height={150}

priority

className="
h-12
w-auto
lg:h-14
"

/>

</Link>





{/* DESKTOP */}

{/* The row has to hold the menu, the language switch, the account buttons, both
    calls to action and the social icons. At exactly 1280 it used to run a few pixels
    over, and the browser paid for it by breaking "Get an Estimate" across two lines.
    Tighter gaps below 1536 buy those pixels back; every button is nowrap so none of
    them can ever split again. Above 1536 the spacing is exactly what it always was. */}
<div
className="
hidden
xl:flex
items-center
gap-4
2xl:gap-6
"
>



<div className="flex items-center gap-5 2xl:gap-6 text-sm whitespace-nowrap">


{
navItems.map(item=>(


item.dropdown ?

<div

key={item.label}

className="
relative
"

onMouseEnter={()=>setDropdown(true)}

onMouseLeave={()=>setDropdown(false)}

>


<button

type="button"

onClick={()=>setDropdown(v=>!v)}

aria-expanded={dropdown}

className="
flex
items-center
gap-1
py-2
hover:text-[#f5c07a]
"

>

{item.label}

<MdOutlineArrowDropDown size={18}/>

</button>



{
dropdown &&

<div
className="
absolute
left-0
top-full
pt-2
w-56
"
>
<div
className="
rounded-lg
bg-[#21150f]
shadow-xl
overflow-hidden
"
>


{
item.dropdown.map(sub=>(

<Link

key={sub.label}

href={sub.href}

onClick={()=>setDropdown(false)}

className="
block
px-4
py-3
hover:bg-white/10
"

>

{sub.label}

</Link>

))

}


</div>
</div>

}


</div>



:


<Link

key={item.label}

href={item.href}

className={

pathname===item.href

?

"text-[#f5c07a] font-semibold"

:

"hover:text-[#f5c07a]"

}

>

{item.label}

</Link>



))

}


</div>






{/* LANGUAGE */}

<div className="flex gap-2 text-sm whitespace-nowrap shrink-0">

<button

onClick={()=>setLanguage("en")}

className={
language==="en"
?
"text-[#f5c07a] font-bold"
:
""
}

>

English

</button>


<span>|</span>


<button

onClick={()=>setLanguage("bn")}

className={
language==="bn"
?
"text-[#f5c07a] font-bold"
:
""
}

>

বাংলা

</button>


</div>







{/* AUTH */}

{

hydrated && isAuthenticated

?

<>

<Link

href={dashboardHref}

className="
rounded-md
border
border-white/40
px-4
py-2
text-sm
whitespace-nowrap
shrink-0
"

>

{account.dashboard}

</Link>



<button

onClick={()=>{

logout();

router.push("/login");

}}

className="
rounded-md
bg-white
px-4
py-2
text-sm
font-semibold
text-[#6b3f2a]
whitespace-nowrap
shrink-0
"

>

{account.logout}

</button>


</>


:


<>

<Link

href="/login"

className="
rounded-md
border
border-white/40
px-4
py-2
text-sm
whitespace-nowrap
shrink-0
"

>

{a.login}

</Link>



<Link

href="/register"

className="
rounded-md
bg-white
px-4
py-2
text-sm
font-semibold
text-[#6b3f2a]
whitespace-nowrap
shrink-0
"

>

{a.register}

</Link>


</>

}





{/* Customers design a door on /design and send the request straight in; it lands in
    the admin's "Customer requests" list. Sitting beside Book A Visit because it is the
    same kind of ask - one is "come see us", the other is "tell me the price". */}
<Link

href="/design"

className="
rounded-md
border
border-[#e58d28]
px-4
2xl:px-5
py-2
text-sm
text-[#e58d28]
whitespace-nowrap
shrink-0
"

>

{n.estimate}

</Link>


<Link

href="/book-visit"

className="
rounded-md
bg-[#e58d28]
px-4
2xl:px-5
py-2
text-sm
whitespace-nowrap
shrink-0
"

>

{n.bookVisit}

</Link>





<div className="flex gap-3 shrink-0">

{
socialLinks.map(item=>(

<Link

key={item.label}

href={item.href}

target="_blank"

rel="noreferrer"

>

{item.icon}

</Link>

))

}

</div>



</div>







{/* MOBILE BUTTON */}

<button

onClick={()=>setMenuOpen(!menuOpen)}

className="
xl:hidden
rounded
border
border-white/30
px-3
py-2
text-xl
"

>

☰

</button>


</div>






{/* MOBILE MENU */}

{

menuOpen &&

<div

className="
xl:hidden
border-t
border-white/20
px-5
py-5
space-y-3
"

>


{
navItems.map(item=>(

item.dropdown

?

<div key={item.label}>

<p className="py-2">

{item.label}

</p>


{
item.dropdown.map(sub=>(

<Link

key={sub.label}

href={sub.href}

className="
block
py-2
"

>

{sub.label}

</Link>


))

}


</div>


:


<Link

key={item.label}

href={item.href}

className="
block
py-2
"

>

{item.label}

</Link>


))

}



</div>


}



</nav>

);

}