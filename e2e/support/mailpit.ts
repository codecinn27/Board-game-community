// Mailpit is the fake inbox the local Supabase stack runs (spec 0011).
// Web and API are on 54324; 54325 is its SMTP port.

const base = () => process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

export type MailMessage = {
  ID: string;
  Subject: string;
  HTML: string;
  Text: string;
};

type SearchResult = { messages?: { ID: string; Subject: string }[] };

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function search(address: string) {
  const query = encodeURIComponent(`to:"${address}"`);
  const response = await fetch(`${base()}/api/v1/search?query=${query}`);
  if (!response.ok)
    throw new Error(`Mailpit search failed: ${response.status}`);
  const result = (await response.json()) as SearchResult;
  return result.messages ?? [];
}

/** Polls every 500 ms for up to 10 s until a message is addressed to `address`. */
export async function waitForMail(address: string): Promise<MailMessage[]> {
  const deadline = Date.now() + 10_000;
  for (;;) {
    if ((await search(address)).length > 0) {
      // Give a second (wrong) message time to land before the caller counts.
      await pause(500);
      return Promise.all(
        (await search(address)).map(async ({ ID }) => {
          const response = await fetch(`${base()}/api/v1/message/${ID}`);
          if (!response.ok) {
            throw new Error(`Mailpit read failed: ${response.status}`);
          }
          const message = (await response.json()) as MailMessage;
          return { ...message, ID };
        }),
      );
    }
    if (Date.now() > deadline) {
      throw new Error(
        "no email arrived: restart pnpm dev after setting SMTP_URL in .env.local",
      );
    }
    await pause(500);
  }
}

/** Deletes every message addressed to `address`. */
export async function deleteMail(address: string): Promise<void> {
  const ids = (await search(address)).map((message) => message.ID);
  if (ids.length === 0) return;
  await fetch(`${base()}/api/v1/messages`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ IDs: ids }),
  });
}
