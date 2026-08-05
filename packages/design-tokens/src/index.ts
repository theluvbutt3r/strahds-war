/**
 * @sw/design-tokens — the Barovian palette, type scale and spacing, as plain data.
 *
 * Layer 0 and framework-agnostic on purpose: Tailwind's `@theme` block, raw CSS, and a
 * future React Native StyleSheet all read the same values, so the phone app cannot drift
 * from the web app's colours.
 *
 * Phase 2 fills this in (docs/PLAN.md §9). The palette is already specified in §6, along
 * with the constraint that shapes it: `blood` (#8B1A1A) on `void` (#0B0A0C) is ~3.9:1 and
 * fails WCAG AA, so deep crimson is a fill colour only and `ember` (#B33636, ~5.3:1)
 * carries every piece of crimson text. A CI contrast test lands with the tokens to keep
 * that from regressing quietly.
 */

export const TOKENS_PHASE = 2 as const;
