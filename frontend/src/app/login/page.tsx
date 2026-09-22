"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import en from "@/messages/en.json";
import bn from "@/messages/bn.json";


import { loginUser } from "@/services/auth.service";
import { isAdminRole, useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

import doorImage from "@/assets/door/full-design/design6.png";
import sasLogo from "@/assets/logo/sas_door_logo.png";


function roleFromResponse(response: Record<string, unknown>) {

  const data =
    response.data && typeof response.data === "object"
      ? response.data as Record<string, unknown>
      : null;


  const user =
    response.user && typeof response.user === "object"
      ? response.user as Record<string, unknown>
      : data?.user && typeof data.user === "object"
      ? data.user as Record<string, unknown>
      : data;


  if (!user) return null;


  const role =
    user.roleName ||
    user.role;


  return typeof role === "string"
    ? role.toUpperCase()
    : null;
}



export default function LoginPage(){

const [email,setEmail]=useState("");
const [password,setPassword]=useState("");
const [loading,setLoading]=useState(false);
const [error,setError]=useState("");


const router=useRouter();

const {login}=useAuth();

const {language}=useLanguage();


const t =
language==="en"
? en.auth
: bn.auth;



async function submit(e: FormEvent<HTMLFormElement>) {

  e.preventDefault();

  setLoading(true);
  setError("");

  try {

    const res = await loginUser({
      email,
      password
    });


    // save login data
    login(res);


    // get role
    const role = roleFromResponse(res);


    // redirect based on role

    if(isAdminRole(role)) {

      router.push("/admin");

    } 
    else {

      router.push("/");

    }


  } 
  catch(err) {

    setError(
      err instanceof Error
      ? err.message
      : t.loginFailed
    );

  } 
  finally {

    setLoading(false);

  }

}




return (

<div
className="
min-h-[calc(100vh-80px)]

bg-[#f3e6d6]

flex
items-center
justify-center

px-6
py-6
"
>


<div

className="
w-full
max-w-6xl

h-[600px]

overflow-hidden

rounded-[30px]

border
border-[#d7b48a]

bg-[#fff8ef]

shadow-xl

grid

md:grid-cols-[58%_42%]

"

>


{/* LEFT SIDE */}


<div

className="
relative
hidden
md:block

overflow-hidden

bg-[#2b170d]

"

>


<img

src={doorImage.src}

alt="SAS Door"

className="
absolute

inset-0

h-full
w-full

object-contain
scale-110

"

/>


<div

className="
absolute
inset-0

bg-[#3a1e12]/15

"

/>



<div

className="
absolute
top-8
left-8

text-[#f0c35d]

font-bold

"

>

SAS

<span className="block text-xs">
DOOR
</span>

</div>




<div

className="
absolute

bottom-10

left-8
right-8

rounded-3xl

border
border-[#d5a43b]

bg-[#492719]/85

p-6

text-[#fff5e6]

"

>


<h1

className="
text-4xl
font-bold
"

>

Smart Door

<br/>

Solutions

</h1>



<p

className="
mt-4

text-[#f5dfbf]

"

>

Secure access. Smart control.
Modern living with SASDOOR technology.

</p>




<div

className="
mt-5

flex
flex-wrap

gap-3

"

>


{

[
"Smart Lock",
"Security",
"Access Control",
"Automation"

].map(item=>(


<span

key={item}

className="
rounded-full

border
border-[#d8aa43]

px-5
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



</div>







{/* RIGHT SIDE */}



<div

className="
flex
items-center
justify-center

px-10

"

>


<div

className="
w-full
max-w-md

"

>


{/* LOGO */}

<div className="text-center">


<div

className="
flex
items-center
justify-center

gap-3

"

>


<img

src={sasLogo.src}

alt="SAS Door Logo"

className="
h-12

w-auto

object-contain

"

/>



<h1

className="
text-3xl

font-extrabold

tracking-wide

text-[#60331b]

"

>

SASDOOR

</h1>


</div>





<h2

className="
mt-5

text-[34px]

font-bold

text-[#60331b]

"

>

Welcome Back

</h2>




<p

className="
mt-2

text-[#aa6b3b]

"

>

Enter your email and password to access your account.

</p>



</div>








<form

onSubmit={submit}

className="
mt-8

grid

gap-5

"

>


<label

className="
grid
gap-2

text-sm

font-semibold

text-[#60331b]

"

>

Email / Username


<input

required

type="email"

value={email}

onChange={(e)=>setEmail(e.target.value)}

className="
rounded-xl

border
border-[#d7b48a]

bg-[#eef3ff]

px-5

py-3

outline-none

"

/>


</label>







<label

className="
grid
gap-2

text-sm

font-semibold

text-[#60331b]

"

>

Password


<input

required

type="password"

value={password}

onChange={(e)=>setPassword(e.target.value)}

className="
rounded-xl

border
border-[#d7b48a]

bg-[#eef3ff]

px-5

py-3

outline-none

"

/>


</label>






<div

className="
flex

justify-between

text-sm

text-[#9a6239]

"

>


<label className="flex gap-2">

<input type="checkbox"/>

Remember me

</label>




<Link href="/forgot-password">

Forgot Password?

</Link>


</div>






{error &&

<p

className="
rounded-lg

bg-red-50

p-3

text-sm

text-red-700

"

>

{error}

</p>

}






<button

disabled={loading}

className="
rounded-xl

bg-[#ad6c3d]

py-3

font-bold

text-white

hover:bg-[#8f542e]

transition

"

>


{

loading

?

t.loggingIn

:

"Sign In"

}


</button>




</form>






<p

className="
mt-6

text-center

text-sm

text-[#805034]

"

>

No account?


<Link

href="/register"

className="
ml-1

font-bold

text-[#ad6c3d]

"

>

Register

</Link>


</p>





</div>


</div>



</div>


</div>


);


}

