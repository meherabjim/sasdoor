"use client";

import { EstimatesList } from "@/components/erp/EstimatesList";
import { PageHeader } from "@/components/erp/ui";

/**
 * What customers sent in from the website.
 *
 * Two kinds land here. One picked a carving out of the gallery, so it already has a real
 * price and only needs making into an order. The other traced a carving from their own
 * photo: nobody has ever quoted that one, so it carries a "Needs a price" badge and waits
 * for Review & price before it can go any further.
 */
export default function RequestsPage() {
  return (
    <>
      <PageHeader title="Customer Requests" sub="Only doors where the customer sent in a carving of their own. Price the carving and it goes to them; they order it or turn it down. One picked from your gallery never lands here — it goes straight to Orders." />
      <EstimatesList scope="requests" />
    </>
  );
}
