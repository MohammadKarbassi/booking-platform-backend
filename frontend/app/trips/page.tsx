import { Suspense } from "react";
import type { Metadata } from "next";
import { RequireAuth } from "@/components/require-auth";
import { Trips } from "./trips";

export const metadata: Metadata = { title: "سفرنامهٔ من" };

export default function TripsPage() {
  return (
    <Suspense>
      <RequireAuth what="سفرنامه‌ات">
        <Trips />
      </RequireAuth>
    </Suspense>
  );
}
