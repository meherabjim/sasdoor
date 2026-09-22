import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <div>
        <p className="font-mono text-4xl font-semibold text-[#c8963e]">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#1f1712]">পাতাটা খুঁজে পাওয়া গেল না</h1>
        <p className="mt-1 text-sm text-[#7a6a5d]">This page does not exist.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="rounded-lg bg-[#1f1712] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#3a2c22]">হোম</Link>
        <Link href="/design" className="rounded-lg border border-[#e0d6ca] px-5 py-2.5 text-sm font-medium text-[#1f1712] hover:bg-[#faf7f3]">দরজা ডিজাইন করুন</Link>
        <Link href="/book-visit" className="rounded-lg border border-[#e0d6ca] px-5 py-2.5 text-sm font-medium text-[#1f1712] hover:bg-[#faf7f3]">ভিজিট বুক করুন</Link>
      </div>
    </main>
  );
}
