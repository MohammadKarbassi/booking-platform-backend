"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Direction } from "radix-ui";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { SoundProvider } from "@/lib/sound";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );
  return (
    <Direction.DirectionProvider dir="rtl">
      <QueryClientProvider client={client}>
        <AuthProvider>
          <SoundProvider>
            <TooltipProvider delayDuration={200}>
              {children}
              <Toaster position="top-center" dir="rtl" richColors closeButton />
            </TooltipProvider>
          </SoundProvider>
        </AuthProvider>
      </QueryClientProvider>
    </Direction.DirectionProvider>
  );
}
