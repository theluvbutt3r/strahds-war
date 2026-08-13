import { type ComponentProps } from "react";

import { cn } from "./lib/cn";

/**
 * A text input on a raised surface.
 *
 * The placeholder is `text-muted` (`mistLit`, 5.25:1 on `stone`) rather than the `mist`
 * the name suggests. Placeholder text is real text and browsers do not dim it further, so
 * the fill-only grey would put it at 3.16:1 — legible enough to look fine to whoever built
 * the form, and not to whoever fills it in.
 *
 * `aria-invalid` drives the error styling rather than a prop, because that attribute is
 * what a screen reader announces. Styling from the same source keeps the two from
 * disagreeing — a red border with no announcement is a field that only sighted users know
 * is wrong.
 */
export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "bg-raised text-text placeholder:text-text-muted flex h-9 w-full rounded-sm px-3 py-1 text-sm",
        "border-gold/20 border transition-colors",
        "hover:border-gold/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-ember-lit aria-invalid:hover:border-ember-lit",
        "file:text-text file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "bg-raised text-text placeholder:text-text-muted flex min-h-24 w-full rounded-sm px-3 py-2 text-sm",
        "border-gold/20 border transition-colors",
        "hover:border-gold/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-ember-lit aria-invalid:hover:border-ember-lit",
        className,
      )}
      {...props}
    />
  );
}
