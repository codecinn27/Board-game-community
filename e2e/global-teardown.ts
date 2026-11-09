import { deleteAllTestUsers } from "./support/admin";

// Sweeps `e2e...@example.com` accounts a crashed run left behind (spec 0011,
// AC-11). Only when registration tests were asked for, and only on the local
// stack: `adminClient` throws for any other host, and nothing is deleted.
export default async function globalTeardown() {
  if (process.env.E2E_REGISTER !== "1") return;
  await deleteAllTestUsers();
}
