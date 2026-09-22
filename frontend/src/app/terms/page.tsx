import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — SAS DOOR",
  description: "The terms that apply when you order a door from SAS DOOR.",
};

/** Same story as the privacy page: the footer linked here and nothing existed. */
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-[#1f1712]">Terms of Service</h1>
      <p className="mt-2 text-sm text-[#7a6a5d]">শর্তাবলী · Last updated: September 2026</p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-[#4a3d33]">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-[#1f1712]">Estimates and prices</h2>
          <p>The price shown by the door designer is an estimate. It depends on the wood, size, carving and finish you pick, and on the timber price on the day. A final price is confirmed by the shop before work begins.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[#1f1712]">Orders and payment</h2>
          <p>Work starts once an order is confirmed and the agreed advance is received. The balance is due as set out on your invoice. Every payment you make is recorded against your order.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[#1f1712]">Made to order</h2>
          <p>Doors are made to your measurements and your chosen design, so an order cannot be cancelled once cutting has begun. Tell us about any change as early as you can and we will do what we can.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[#1f1712]">Wood is a natural material</h2>
          <p>Grain, colour and figure vary from piece to piece, and a finished door will not match a photograph exactly. This is the nature of solid timber, not a defect.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[#1f1712]">Designs you send us</h2>
          <p>By sending a photo or drawing you confirm you are entitled to have it copied. A design stays with your own order unless you agree that we may add it to our gallery.</p>
        </section>
      </div>
    </main>
  );
}
