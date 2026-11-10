import { Suspense } from "react";
import type { Metadata } from "next";
import { RequireAuth } from "@/components/require-auth";
import { Checkout } from "./checkout";

export const metadata: Metadata = { title: "پرداخت رزرو" };

export default async function CheckoutPage({ params }: PageProps<"/checkout/[id]">) {
  const { id } = await params;
  return (
    <Suspense>
      <RequireAuth what="این رزرو">
        <Checkout id={Number(id)} />
      </RequireAuth>
    </Suspense>
  );
}
