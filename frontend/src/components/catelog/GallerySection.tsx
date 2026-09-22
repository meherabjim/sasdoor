"use client";

import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import en from "@/messages/en.json";
import bn from "@/messages/bn.json";

import decorated1 from "@/assets/door/decorated/decorated1.png";
import decorated2 from "@/assets/door/decorated/decorated2.png";
import decorated3 from "@/assets/door/decorated/decorated3.png";

import door3 from "@/assets/door/full-design/design3.png";
import door9 from "@/assets/door/full-design/design9.png";
import design1 from "@/assets/door/full-design/design10.png";
import design11 from "@/assets/door/full-design/design11.png";
import door12 from "@/assets/door/full-design/design12.png";
import design13 from "@/assets/door/full-design/design13.png";
import design4 from "@/assets/door/full-design/design14.png";
import door6 from "@/assets/door/full-design/design6.png";


const imageSizes =
  "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw";


const GallerySection = () => {
  const { language } = useLanguage();
  const t = language === "en" ? en.portfolioProjects : bn.portfolioProjects;
  return (
    <section className="bg-[#f6efe7] px-4 py-14 text-[#2f241d] lg:py-20">

      <div className="mx-auto max-w-7xl">

        <h2 className="mb-4 text-center text-2xl font-bold">
          {t.galleryTitle}
        </h2>


        <div className="flex flex-col gap-6">


          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:h-140 lg:grid-cols-12 lg:grid-rows-2 lg:gap-6">


            <div className="grid grid-cols-2 gap-4 md:col-span-2 lg:col-span-4 lg:row-span-2 lg:grid-rows-2 lg:gap-6">


              <div className="relative min-h-45 overflow-hidden md:min-h-55 lg:min-h-0 lg:col-span-2">

                <Image
                  src={decorated1}
                  fill
                  sizes={imageSizes}
                  alt="Gallery image 1"
                  className="object-cover"
                />

              </div>


              <div className="relative min-h-45 overflow-hidden md:min-h-55 lg:min-h-0">

                <Image
                  src={door9}
                  fill
                  sizes={imageSizes}
                  alt="Gallery image 2"
                  className="object-cover"
                />

              </div>


              <div className="relative min-h-45 overflow-hidden md:min-h-55 lg:min-h-0">

                <Image
                  src={door3}
                  fill
                  sizes={imageSizes}
                  alt="Gallery image 3"
                  className="object-cover"
                />

              </div>


            </div>




            <div className="relative min-h-70 overflow-hidden md:min-h-115 lg:col-span-2 lg:row-span-2 lg:min-h-0">

              <Image
                src={design1}
                fill
                sizes={imageSizes}
                alt="Gallery featured image"
                className="object-cover"
              />

            </div>





            <div className="grid gap-4 md:col-span-1 lg:col-span-2 lg:row-span-2 lg:grid-rows-2 lg:gap-6">


              <div className="relative min-h-45 overflow-hidden md:min-h-55 lg:min-h-0">

                <Image
                  src={design11}
                  fill
                  sizes={imageSizes}
                  alt="Gallery image 4"
                  className="object-cover"
                />

              </div>


              <div className="relative min-h-45 overflow-hidden md:min-h-55 lg:min-h-0">

                <Image
                  src={design4}
                  fill
                  sizes={imageSizes}
                  alt="Gallery image 5"
                  className="object-cover"
                />

              </div>


            </div>





            <div className="relative min-h-70 overflow-hidden md:col-span-1 md:min-h-115 lg:col-span-4 lg:row-span-2 lg:min-h-0">


              <Image
                src={design11}
                fill
                sizes={imageSizes}
                alt="Gallery image 6"
                className="object-cover"
              />


            </div>


          </div>







          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:h-140 lg:grid-cols-12 lg:grid-rows-3 lg:gap-6">



            <div className="relative min-h-70 overflow-hidden md:min-h-115 lg:col-span-3 lg:row-span-3 lg:min-h-0">

              <Image
                src={design13}
                fill
                sizes={imageSizes}
                alt="Gallery alternate image 1"
                className="object-cover"
              />

            </div>




            <div className="relative min-h-45 overflow-hidden md:min-h-55 lg:col-span-5 lg:min-h-0">

              <Image
                src={decorated2}
                fill
                sizes={imageSizes}
                alt="Gallery alternate image 2"
                className="object-cover"
              />

            </div>





            <div className="relative min-h-70 overflow-hidden md:min-h-115 lg:col-span-4 lg:row-span-2 lg:min-h-0">

              <Image
                src={decorated3}
                fill
                sizes={imageSizes}
                alt="Gallery alternate image 3"
                className="object-cover"
              />

            </div>





            <div className="relative min-h-45 overflow-hidden md:min-h-55 lg:col-span-2 lg:row-span-2 lg:min-h-0">

              <Image
                src={door6}
                fill
                sizes={imageSizes}
                alt="Gallery alternate image 4"
                className="object-cover"
              />

            </div>





            <div className="relative min-h-45 overflow-hidden md:min-h-55 lg:col-span-3 lg:row-span-2 lg:min-h-0">

              <Image
                src={door12}
                fill
                sizes={imageSizes}
                alt="Gallery alternate image 5"
                className="object-cover"
              />

            </div>





            <div className="relative min-h-45 overflow-hidden md:min-h-55 lg:col-span-4 lg:min-h-0">

              <Image
                src={door12}
                fill
                sizes={imageSizes}
                alt="Gallery alternate image 6"
                className="object-cover"
              />

            </div>


          </div>


        </div>


      </div>


    </section>
  );
};


export default GallerySection;
