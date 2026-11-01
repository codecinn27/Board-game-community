import { createFormatter, createTranslator } from "next-intl";
import { type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import en from "../../../messages/en.json";
import zh from "../../../messages/zh.json";
import { IntlClientProvider } from "@/i18n/intl-client-provider";

// Shared by the home component tests. The components are async Server
// Components, so the tests mock the two server boundaries (`next-intl/server`
// and the locale aware `Link`) with the real message files, then render the
// result to a string.

export type TestLocale = "en" | "zh";

const messagesByLocale = { en, zh } as const;

let current: TestLocale = "en";

export function setLocale(locale: TestLocale) {
  current = locale;
}

/** Stands in for `next-intl/server`, in the current test language. */
export const intlServerMock = {
  getLocale: async () => current,
  getTranslations: async (namespace: string) =>
    createTranslator({
      locale: current,
      messages: messagesByLocale[current],
      namespace,
    } as Parameters<typeof createTranslator>[0]),
  getFormatter: async () => createFormatter({ locale: current }),
};

/** Stands in for `@/i18n/navigation`: the same `/<locale>` prefix, as a plain link. */
export const navigationMock = {
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: ReactNode;
    className?: string;
  }) => (
    <a href={`/${current}${href === "/" ? "" : href}`} {...rest}>
      {children}
    </a>
  ),
};

/** Renders a server component's output, with the client provider `LocalTime` needs. */
export function render(node: ReactNode): string {
  return renderToStaticMarkup(
    <IntlClientProvider
      locale={current}
      messages={messagesByLocale[current]}
      timeZone="Europe/London"
    >
      {node}
    </IntlClientProvider>,
  );
}

/** Visible text of a piece of markup: tags removed, whitespace collapsed. */
export function textOf(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
