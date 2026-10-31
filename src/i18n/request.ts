import { getRequestConfig } from "next-intl/server";

// The locale is fixed to English until feature 5 (Two languages) adds switching.
// No cookies or headers are read, so the root layout stays prerenderable.
export default getRequestConfig(async () => ({
  locale: "en",
  messages: (await import("../../messages/en.json")).default,
}));
