"use client";

import { MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type CheckEmailProps = { kind: "reset" };

/** The "check your email" success state (spec 0010, required states). */
export function CheckEmail({ kind }: CheckEmailProps) {
  const t = useTranslations("auth.checkEmail");
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center"
    >
      <MailCheck aria-hidden className="size-8 text-primary" />
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      <p className="text-muted-foreground">{t(kind)}</p>
      <Link
        href="/sign-in"
        className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {t("back")}
      </Link>
    </div>
  );
}
