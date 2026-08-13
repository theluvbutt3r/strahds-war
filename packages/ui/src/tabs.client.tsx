"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { type ComponentProps } from "react";

import { cn } from "./lib/cn";

/**
 * Tabs — what the right rail collapses into below 1280px (PLAN.md §7).
 *
 * The active tab is marked by a gold underline *and* by `aria-selected`, which Radix sets.
 * Colour alone would fail WCAG 1.4.1: a reader who cannot distinguish the gold from the
 * muted grey gets no other signal about which panel they are looking at.
 *
 * Tab panels are rendered lazily by default and unmounted when inactive, which matters
 * here beyond performance: a "Secrets" tab that a player's session never receives content
 * for should never have that content in the page at all. Keep the gating on the server —
 * a tab is a layout device, not an access control.
 */
export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("border-rule/25 flex items-center gap-1 border-b", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "relative -mb-px px-3 py-2 text-sm font-medium transition-colors",
        "text-text-muted hover:text-text",
        "border-b-2 border-transparent",
        "data-[state=active]:border-b-rule data-[state=active]:text-text",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("pt-4 outline-none", className)} {...props} />;
}
