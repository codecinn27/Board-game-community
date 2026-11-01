import { Dices } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type ShelfEmptyProps = {
  title: string;
  body: string;
};

export function ShelfEmpty({ title, body }: ShelfEmptyProps) {
  return (
    <Empty className="w-full flex-none py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="size-18 rounded-full">
          <Dices aria-hidden className="size-8" />
        </EmptyMedia>
        <EmptyTitle className="text-lg">{title}</EmptyTitle>
        <EmptyDescription>{body}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
