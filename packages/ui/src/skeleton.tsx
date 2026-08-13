import { type ComponentProps } from "react";

import { cn } from "./lib/cn";

/**
 * Loading placeholder.
 *
 * `aria-hidden` with a sibling live region rather than an announced element: a screen
 * reader reading out six grey rectangles tells the user nothing. The page that uses these
 * should announce "Loading…" once.
 *
 * The pulse animation is covered by the `prefers-reduced-motion` block in
 * @sw/design-tokens/theme.css, which drops it to 1ms rather than removing it — so the
 * placeholder still reads as a placeholder, it just stops moving.
 */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("bg-raised animate-pulse rounded-sm", className)}
      {...props}
    />
  );
}
