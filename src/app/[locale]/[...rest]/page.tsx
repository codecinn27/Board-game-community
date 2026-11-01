import { notFound } from "next/navigation";

// Unknown paths under a valid language prefix get the translated 404.
// No generateStaticParams: cacheComponents rejects an empty list, and this
// route may render as a partial prerender (spec 0005, AC-6).
export default function CatchAll() {
  notFound();
}
