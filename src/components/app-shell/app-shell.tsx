import { type ReactNode } from "react";
import { type Viewer } from "@/lib/app-shell/nav";
import { cn } from "@/lib/utils";
import { BottomTabBar } from "./bottom-tab-bar";
import { getShellTabs } from "./shell-tabs";
import { SiteHeader } from "./site-header";

type AppShellProps = {
  viewer: Viewer;
  children: ReactNode;
};

export async function AppShell({ viewer, children }: AppShellProps) {
  const tabs = await getShellTabs(viewer);
  const hasBottomBar = tabs.length > 0;

  return (
    <>
      <SiteHeader tabs={tabs} />
      <main
        id="main"
        className={cn(
          "mx-auto flex w-full max-w-screen-2xl flex-1 flex-col px-(--page-gutter) pt-6 pb-10",
          // Clears the 64px bar, the raised Add, and the iPhone home indicator.
          hasBottomBar &&
            "pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-10",
        )}
      >
        {children}
      </main>
      {/* After <main>, so keyboard order is header, main, bar. */}
      <BottomTabBar tabs={tabs} />
    </>
  );
}
