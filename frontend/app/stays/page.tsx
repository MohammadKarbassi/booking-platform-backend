import { Suspense } from "react";
import type { Metadata } from "next";
import { StaysExplorer } from "./stays-explorer";

export const metadata: Metadata = { title: "کشف اقامتگاه‌ها" };

export default function StaysPage() {
  return (
    <Suspense>
      <StaysExplorer />
    </Suspense>
  );
}
