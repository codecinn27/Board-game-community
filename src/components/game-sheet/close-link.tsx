import { X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { glassButton, sheetFocusRing } from "./sheet-theme";

type CloseLinkProps = {
  label: string;
  className?: string;
};

/** The page version's Close: a plain link to the shelf. */
export function CloseLink({ label, className }: CloseLinkProps) {
  return (
    <Link
      href="/shelf"
      aria-label={label}
      className={cn(glassButton, sheetFocusRing, className)}
    >
      <X aria-hidden className="size-5" />
    </Link>
  );
}
