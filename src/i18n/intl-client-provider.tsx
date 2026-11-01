import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { type ComponentProps } from "react";

type IntlClientProviderProps = Omit<
  ComponentProps<typeof NextIntlClientProvider>,
  "messages"
> & {
  /**
   * Required: a picked set of namespaces, or `{}`. next-intl 4 ships the whole
   * message file to the browser when `messages` is left out.
   */
  messages: AbstractIntlMessages;
};

export function IntlClientProvider(props: IntlClientProviderProps) {
  return <NextIntlClientProvider {...props} />;
}
