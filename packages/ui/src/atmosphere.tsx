import { type ComponentProps } from "react";

import { cn } from "./lib/cn";

/**
 * A soft darkening at the viewport edges. Belongs in the root layout, once.
 *
 * Pure decoration: `aria-hidden`, no pointer events, and rendered *behind* page content at
 * `--z-atmosphere`. Behind matters. A vignette painted over the page would darken cards and
 * glyphs along with the background, quietly invalidating every ratio the contrast test
 * measured — the palette would still be provably sound and the rendered page would not be.
 * See ADR 0008 and the note on `Z_INDEX.atmosphere` in @sw/design-tokens.
 *
 * Because it only darkens, it needs no contrast argument at all: text over a darker
 * background gains contrast rather than losing it. That is also why this one is a Server
 * Component and `Fog` is not — there is nothing to decide at runtime, so there is no reason
 * to ship JavaScript for it.
 */
export function Vignette({ className, ...props }: ComponentProps<"div">) {
  return <div aria-hidden="true" className={cn("vignette", className)} {...props} />;
}
