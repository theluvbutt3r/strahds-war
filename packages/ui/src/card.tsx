import { type ComponentProps } from "react";

import { cn } from "./lib/cn";

/**
 * The surface everything else sits on: entity panels, list rows, sidebar sections.
 *
 * A card is `crypt` on a `void` page — about 1.3:1 apart, which is deliberately far below
 * the 3:1 that WCAG asks of *meaningful* boundaries. Three near-black layers cannot be
 * further apart and still read as one dark theme, and the separation here is decorative:
 * nothing about the card conveys state or is interactive on its own. Where a boundary does
 * carry meaning — focus, selection, validity — it is drawn in gold or crimson instead.
 */
export function Card({
  className,
  grain = true,
  ...props
}: ComponentProps<"div"> & {
  /**
   * The parchment grain from §6. On by default, because §6 puts it on card surfaces and a
   * texture you have to remember to enable ends up on half the cards.
   *
   * Turn it off where cards are stacked densely enough that the noise starts to read as
   * dirt rather than as paper — a long list of search results, say.
   */
  grain?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-surface border-border rounded-lg border text-text",
        grain && "grain",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />;
}

/**
 * Renders an `<h3>` by default.
 *
 * A card title is almost never the most important heading on a page, and a component that
 * hardcoded `<h2>` would quietly produce a document outline that jumps levels — which is
 * how a screen-reader user loses the thread. Pass `as` where the page needs otherwise.
 */
export function CardTitle({
  className,
  as: Component = "h3",
  ...props
}: ComponentProps<"h3"> & { as?: "h1" | "h2" | "h3" | "h4" }) {
  return (
    <Component
      className={cn("font-display text-xl leading-tight font-semibold", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-text-muted text-sm", className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("px-6 pb-6", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex items-center gap-3 px-6 pb-6", className)} {...props} />;
}
