import { getViewer } from "@/lib/auth/viewer";
import { BottomTabBar } from "./bottom-tab-bar";
import { getShellTabs } from "./shell-tabs";
import { SiteHeader } from "./site-header";

// The only shell parts that read the session (spec 0010, AC-8). Each sits in
// `Suspense` in AppShell with the guest tabs as its fallback, so the cached
// pages around them stay static.

export async function ShellHeader() {
  const viewer = await getViewer();
  return <SiteHeader tabs={await getShellTabs(viewer.kind)} />;
}

export async function ShellBottomBar() {
  const viewer = await getViewer();
  return <BottomTabBar tabs={await getShellTabs(viewer.kind)} />;
}
