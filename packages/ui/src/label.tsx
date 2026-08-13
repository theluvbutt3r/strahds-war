import * as LabelPrimitive from "@radix-ui/react-label";
import { type ComponentProps } from "react";

import { cn } from "./lib/cn";

/**
 * Radix's label rather than a bare `<label>`, for one behaviour: clicking it focuses the
 * control even when that control is a composite widget (a Radix select, a checkbox built
 * from a button) where the native `for`/`id` association does nothing.
 *
 * `peer-disabled:` dims the label when the input it labels is disabled, so the pair reads
 * as one unit rather than as a live label attached to a dead field.
 */
export function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "text-text text-sm leading-none font-medium",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
