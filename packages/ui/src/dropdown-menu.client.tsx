"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import { type ComponentProps } from "react";

import { cn } from "./lib/cn";

/**
 * The account menu, entity actions, the "+ New" menu in the left rail.
 *
 * Radix handles roving focus, type-ahead and the `aria-activedescendant` bookkeeping that
 * makes a menu navigable by keyboard — none of which is visible in a screenshot and all of
 * which is what separates a menu from a styled list of buttons.
 *
 * A note that matters for this project specifically: a menu item that a role cannot use
 * should not be rendered at all, and that decision belongs on the server. Rendering every
 * item and disabling some tells a player exactly which capabilities exist — which is a
 * smaller leak than content, but a leak. Ask `can()` before building the item list.
 */
export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "animate-rise z-[var(--z-dropdown)] min-w-44 overflow-hidden",
          "bg-surface border-gold/25 rounded-lg border p-1 shadow-xl shadow-black/50",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
        "text-text transition-colors select-none",
        // Radix sets data-highlighted for both hover and keyboard focus, so styling it once
        // keeps the mouse and keyboard experiences identical rather than merely similar.
        "data-[highlighted]:bg-raised data-[highlighted]:text-text",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none",
        "text-text transition-colors select-none",
        "data-[highlighted]:bg-raised",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check className="text-gold size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn(
        "text-text-muted px-2 py-1.5 text-xs font-semibold tracking-wide uppercase",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn("bg-rule/30 -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

export function DropdownMenuShortcut({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn("text-text-muted ml-auto font-mono text-xs tracking-widest", className)}
      {...props}
    />
  );
}
