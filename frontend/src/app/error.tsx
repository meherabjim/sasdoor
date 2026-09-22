"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Anything that throws on the client used to land on Next's default error screen -
 * a blank page with a stack trace on it. This is the same thing in the site's own
 * clothes, in both languages, with a way out.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold text-[#1f1712]">কিছু একটা ভুল হয়েছে</h1>
        <p className="mt-1 text-sm text-[#7a6a5d]">Something went wrong on our side.</p>
      </div>
      <p className="max-w-md text-sm text-[#7a6a5d]">
        আবার চেষ্টা করুন। বারবার হলে আমাদের জানান — সমস্যাটা আমাদের দিকে, আপনার কিছু হারায়নি।
      </p>
      <div className="flex gap-3">
        <button onClick={reset} className="rounded-lg bg-[#1f1712] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#3a2c22]">
          আবার চেষ্টা করুন
        </button>
        <Link href="/" className="rounded-lg border border-[#e0d6ca] px-5 py-2.5 text-sm font-medium text-[#1f1712] hover:bg-[#faf7f3]">
          হোমে ফিরুন
        </Link>
      </div>
      {error.digest && <p className="font-mono text-xs text-[#b3a597]">ref: {error.digest}</p>}
    </main>
  );
}
