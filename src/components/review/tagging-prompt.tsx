"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type TaggingPromptProps = {
  prompt: string;
  labels: {
    title: string;
    hint: string;
    copy: string;
    copied: string;
    copyFailed: string;
    field: string;
  };
};

const MESSAGE_MS = 2500;

/**
 * The admin's AI tagging prompt: a closed section with the text in a read only
 * box and a Copy button. The box is selectable, so a failed copy is not a dead end.
 */
export function TaggingPrompt({ prompt, labels }: TaggingPromptProps) {
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    let worked = true;
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      worked = false;
    }
    setOk(worked);
    setMessage(worked ? labels.copied : labels.copyFailed);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(""), MESSAGE_MS);
  }

  return (
    <details className="rounded-lg border p-3">
      <summary className="min-h-11 cursor-pointer py-2 font-medium">
        {labels.title}
      </summary>
      <div className="mt-2 flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{labels.hint}</p>
        <textarea
          readOnly
          aria-label={labels.field}
          value={prompt}
          rows={10}
          onFocus={(event) => event.currentTarget.select()}
          className="w-full rounded-md border bg-muted/40 p-2 font-mono text-xs"
        />
        <div className="flex items-center gap-3">
          <Button type="button" onClick={copy} className="min-h-11">
            {ok ? (
              <Check aria-hidden className="size-4" />
            ) : (
              <Copy aria-hidden className="size-4" />
            )}
            {labels.copy}
          </Button>
          <span role="status" className="text-sm text-muted-foreground">
            {message}
          </span>
        </div>
      </div>
    </details>
  );
}
