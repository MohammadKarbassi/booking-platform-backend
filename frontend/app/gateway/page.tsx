import { Suspense } from "react";
import type { Metadata } from "next";
import { Gateway } from "./gateway";

export const metadata: Metadata = { title: "درگاه پرداخت آزمایشی" };

export default function GatewayPage() {
  return (
    <Suspense>
      <Gateway />
    </Suspense>
  );
}
