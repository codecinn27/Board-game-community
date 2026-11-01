import type en from "../../messages/en.json";
import { type Locale } from "./routing";

// Message keys are typed from the English file, so a wrong key fails
// `pnpm typecheck` (spec 0005, AC-8).
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof en;
  }
}
