import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps } from "react";

import { cn } from "./lib/cn";

/**
 * Small status and taxonomy labels — faction, status, entity kind.
 *
 * The four coloured variants exist because the campaign has four recurring axes worth
 * colour-coding, not because a palette needed using up. Every one puts `bone` on a dark
 * fill, which the contrast test checks; there is no variant that sets crimson *text*,
 * because at badge size that is `text-xs` and nowhere near the AA threshold.
 */
const badgeVariants = cva(
  [
    "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5",
    "text-xs font-medium tracking-wide whitespace-nowrap",
    "[&_svg]:size-3 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        /** The default: quiet, structural, no hue claim. */
        default: "bg-raised text-text border-gold/20",
        /** Allegiance and bloodline. */
        blood: "bg-fill-accent text-on-fill border-transparent",
        /** Nature, druidic, the Svalich woods. */
        nature: "bg-fill-nature text-on-fill border-transparent",
        /** Magic, arcana, the Vistani. */
        arcane: "bg-fill-arcane text-on-fill border-transparent",
        /** Danger, curses, hostile status. */
        danger: "bg-fill-danger text-on-fill border-transparent",
        /**
         * DM-only material.
         *
         * Purely a label on content the server already decided to send. It marks tier; it
         * does not enforce it. Nothing a player can see is ever hidden by this badge's
         * absence — see ADR 0006.
         */
        secret: "bg-transparent text-gold border-gold/60",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { badgeVariants };
