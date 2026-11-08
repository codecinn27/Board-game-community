import { Suspense, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BottomTabBar } from "./bottom-tab-bar";
import { ShellBottomBar, ShellHeader } from "./shell-nav";
import { getShellTabs } from "./shell-tabs";
import { SiteHeader } from "./site-header";

type AppShellProps = {
  children: ReactNode;
};

// Only the two nav pieces read the session, each under Suspense with the guest
// tabs as the fallback; `<main>` and the page stay outside it (spec 0010). The
// guest and member sets both have 3 tabs, so the bottom padding never shifts.
export async function AppShell({ children }: AppShellProps) {
  const guestTabs = await getShellTabs("guest");
  const hasBottomBar = guestTabs.length > 0;

  return (
    <>
      <Suspense fallback={<SiteHeader tabs={guestTabs} />}>
        <ShellHeader />
      </Suspense>
      <main
        id="main"
        className={cn(
          // The paddings are variables so a full bleed block (the auth clay
          // scene) can cancel them exactly.
          "mx-auto flex w-full max-w-screen-2xl flex-1 flex-col px-(--page-gutter) pt-(--main-pt) pb-(--main-pb) [--main-pb:2.5rem] [--main-pt:1.5rem]",
          // Clears the 64px bar, the raised Add, and the iPhone home indicator.
          hasBottomBar &&
            "[--main-pb:calc(5.5rem+env(safe-area-inset-bottom))] md:[--main-pb:2.5rem]",
        )}
      >
        {children}
      </main>
      {/* After <main>, so keyboard order is header, main, bar. */}
      <Suspense fallback={<BottomTabBar tabs={guestTabs} />}>
        <ShellBottomBar />
      </Suspense>
    </>
  );
}
