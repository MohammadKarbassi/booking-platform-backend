import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginFlow } from "./login-flow";

export const metadata: Metadata = { title: "ورود" };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginFlow />
    </Suspense>
  );
}
