"use client";

import { MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type CheckEmailProps = { kind: "reset" };

/** The "check your email" success state, inside the form card (spec 0010). */
export function CheckEmail({ kind }: CheckEmailProps) {
  const t = useTranslations("auth.checkEmail");
  return (
    <div role="status" className="flex flex-col items-center gap-3 text-center">
      <span
        aria-hidden
        className="flex size-14 items-center justify-center rounded-full bg-linear-to-br from-auth-button-from to-auth-button-to text-auth-on-button shadow-[0_10px_20px_-10px_var(--auth-button-glow)]"
      >
        <MailCheck className="size-6" />
      </span>
      <h2 className="text-lg font-semibold text-auth-ink">{t("title")}</h2>
      <p className="text-pretty text-auth-ink-muted">{t(kind)}</p>
      <Link
        href="/sign-in"
        className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-bold text-auth-link underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-auth-ring focus-visible:outline-none"
      >
        {t("back")}
      </Link>
    </div>
  );
}
