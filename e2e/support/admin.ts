import { createClient } from "@supabase/supabase-js";

// Test only admin client (spec 0011). It owns its own client because the app's
// `createAdminClient` is `server-only`. It refuses any host but the local stack.

export const TEST_ADDRESS = /^e2e\d+[a-z]+@example\.com$/;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SECRET_KEY ?? "";
  const host = hostOf(url);
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error(
      "e2e account cleanup runs only against the local Supabase stack: NEXT_PUBLIC_SUPABASE_URL must point at 127.0.0.1 or localhost",
    );
  }
  if (key === "") throw new Error("SUPABASE_SECRET_KEY is not set");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Deletes the test account with this exact address, if it exists. */
export async function deleteUserByEmail(email: string): Promise<void> {
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((candidate) => candidate.email === email);
  if (user) await admin.auth.admin.deleteUser(user.id);
}

/** Deletes every leftover `e2e...@example.com` account (a crashed run). */
export async function deleteAllTestUsers(): Promise<number> {
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const leftovers = data.users.filter((user) =>
    TEST_ADDRESS.test(user.email ?? ""),
  );
  for (const user of leftovers) await admin.auth.admin.deleteUser(user.id);
  return leftovers.length;
}
