import type { Metadata } from "next";

import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";


import LayoutWrapper from "../components/common/LayoutWrapper";

import { LanguageProvider } from "../context/LanguageContext";
import { AuthProvider } from "../context/AuthContext";



const geistSans = Geist({
  variable:"--font-geist-sans",
  subsets:["latin"],
});


const geistMono = Geist_Mono({
  variable:"--font-geist-mono",
  subsets:["latin"],
});



export const metadata: Metadata = {

  title:"SAS DOOR",

  description:
  "SAS DOOR - Your trusted partner for all your door needs",

};



export default function RootLayout({

children,

}:Readonly<{

children:React.ReactNode;

}>) {


return (

<html

lang="en"

data-scroll-behavior="smooth"

className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}

>


<body className="min-h-full flex flex-col">


<LanguageProvider>

<AuthProvider>


<LayoutWrapper>

{children}

</LayoutWrapper>


</AuthProvider>

</LanguageProvider>


</body>


</html>


);

}