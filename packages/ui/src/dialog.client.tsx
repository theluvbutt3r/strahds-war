"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { type ComponentProps } from "react";

import { cn } from "./lib/cn";

/**
 * Modal dialog, on Radix.
 *
 * `.client.tsx` is not a style choice — the repo bans `"use client"` everywhere else so
 * that DM-only content stays out of the browser bundle by default (CLAUDE.md, PLAN.md §5).
 * A dialog needs focus trapping, scroll locking and an Escape handler, all of which are
 * browser behaviour, so this is one of the leaves that legitimately opts in. What it must
 * never do is *receive* higher-clearance content as a prop from a Server Component in
 * order to reveal it on a click: props to a client component are serialised into the page
 * payload, where anyone can read them. Fetch DM material behind an authorised endpoint.
 *
 * Radix carries the accessibility that is genuinely hard to hand-roll: the focus trap,
 * `aria-modal`, restoring focus to the trigger on close, and inert-ing the page behind.
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;

export function DialogOverlay({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "animate-fade-in fixed inset-0 bg-black/70 backdrop-blur-[2px]",
        "z-[var(--z-modal)]",
        className,
      )}
      {...props}
    />
  );
}

export function DialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          "animate-rise fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          "z-[var(--z-modal)] w-full max-w-lg",
          "bg-surface border-gold/25 rounded-lg border p-6 shadow-2xl shadow-black/60",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className={cn(
            "text-text-muted hover:text-text absolute top-4 right-4 rounded-sm transition-colors",
            "disabled:pointer-events-none",
          )}
        >
          <X className="size-4" />
          {/* The icon is decorative; the button still needs an accessible name. */}
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

export function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mb-4 flex flex-col gap-1.5 pr-8", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mt-6 flex flex-col-reverse gap-2 tablet:flex-row tablet:justify-end",
        className,
      )}
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("font-display text-xl leading-tight font-semibold", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description className={cn("text-text-muted text-sm", className)} {...props} />
  );
}
