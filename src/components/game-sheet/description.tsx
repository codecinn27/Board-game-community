"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { sheetFocusRing } from "./sheet-theme";

type DescriptionProps = {
  text: string;
  moreLabel: string;
  lessLabel: string;
};

/**
 * The description, cut to 4 lines. "More" shows only when the text is really
 * cut off (spec 0008, AC-8).
 */
export function Description({ text, moreLabel, lessLabel }: DescriptionProps) {
  const id = useId();
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [cutOff, setCutOff] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || expanded) return;
    const measure = () => setCutOff(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, expanded]);

  return (
    <div className="flex flex-col items-start gap-1">
      <p
        id={id}
        ref={ref}
        className={cn(
          "leading-7 text-(--sheet-ink)",
          !expanded && "line-clamp-4",
        )}
      >
        {text}
      </p>
      {cutOff || expanded ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "-mx-2 inline-flex min-h-11 items-center rounded-md px-2 text-sm font-semibold text-(--sheet-ink) underline underline-offset-4",
            sheetFocusRing,
          )}
        >
          {expanded ? lessLabel : moreLabel}
        </button>
      ) : null}
    </div>
  );
}
