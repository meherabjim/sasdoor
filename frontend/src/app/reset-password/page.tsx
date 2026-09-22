"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { updateDemoPassword } from "@/services/demoAuth.service";
import { isAdminRole } from "@/context/AuthContext";


export default function ResetPasswordPage(){

const router = useRouter();

const [password,setPassword] = useState("");
const [confirm,setConfirm] = useState("");
const [error,setError] = useState("");



const reset = () => {


if(password !== confirm){

setError("Password does not match");
return;

}



const email = localStorage.getItem("resetEmail");



if(!email){

setError("Account information missing");
return;

}



const user = updateDemoPassword(
email,
password
);



if(!user){

setError("User not found");
return;

}



// save login

localStorage.setItem(
"accessToken",
"demo-token"
);



localStorage.setItem(
"authUser",
JSON.stringify(user)
);



const role = user.role.toUpperCase();



if(isAdminRole(role)){

router.push("/admin");

}
else{

router.push("/");

}



};




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
border
border-[#d7b48a]
bg-[#fff8ef]
p-10
shadow-xl
text-center
"

>


<h1

className="
text-3xl
font-bold
text-[#60331b]
"

>
SASDOOR
</h1>



<h2

className="
mt-6
text-2xl
font-bold
text-[#60331b]
"

>
Reset Password
</h2>




<input

type="password"

placeholder="New Password"

value={password}

onChange={(e)=>setPassword(e.target.value)}

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





<input

type="password"

placeholder="Confirm Password"

value={confirm}

onChange={(e)=>setConfirm(e.target.value)}

className="
mt-4
w-full
rounded-xl
border
border-[#d7b48a]
bg-[#eef3ff]
px-5
py-3
"

/>




{
error &&

<p className="
mt-3
text-sm
text-red-600
">

{error}

</p>

}




<button

onClick={reset}

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

Reset Password

</button>




<Link

href="/login"

className="
block
mt-5
text-[#ad6c3d]
"

>

Back to Login

</Link>



</div>


</div>


)

}
