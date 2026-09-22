// All images used on the public website. Admin can replace any of them (Website Management → Chobi).
// Keys = file path inside src/assets. Same imported object is shared by every component, so replacing .src updates all.

import a0 from "@/assets/door/decorated/decorated1.png";
import a1 from "@/assets/door/decorated/decorated2.png";
import a2 from "@/assets/door/decorated/decorated3.png";
import a3 from "@/assets/door/decorated/decorated4.png";
import a4 from "@/assets/door/full-design/design1.png";
import a5 from "@/assets/door/full-design/design10.png";
import a6 from "@/assets/door/full-design/design11.png";
import a7 from "@/assets/door/full-design/design12.png";
import a8 from "@/assets/door/full-design/design13.png";
import a9 from "@/assets/door/full-design/design14.png";
import a10 from "@/assets/door/full-design/design2.png";
import a11 from "@/assets/door/full-design/design3.png";
import a12 from "@/assets/door/full-design/design4.png";
import a13 from "@/assets/door/full-design/design5.png";
import a14 from "@/assets/door/full-design/design6.png";
import a15 from "@/assets/door/full-design/design7.png";
import a16 from "@/assets/door/full-design/design8.png";
import a17 from "@/assets/door/full-design/design9.png";
import a18 from "@/assets/door/full-design/dual-design1.png";
import a19 from "@/assets/door/full-design/dual-design2.png";
import a20 from "@/assets/door/full-design/dual-design3.png";
import a21 from "@/assets/logo/sas_door_logo.png";

export const SITE_ASSETS: Record<string, { img: { src: string }; usedIn: string[] }> = {
  "door/decorated/decorated1.png": { img: a0 as unknown as { src: string }, usedIn: ["Home", "Portfolio"] },
  "door/decorated/decorated2.png": { img: a1 as unknown as { src: string }, usedIn: ["Home", "Portfolio"] },
  "door/decorated/decorated3.png": { img: a2 as unknown as { src: string }, usedIn: ["Home", "Portfolio"] },
  "door/decorated/decorated4.png": { img: a3 as unknown as { src: string }, usedIn: ["Book Visit"] },
  "door/full-design/design1.png": { img: a4 as unknown as { src: string }, usedIn: ["Portfolio"] },
  "door/full-design/design10.png": { img: a5 as unknown as { src: string }, usedIn: ["Portfolio"] },
  "door/full-design/design11.png": { img: a6 as unknown as { src: string }, usedIn: ["Portfolio"] },
  "door/full-design/design12.png": { img: a7 as unknown as { src: string }, usedIn: ["Portfolio"] },
  "door/full-design/design13.png": { img: a8 as unknown as { src: string }, usedIn: ["Portfolio"] },
  "door/full-design/design14.png": { img: a9 as unknown as { src: string }, usedIn: ["Portfolio"] },
  "door/full-design/design2.png": { img: a10 as unknown as { src: string }, usedIn: ["Portfolio"] },
  "door/full-design/design3.png": { img: a11 as unknown as { src: string }, usedIn: ["Portfolio"] },
  "door/full-design/design4.png": { img: a12 as unknown as { src: string }, usedIn: ["Portfolio"] },
  "door/full-design/design5.png": { img: a13 as unknown as { src: string }, usedIn: ["Portfolio"] },
  "door/full-design/design6.png": { img: a14 as unknown as { src: string }, usedIn: ["Login", "Portfolio"] },
  "door/full-design/design7.png": { img: a15 as unknown as { src: string }, usedIn: ["Portfolio"] },
  "door/full-design/design8.png": { img: a16 as unknown as { src: string }, usedIn: ["Portfolio"] },
  "door/full-design/design9.png": { img: a17 as unknown as { src: string }, usedIn: ["Portfolio"] },
  "door/full-design/dual-design1.png": { img: a18 as unknown as { src: string }, usedIn: ["Portfolio"] },
  "door/full-design/dual-design2.png": { img: a19 as unknown as { src: string }, usedIn: ["About", "Portfolio", "Safety & Security"] },
  "door/full-design/dual-design3.png": { img: a20 as unknown as { src: string }, usedIn: ["Home", "Portfolio"] },
  "logo/sas_door_logo.png": { img: a21 as unknown as { src: string }, usedIn: ["Login", "Navbar/Footer"] },
};

/** original src, so an override can be reset */
export const ORIGINAL_SRC: Record<string, string> = Object.fromEntries(Object.entries(SITE_ASSETS).map(([k, v]) => [k, v.img.src]));
