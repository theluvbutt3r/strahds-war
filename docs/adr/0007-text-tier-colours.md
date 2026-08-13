# 0007. A separate text tier in the palette

- **Status:** Accepted
- **Date:** 2026-08-13

## Context

`docs/PLAN.md` §6 specifies eleven colours and one accessibility rule derived from them:

> `blood` (#8B1A1A) on `void` (#0B0A0C) is roughly 3.9:1 — it fails WCAG AA for body text. So
> deep crimson is a _fill_ color, never a text color. `ember` (#B33636) reaches about 5.3:1
> and passes, so it carries every piece of crimson text and every link.

The reasoning is right and the arithmetic is not. Measured with the WCAG relative-luminance
formula, on `void`:

| pair              | §6 claims         | measured   |
| ----------------- | ----------------- | ---------- |
| `blood` on `void` | ~3.9:1            | **2.13:1** |
| `ember` on `void` | ~5.3:1, passes AA | **3.29:1** |
| `mist` on `void`  | (unstated)        | **3.75:1** |

AA body text requires 4.5:1. So `ember` does not pass, and `mist` — the token whose entire
job is muted metadata text — does not either. Checked against `stone` (#1F1D23), the
lightest of the three surfaces, every accent falls further still. Of the original eleven,
only `bone` (13.05:1 worst case) and `gold` (5.38:1 worst case) can legally carry body text
anywhere in the theme.

This surfaced while writing the contrast test §9 asks for in Phase 2. The test would have
failed on the palette it exists to protect, which is the useful version of this problem: it
was found by the mechanism built to find it, before any component consumed a token.

Three ways out. Restrict usage so only `bone` and `gold` carry text, which costs the muted
metadata treatment and crimson links that the layouts in §7 are drawn around. Retune `ember`
and `mist` in place, which fixes the text problem and brightens the crimson everywhere it is
used as a fill — the identity colour of the whole site. Or split the two jobs.

## Decision

Split them. Every hex in §6 is preserved exactly and continues to do fills, borders and
large display type. Two lighter siblings are added that exist only to carry text:

| Token      | Hex       | Worst case (on `stone`) | Job                     |
| ---------- | --------- | ----------------------- | ----------------------- |
| `emberLit` | `#E85550` | 4.65:1                  | Crimson text and links  |
| `mistLit`  | `#948E9C` | 5.25:1                  | Muted and metadata text |

Both were chosen against `stone` rather than `void`, so they are safe on all three surfaces
rather than only on the page background.

The split is enforced by the type system, not by convention. `packages/design-tokens`
exports `TEXT_COLORS` and a `TextColor` type covering `bone`, `gold`, `emberLit` and
`mistLit`; passing `blood` where a text colour is expected is a compile error. `SHIPPED_PAIRS`
enumerates every foreground/background combination the design system commits to rendering,
and `contrast.test.ts` asserts each one clears its WCAG threshold on every run of
`pnpm verify`.

Surface-to-surface steps (`crypt` on `void`, and the `border` role) are deliberately excluded
from that list. They sit near 1.3:1 and always will, because three near-black layers cannot
be 3:1 apart and still read as one dark theme. WCAG SC 1.4.11 governs boundaries a user must
be able to _find_ — focus rings, input outlines, selected states — and those all use `gold`,
which is checked at the stricter 4.5:1 text bar.

## Consequences

The gothic identity is intact. `blood` and `ember` still paint every filled surface, seal and
button, and those are what carry the mood; the change only affects words set _in_ crimson,
which are lighter than they would have been. On a fill, `emberLit` never appears at all.

The palette is thirteen colours instead of eleven, and the extra two need explaining every
time someone new reads the token file — hence the long comment there and this record. There
is now a wrong answer available: reaching for `ember` because it is the brand colour and
getting unreadable text. The `TextColor` type is what makes that a compile error instead of
an accessibility bug found by a player at a table.

`gold` is the one inversion and stays a trap. It is bright enough to be both a text colour
and a fill, but `bone` on `gold` is 2.43:1 — so a gold fill takes `void` as its ink, via the
`onGold` semantic role. This is asserted rather than documented, because pattern-matching
from the other five fills gets it wrong.

The measured figures for `blood`, `ember` and `mist` are pinned in `contrast.test.ts`. If
someone retunes one of those to pass AA, that test fails deliberately — the prompt to move
the colour into `TEXT_COLORS` rather than to loosen the number.

## Alternatives considered

**Restrict usage; add no colours.** Cheapest, and the palette stays at eleven. Rejected
because it deletes a real capability: `mist` exists precisely to be muted text, and with it
gone, metadata has to render as `bone` at reduced opacity — which does not actually help,
since opacity over a dark surface lowers effective contrast by the same amount it lowers
brightness. Crimson links would become `bone` with a gold underline. That is a legitimate
design, but it is a different one from §7's sketches, and it trades away more than the two
extra rows cost.

**Retune `ember` and `mist` in place.** Smallest token surface — still eleven colours, and
§6's rule holds as written. Rejected because `ember` is a fill colour in most of its uses,
and lightening it to #E85550 brightens every badge, button and callout edge on the site. The
deep-crimson identity would survive only in `blood`. Fixing a text problem by changing a fill
is the wrong lever.

**Drop to AA-large (3:1) for accent text.** Would let `ember` through as-is. Rejected
outright: body text is body text, and the players most affected are the ones reading a phone
in a dimly lit room, which is the entire usage context. §6 already made this call correctly
in principle — it only miscalculated which colour cleared the bar.

**Pull in a colour library** (`culori`, `colorjs.io`) rather than hand-writing the maths.
Rejected because `design-tokens` is layer 0 and its value is that it depends on nothing
(ADR 0001, PLAN.md §4). The formula is twelve lines and has not changed since WCAG 2.0 in 2008.
