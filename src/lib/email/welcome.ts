import { type Locale } from "@/i18n/routing";
import { escapeHtml } from "./escape";

/** The `WelcomeEmail` translator (a next-intl `createTranslator` result). */
export type WelcomeTranslator = (
  key: string,
  values?: Record<string, string>,
) => string;

export type WelcomeInput = {
  displayName: string;
  locale: Locale;
  siteUrl: string;
  t: WelcomeTranslator;
};

const CAN_DO = [
  "canDoBrowse",
  "canDoAddGames",
  "canDoRate",
  "canDoComment",
  "canDoTopFive",
  "canDoWishlist",
] as const;

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',Roboto,Helvetica,Arial,sans-serif";

/** Subject, HTML, and plain text for the welcome email (spec 0011). */
export function buildWelcomeEmail({
  displayName,
  locale,
  siteUrl,
  t,
}: WelcomeInput): { subject: string; html: string; text: string } {
  const link = `${siteUrl}/${locale}/shelf`;
  const subject = t("subject");
  const greeting = t("greeting", { name: displayName });
  const footer = t("footer", { site: t("siteName") });
  const items = CAN_DO.map((key) => t(key));
  const lang = locale === "zh" ? "zh-Hans" : "en";

  const listHtml = items
    .map((item) => `<li style="margin:0 0 6px 0;">${escapeHtml(item)}</li>`)
    .join("");

  const html = `<!doctype html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f1ec;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(t("preheader"))}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;font-family:${FONT};color:#1f2430;">
<tr><td style="padding:28px 28px 0 28px;"><img src="${escapeHtml(siteUrl)}/email-logo.png" width="48" height="48" alt="${escapeHtml(t("siteName"))}" style="display:block;border:0;border-radius:24px;"></td></tr>
<tr><td style="padding:20px 28px 8px 28px;">
<h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;">${escapeHtml(greeting)}</h1>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;">${escapeHtml(t("ready"))}</p>
<p style="margin:0 0 8px 0;font-size:16px;font-weight:600;">${escapeHtml(t("canDoHeading"))}</p>
<ul style="margin:0 0 24px 0;padding-left:20px;font-size:16px;line-height:1.5;">${listHtml}</ul>
<p style="margin:0 0 24px 0;"><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 24px;background:#4b3fd1;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;">${escapeHtml(t("button"))}</a></p>
<p style="margin:0 0 24px 0;font-size:16px;line-height:1.5;">${escapeHtml(t("signoff"))}</p>
</td></tr>
<tr><td style="padding:16px 28px 28px 28px;border-top:1px solid #e6e1d8;font-size:13px;line-height:1.5;color:#6b6f7a;">${escapeHtml(footer)}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    greeting,
    "",
    t("ready"),
    "",
    t("canDoHeading"),
    ...items.map((item) => `- ${item}`),
    "",
    `${t("button")}: ${link}`,
    "",
    t("signoff"),
    "",
    footer,
  ].join("\n");

  return { subject, html, text };
}
