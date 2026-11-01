import { Users } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

// Part 1 only: part 2 replaces this with the owner sections (spec 0007, AC-13).
export function ByOwnerPlaceholder() {
  const t = useTranslations("shelf.byOwner.soon");

  return (
    <Empty className="w-full flex-none py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="size-18 rounded-full">
          <Users aria-hidden className="size-8" />
        </EmptyMedia>
        <EmptyTitle className="text-lg">{t("title")}</EmptyTitle>
        <EmptyDescription>{t("body")}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
