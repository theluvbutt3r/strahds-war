import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { type ComponentProps } from "react";

import { cn } from "./lib/cn";

/**
 * The hairline gold rule from §6, between sections.
 *
 * Defaults to `decorative`, which sets `role="none"` and keeps it out of the accessibility
 * tree — a screen reader announcing "separator" between every section is noise. Pass
 * `decorative={false}` only where the line genuinely divides two things a non-sighted
 * reader needs told apart.
 */
export function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "bg-rule/40 shrink-0",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A section rule with a centred ornament — the one piece of deliberate decoration in the
 * set. §6 allows exactly this much: "one wax seal is gothic, twelve is a Halloween store."
 */
export function OrnamentRule({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("flex items-center gap-3", className)} aria-hidden="true" {...props}>
      <span className="via-rule/40 h-px flex-1 bg-gradient-to-r from-transparent to-transparent" />
      <span className="text-rule text-xs leading-none">✦</span>
      <span className="via-rule/40 h-px flex-1 bg-gradient-to-r from-transparent to-transparent" />
    </div>
  );
}
