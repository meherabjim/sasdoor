"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { verifyDemoOTP } from "@/services/demoAuth.service";


export default function VerifyOTPPage(){

const router = useRouter();

const [otp,setOtp] = useState("");
const [error,setError] = useState("");


function verify(){

const ok = verifyDemoOTP(otp);


if(!ok){

setError("Invalid OTP");

return;

}


router.push("/reset-password");

}



return (

<div

className="
min-h-screen
bg-[#f3e6d6]
flex
items-center
justify-center
"

>


<div

className="
w-[450px]
rounded-3xl
bg-[#fff8ef]
border
border-[#d7b48a]
p-10
shadow-xl
"

>


<h1

className="
text-3xl
font-bold
text-center
text-[#60331b]
"

>
Verify OTP
</h1>


<p

className="
mt-3
text-center
text-[#805034]
"

>
Enter your 4 digit OTP
</p>



<input

value={otp}

onChange={(e)=>setOtp(e.target.value)}

maxLength={4}

placeholder="1234"

className="
mt-6
w-full
rounded-xl
border
border-[#d7b48a]
bg-[#eef3ff]
px-5
py-3
text-center
text-xl
tracking-widest
"

/>



{error &&

<p className="
mt-3
text-red-600
text-sm
text-center
">

{error}

</p>

}




<button

onClick={verify}

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

Verify OTP

</button>


</div>


</div>

)

}
