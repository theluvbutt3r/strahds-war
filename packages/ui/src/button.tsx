import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps } from "react";

import { cn } from "./lib/cn";

/**
 * Every variant pairs a fill with the text colour proven readable on it.
 *
 * `text-on-fill` is `bone` and `text-on-gold` is `void` — not a stylistic preference. Bone
 * on gold measures 2.43:1, so the gold button is the one place in the system that takes
 * dark ink. Both pairs are in SHIPPED_PAIRS and checked by the contrast test on every run;
 * writing `text-bone` on the gold variant would look right in the editor and fail there.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-md font-medium transition-colors",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        /** The primary action. Deep crimson, lifting to `ember` on hover. */
        default: "bg-fill-accent text-on-fill hover:bg-ember",
        /** Secondary action — a stone surface edged in tarnished gold. */
        secondary: "bg-raised text-text border border-gold/25 hover:border-gold/60",
        /** Tertiary. No chrome until you approach it. */
        ghost: "text-text hover:bg-raised",
        /** Inline in prose. Looks like a link because it navigates like one. */
        link: "text-link underline-offset-4 hover:underline",
        /** Destructive. Distinct from `default` by hue alone, so it also carries a label. */
        danger: "bg-fill-danger text-on-fill hover:bg-danger/85",
        /** The rare emphasis: a wax-seal gold button. Dark ink, see the note above. */
        gold: "bg-gold text-on-gold hover:bg-gold/85",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-9 px-4 text-sm",
        lg: "h-11 px-6 text-base",
        /** Square, for a lone icon. Still 36px, which clears the 24px touch-target floor. */
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /**
     * Render the child element instead of a `<button>`, keeping the styling.
     *
     * This is how a link gets button styling without nesting an `<a>` inside a `<button>`,
     * which is invalid HTML and breaks keyboard activation in ways that are hard to spot.
     */
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  // No forwardRef: React 19 passes `ref` through as an ordinary prop, so the wrapper that
  // every previous version of this component needed is now dead weight.
  const Component = asChild ? Slot : "button";

  return <Component className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { buttonVariants };
