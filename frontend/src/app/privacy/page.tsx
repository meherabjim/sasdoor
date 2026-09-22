import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — SAS DOOR",
  description: "How SAS DOOR collects, uses and protects the information you share with us.",
};

/**
 * The footer has always linked here; the page never existed, so both links 404'd.
 * This is a plain, honest baseline describing what the site actually does - a visit
 * booking form, an account, and a design request. Have it checked before you rely on it.
 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-[#1f1712]">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[#7a6a5d]">গোপনীয়তা নীতি · Last updated: September 2026</p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-[#4a3d33]">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-[#1f1712]">What we collect</h2>
          <p>When you book a visit, request a door design or create an account, we ask for your name, phone number and address. If you send us a photo of a door, we keep that photo so we can prepare your design.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[#1f1712]">Why we keep it</h2>
          <p>To contact you about your order, to prepare an estimate, to keep a record of what was made and what was paid, and to arrange delivery and fitting. We do not sell your information, and we do not share it with anyone except where we are required to by law.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[#1f1712]">Your account</h2>
          <p>If you create an account, your password is stored only in encrypted form — nobody at SAS DOOR can read it. Your order history is shown to you only after we have confirmed your phone number belongs to you.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[#1f1712]">Your design photos</h2>
          <p>A photo you bring us is used for your own order. It is not shown to other customers unless you tell us it may be added to our public design gallery.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-[#1f1712]">Asking us to remove your information</h2>
          <p>Write to us or call the shop and we will remove what we are not required to keep for accounting purposes. Contact details are in the footer of every page.</p>
        </section>
      </div>
    </main>
  );
}
