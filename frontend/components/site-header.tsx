"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookMarked,
  Compass,
  Heart,
  Hourglass,
  LayoutDashboard,
  LogOut,
  Menu,
  UserRound,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { displayName, useAuth } from "@/lib/auth";
import { useSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/stays", label: "کشف اقامتگاه‌ها", icon: Compass },
  { href: "/trips", label: "سفرنامهٔ من", icon: BookMarked, auth: true },
  { href: "/favorites", label: "نشان‌شده‌ها", icon: Heart, auth: true },
];

function SoundToggle() {
  const { enabled, toggle } = useSound();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggle}
          aria-pressed={enabled}
          className="gap-1.5 font-semibold"
        >
          {enabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          <span>صدا {enabled ? "روشن" : "خاموش"}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>روی هر کارت‌پستال مکث کن تا صدای آن‌جا را بشنوی</TooltipContent>
    </Tooltip>
  );
}

export function SiteHeader() {
  const { user, ready, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const links = NAV.filter((n) => !n.auth || user);
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Brand />
        <nav aria-label="منوی اصلی" className="ms-4 hidden items-center gap-1 md:flex">
          {links.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-ink/5",
                pathname.startsWith(n.href) && "bg-ink text-paper hover:bg-ink",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-1.5">
          <div className="hidden sm:block">
            <SoundToggle />
          </div>
          {!ready ? (
            <div className="h-9 w-24 animate-pulse rounded-full bg-ink/10" />
          ) : user ? (
            <DropdownMenu dir="rtl">
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 rounded-full border-ink ps-1.5">
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-saffron text-xs font-bold text-ink">
                      {displayName(user).slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-28 truncate sm:inline">{displayName(user)}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="font-semibold">{displayName(user)}</div>
                  <div className="text-xs text-muted-foreground" dir="ltr">
                    {user.phone}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => router.push("/trips")}>
                  <BookMarked /> سفرنامهٔ من
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push("/waitlist")}>
                  <Hourglass /> صف‌های انتظار
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push("/favorites")}>
                  <Heart /> نشان‌شده‌ها
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push("/profile")}>
                  <UserRound /> پروفایل
                </DropdownMenuItem>
                {user.role === "admin" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => router.push("/admin")}>
                      <LayoutDashboard /> پنل مدیریت
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => {
                    signOut();
                    router.push("/");
                  }}
                >
                  <LogOut /> خروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild className="journal-sm journal-press h-9 rounded-full bg-lapis px-5 font-bold">
              <Link href={loginHref}>ورود / ثبت‌نام</Link>
            </Button>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="باز کردن منو">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-paper">
              <SheetHeader>
                <SheetTitle className="text-display text-2xl">دور ایران</SheetTitle>
              </SheetHeader>
              <nav aria-label="منوی موبایل" className="flex flex-col gap-1 px-4">
                {links.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-semibold hover:bg-ink/5"
                  >
                    <n.icon className="size-5" /> {n.label}
                  </Link>
                ))}
                {user?.role === "admin" && (
                  <Link href="/admin" className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-semibold hover:bg-ink/5">
                    <LayoutDashboard className="size-5" /> پنل مدیریت
                  </Link>
                )}
                <div className="mt-3 border-t pt-3">
                  <SoundToggle />
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
