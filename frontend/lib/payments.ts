import { api } from "@/lib/api";
import type { PaymentStart } from "@/lib/types";

/** Starts a payment and returns the URL of our simulated gateway page. */
export async function startPayment(target: { booking_id: number } | { waitlist_request_id: number }) {
  const p = await api<PaymentStart>("/payments/start", { method: "POST", body: target });
  const kind = "booking_id" in target ? "booking" : "waitlist";
  const id = "booking_id" in target ? target.booking_id : target.waitlist_request_id;
  return `/gateway?${new URLSearchParams({ authority: p.authority, amount: String(p.amount), kind, id: String(id) })}`;
}
