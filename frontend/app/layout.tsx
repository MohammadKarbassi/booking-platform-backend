import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const vazir = localFont({
  src: "./fonts/Vazirmatn.woff2",
  variable: "--font-vazir",
  weight: "100 900",
  display: "swap",
});
const lalezar = localFont({
  src: "./fonts/Lalezar-Regular.woff2",
  variable: "--font-lalezar",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "دور ایران | ایران؛ دورت بگردم", template: "%s | دور ایران" },
  description: "اقامتگاه‌هایی که نزدیک جاهای دیدنی ایران‌اند. پیدا کن، رزرو کن، کشف کن.",
};

export const viewport: Viewport = { themeColor: "#eef0ea" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fa" dir="rtl" className={`${vazir.variable} ${lalezar.variable} h-full antialiased`}>
      <body className="grain flex min-h-full flex-col">
        <Providers>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:right-3 focus:z-[100] focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
          >
            پرش به محتوا
          </a>
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
