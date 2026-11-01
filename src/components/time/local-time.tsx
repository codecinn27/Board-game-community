"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { formatLocalTime } from "@/lib/time/format-local-time";

type LocalTimeProps = {
  /** ISO 8601 timestamp, as Supabase returns `timestamptz`. */
  value: string;
  className?: string;
};

const SERVER_ZONE = "Asia/Kuala_Lumpur";

/**
 * A timestamp in the reader's own zone (spec 0005, AC-9). Server and first
 * render show the UTC+8 date, so they match; after load it switches to the
 * visitor's zone and relative text, once, without ticking.
 */
export function LocalTime({ value, className }: LocalTimeProps) {
  const format = useFormatter();
  const t = useTranslations("common.time");
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Read the clock after mount only: never during render, which the
    // prerender rejects and which would not match the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one read at mount
    setNow(new Date());
  }, []);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    if (process.env.NODE_ENV === "development") {
      console.error(`LocalTime: invalid value "${value}"`);
    }
    return null;
  }

  const { text, title } = formatLocalTime(date, {
    now,
    timeZone: now === null ? SERVER_ZONE : undefined,
    format,
    justNow: t("justNow"),
  });

  return (
    <time dateTime={date.toISOString()} title={title} className={className}>
      {text}
    </time>
  );
}
