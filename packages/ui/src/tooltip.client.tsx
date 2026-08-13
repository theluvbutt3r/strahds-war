"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { type ComponentProps } from "react";

import { cn } from "./lib/cn";

/**
 * Tooltips, for the icon-only buttons in the rails.
 *
 * Two things about tooltips are worth stating rather than discovering later. They do not
 * appear on touch, so anything a phone user needs must also exist as visible text or an
 * `aria-label` — and players are on phones. And a tooltip is not a place for content; it
 * is a place for a label. Anything a reader might want to re-read, copy or search belongs
 * on the page.
 *
 * `TooltipProvider` has to wrap the tree once, near the root, for the shared open/close
 * timing to work. Without it Radix throws at render, which is the good failure mode.
 */
export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "animate-fade-in z-[var(--z-dropdown)] max-w-64",
          "bg-raised text-text border-gold/25 rounded-sm border px-2.5 py-1.5 text-xs",
          "shadow-lg shadow-black/50",
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="fill-raised" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}
