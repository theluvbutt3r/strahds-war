import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps } from "react";

import { cn } from "./lib/cn";

/**
 * The boxed asides from PLAN.md §5 — the shapes the editor will emit in Phase 4.
 *
 * These are the campaign's own conventions rather than generic alerts: `readAloud` is the
 * classic module box of descriptive text you read to the table verbatim, `tarokka` is the
 * fortune-telling motif, `secret` marks DM-only prose.
 *
 * Every variant is a left-edged panel rather than a fully coloured block. A saturated fill
 * behind a paragraph of body text is the fastest way to fail contrast, because the text
 * colour then has to work against an accent instead of a surface — and §6 has no accent
 * light enough to read `void` on and dark enough to read `bone` on.
 */
const calloutVariants = cva("rounded-r-sm border-l-3 px-5 py-4 text-sm", {
  variants: {
    variant: {
      /** Neutral aside. */
      default: "bg-surface border-l-rule/60 text-text",
      /** Read this to the table. Serif, because it is prose to be spoken. */
      readAloud: "bg-surface border-l-rule font-serif text-text italic",
      /** A tarokka reading. */
      tarokka: "bg-surface border-l-fill-arcane text-text",
      /** DM-only. See the note on `CalloutSecret` below. */
      secret: "bg-surface border-l-fill-accent text-text",
      /** Something that will hurt if ignored. */
      warning: "bg-surface border-l-fill-danger text-text",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export type CalloutProps = ComponentProps<"div"> & VariantProps<typeof calloutVariants>;

export function Callout({ className, variant, ...props }: CalloutProps) {
  return <div className={cn(calloutVariants({ variant, className }))} {...props} />;
}

export function CalloutTitle({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-text-muted mb-2 font-sans text-xs font-semibold tracking-wide uppercase not-italic",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A DM-only callout, pre-labelled.
 *
 * **This component hides nothing.** If it is rendering, the server already decided the
 * viewer clears the `dm` tier and sent the prose; the crimson edge and the label are there
 * so the DM knows not to read it aloud, not to keep anyone out. Spoiler enforcement
 * happens in the query, before serialisation — never in a component (ADR 0006, CLAUDE.md).
 *
 * The reason to say so here rather than in a doc: this is the component whose name most
 * invites the mistake, and someone will eventually reach for it hoping it gates content.
 */
export function CalloutSecret({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <Callout variant="secret" className={className} {...props}>
      <CalloutTitle>DM only</CalloutTitle>
      {children}
    </Callout>
  );
}
