import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// The only way to link or redirect inside the app, so links keep the language.
export const {
  Link,
  redirect,
  permanentRedirect,
  usePathname,
  useRouter,
  getPathname,
} = createNavigation(routing);
