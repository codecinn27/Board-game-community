import "server-only";

import { createAdminClient } from "./admin";

// Usernames are private, so they are read only here, with the secret key.

/** The email for a username (exact match, case sensitive), or null. */
export async function findEmailByUsername(
  username: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (!profile) return null;
  const { data } = await admin.auth.admin.getUserById(profile.id);
  return data.user?.email ?? null;
}

/** True when a member already has this exact username. */
export async function isUsernameTaken(username: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  return data !== null;
}

/** A member's own username, for their account page. */
export async function getUsername(userId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();
  return data?.username ?? "";
}
