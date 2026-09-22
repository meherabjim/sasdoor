"use client";

import { useState } from "react";
import { EstimatesList } from "@/components/erp/EstimatesList";
import { PageHeader } from "@/components/erp/ui";

/**
 * One list, everything in it.
 *
 * There is no separate "estimates" screen, because there is no separate thing: a door you
 * quoted this morning and a door the customer paid for last week are the same record at two
 * points in its life. Splitting them into two menu items only asks you to guess which of
 * them a door is in before you can look for it. So they are all here, newest first, and the
 * status column - and the filter above it - says where each one has got to.
 */
export default function OrdersPage() {
  // ?q=01700000000 from the Customers page, read once. Straight off the URL rather than
  // through useSearchParams, which would need the whole page wrapped in a Suspense boundary
  // for the sake of one string.
  const [q] = useState(() => (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("q") ?? ""));
  return (
    <>
      <PageHeader title="Orders" sub="Doors the customer has said yes to. Open one for the whole order — door, carving, prices, the work sheet, what was paid and what is due. To find an estimate that is not an order yet, pick its status in the filter." />
      <EstimatesList scope="orders" initialQuery={q} />
    </>
  );
}
