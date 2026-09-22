"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { checkAccount } from "@/services/demoAuth.service";


export default function ForgotPasswordPage(){

const router = useRouter();

const [value,setValue] = useState("");
const [error,setError] = useState("");


function submit(){

const user = checkAccount(value);


if(!user){

setError("Account not found");

return;

}


localStorage.setItem(
"resetEmail",
user.email
);


router.push("/verify-otp");

}



return (

<div className="
min-h-screen
bg-[#f3e6d6]
flex
items-center
justify-center
">


<div className="
w-[450px]
rounded-3xl
bg-[#fff8ef]
border
border-[#d7b48a]
p-10
shadow-xl
">


<h1 className="
text-3xl
font-bold
text-[#60331b]
text-center
">
Forgot Password
</h1>


<p className="
mt-3
text-center
text-[#805034]
">
Enter your email or phone number
</p>



<input

value={value}

onChange={(e)=>setValue(e.target.value)}

placeholder="Email / Phone"

className="
mt-6
w-full
rounded-xl
border
border-[#d7b48a]
bg-[#eef3ff]
px-5
py-3
"

/>



{error &&

<p className="
mt-3
text-red-600
text-sm
">
{error}
</p>

}



<button

onClick={submit}

className="
mt-6
w-full
rounded-xl
bg-[#ad6c3d]
py-3
font-bold
text-white
"
>

Send OTP

</button>


<Link

href="/login"

className="
block
mt-5
text-center
text-[#ad6c3d]
"
>

Back to Login

</Link>


</div>


</div>

)

}
