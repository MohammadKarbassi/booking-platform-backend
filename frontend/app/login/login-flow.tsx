"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, KeyRound, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { BrandMark } from "@/components/brand";
import { Postmark } from "@/components/postmark";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fa, jShort, today } from "@/lib/format";
import { useSound } from "@/lib/sound";
import type { User } from "@/lib/types";

const DEMO = [
  { phone: "09125555555", label: "مسافر نمونه (سارا)" },
  { phone: "09120000000", label: "مدیر سامانه" },
];

/** Accepts Persian/Arabic digits and spaces, returns 09xxxxxxxxx */
const normalizePhone = (s: string) =>
  s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\D/g, "")
    .replace(/^98/, "0")
    .replace(/^9/, "09");

export function LoginFlow() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/";
  const { user, signIn } = useAuth();
  const { stamp } = useSound();
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [code, setCode] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const valid = /^09\d{9}$/.test(phone);
  const [signedInHere, setSignedInHere] = useState(false);

  // someone already logged in who opens /login goes straight on; a fresh sign-in navigates itself
  useEffect(() => {
    if (user && !signedInHere) router.replace(next);
  }, [user, next, router, signedInHere]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const request = useMutation({
    mutationFn: (p: string) => api<{ debug_code?: string }>("/auth/otp/request", { method: "POST", body: { phone: p } }),
    onSuccess: (r) => {
      setDebugCode(r.debug_code ?? null);
      setCode("");
      setStep("code");
      setWait(60);
      toast.success("کد ورود فرستاده شد");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const verify = useMutation({
    mutationFn: (c: string) =>
      api<{ access_token: string; is_new_user: boolean; user: User }>("/auth/otp/verify", {
        method: "POST",
        body: { phone, code: c },
      }),
    onSuccess: (r) => {
      stamp();
      setSignedInHere(true);
      signIn(r.access_token, r.user);
      if (r.is_new_user || !r.user.first_name) {
        toast.success("به دور ایران خوش آمدی! اسمت را بنویس تا سفرنامه‌ات به نامت باشد.");
        router.replace(`/profile?next=${encodeURIComponent(next)}`);
      } else {
        toast.success(`خوش برگشتی ${r.user.first_name}!`);
        router.replace(next);
      }
    },
    onError: (e) => {
      setCode("");
      toast.error(errorMessage(e));
    },
  });

  return (
    <div className="mx-auto grid max-w-5xl items-center gap-12 px-4 py-14 md:grid-cols-2">
      {/* the passport */}
      <div className="relative mx-auto hidden w-full max-w-sm md:block" aria-hidden>
        <div className="rotate-[-4deg] rounded-2xl border-2 border-ink bg-lapis p-8 text-white shadow-[var(--shadow-journal)]">
          <div className="flex items-center gap-2 text-saffron">
            <BrandMark className="size-10" />
            <span className="text-display text-2xl">گذرنامهٔ سفر</span>
          </div>
          <p className="text-display mt-16 text-6xl leading-none">دور ایران</p>
          <p className="mt-3 text-sm text-white/75">هر سفر، یک مهر تازه در این گذرنامه.</p>
          <div className="mt-14 flex items-end justify-between text-xs text-white/70">
            <span>شمارهٔ گذرنامه = شمارهٔ موبایلت</span>
            <span>{jShort(today())}</span>
          </div>
        </div>
        <Postmark city="تهران" date={jShort(today())} className="absolute -top-6 -left-6 w-44 rotate-12" />
      </div>

      <div className="journal p-6 sm:p-8">
        {step === "phone" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) request.mutate(phone);
            }}
            className="space-y-6"
          >
            <div>
              <h1 className="text-display text-4xl text-ink">ورود یا ثبت‌نام</h1>
              <p className="mt-2 text-muted-foreground">شمارهٔ موبایلت را بنویس؛ اگر بار اول است، حسابت خودکار ساخته می‌شود.</p>
            </div>
            <Field data-invalid={phone.length >= 11 && !valid}>
              <FieldLabel htmlFor="phone">شمارهٔ موبایل</FieldLabel>
              <Input
                id="phone"
                inputMode="numeric"
                autoComplete="tel"
                dir="ltr"
                placeholder="09121234567"
                className="h-12 text-center text-lg tracking-widest"
                value={phone}
                maxLength={11}
                onChange={(e) => setPhone(normalizePhone(e.target.value).slice(0, 11))}
                aria-invalid={phone.length >= 11 && !valid}
                autoFocus
              />
              {phone.length >= 11 && !valid ? (
                <FieldError>شماره باید با ۰۹ شروع شود و ۱۱ رقم باشد.</FieldError>
              ) : (
                <FieldDescription>با ارقام فارسی یا انگلیسی، فرقی نمی‌کند.</FieldDescription>
              )}
            </Field>
            <Button type="submit" size="lg" className="h-12 w-full bg-lapis text-base font-bold" disabled={!valid || request.isPending}>
              {request.isPending ? <Spinner /> : <MessageSquareText />}
              کد ورود را بفرست
            </Button>
            <div className="rounded-xl border border-dashed border-ink/30 p-3 text-sm">
              <p className="mb-2 font-semibold">حساب‌های نمونه برای امتحان:</p>
              <div className="flex flex-wrap gap-2">
                {DEMO.map((d) => (
                  <Button key={d.phone} type="button" variant="outline" size="sm" onClick={() => setPhone(d.phone)}>
                    {d.label}
                  </Button>
                ))}
              </div>
            </div>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (code.length === 5) verify.mutate(code);
            }}
            className="space-y-6"
          >
            <div>
              <Button type="button" variant="ghost" size="sm" className="-ms-2 mb-2" onClick={() => setStep("phone")}>
                <ArrowRight /> تغییر شماره
              </Button>
              <h1 className="text-display text-4xl text-ink">کد را وارد کن</h1>
              <p className="mt-2 text-muted-foreground">
                کد ۵ رقمی به <span dir="ltr" className="font-bold text-ink">{phone}</span> فرستاده شد. تا ۲ دقیقه اعتبار دارد.
              </p>
            </div>
            {debugCode && (
              <Alert className="border-saffron bg-saffron/10">
                <KeyRound />
                <AlertTitle>کد آزمایشی: <span dir="ltr" className="font-mono tracking-widest">{debugCode}</span></AlertTitle>
                <AlertDescription className="flex flex-wrap items-center gap-2">
                  پیامک در این نسخه شبیه‌سازی شده است.
                  <Button type="button" size="sm" variant="outline" onClick={() => { setCode(debugCode); verify.mutate(debugCode); }}>
                    وارد کردن خودکار
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <div dir="ltr" className="flex justify-center">
              <InputOTP
                maxLength={5}
                value={code}
                onChange={setCode}
                onComplete={(c) => verify.mutate(c)}
                inputMode="numeric"
                autoFocus
                aria-label="کد ۵ رقمی"
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <InputOTPSlot key={i} index={i} className="size-12 border-ink/40 text-xl font-bold" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button type="submit" size="lg" className="h-12 w-full bg-lapis text-base font-bold" disabled={code.length !== 5 || verify.isPending}>
              {verify.isPending && <Spinner />}
              ورود
            </Button>
            <Button
              type="button"
              variant="link"
              className="w-full"
              disabled={wait > 0 || request.isPending}
              onClick={() => request.mutate(phone)}
            >
              {wait > 0 ? `ارسال دوباره تا ${fa(wait)} ثانیهٔ دیگر` : "کد نرسید؟ دوباره بفرست"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
