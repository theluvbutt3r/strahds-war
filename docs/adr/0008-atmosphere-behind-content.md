# 0008. Atmosphere renders behind content and may not lighten past `stone`

- **Status:** Accepted
- **Date:** 2026-08-13

## Context

PLAN.md §6 asks for three textures: a parchment grain on card surfaces, a soft vignette at
the viewport edges, and a slow drifting fog on the landing page. All three are decoration,
and all three sit near text.

That last part is the problem. [ADR 0007](0007-text-tier-colours.md) established that this
design system knows the exact contrast ratio of every foreground/background pair it ships,
and `contrast.test.ts` fails CI if any of them slips. But those measurements are taken
against the flat palette. An overlay tuned by eye in a stylesheet sits entirely outside that
check — the palette would remain provably sound while the rendered page quietly was not.

Two distinct risks, and they need different answers:

**Layers over content** change the colour of the text itself. A vignette drawn on top of the
page darkens glyphs along with the background, so `bone` at a measured 15.45:1 becomes some
other number nobody computed. The ratio does not necessarily get worse — it depends on the
direction — but it stops being _known_, which is the property worth protecting.

**Layers behind content** only change the background. The ratio moves in one direction and
by a computable amount. That is tractable.

The grain forced the second question. A purely darkening grain would need no contrast
argument at all, since light text on a darker surface only gains contrast — but on `crypt`
(#141317) multiplicative darkening moves the surface by about one value out of 255. The
texture is invisible. Visible grain on a near-black surface has to lighten.

## Decision

**Atmosphere renders behind content.** The vignette and the fog are `position: fixed` at
`--z-atmosphere`, which is `-1`. This works because the page background lives on `html`
rather than `body`: the root background paints to the canvas first, then negative-z children
of `body`, then content. The grain is a background _image_ layer on the card rather than an
`::after` pseudo-element, for the same reason — background layers composite only with each
other and never with the element's text.

**No atmosphere layer may lighten its surface past `stone`.**

`stone` (#1F1D23) is the lightest surface in the theme, and every text colour is already
measured against it in `SHIPPED_PAIRS`. A layer that stays under it therefore needs no new
guarantee; the existing one already covers the result. Darkening is unconstrained.

That ceiling sets both alphas, in `packages/design-tokens/src/texture.ts`:

| Layer   | Over    | Peak alpha | Resulting surface | vs `stone`   |
| ------- | ------- | ---------- | ----------------- | ------------ |
| `GRAIN` | `crypt` | 0.10       | #1D1C20           | under        |
| `FOG`   | `void`  | 0.18       | #1F1D21           | at the limit |

`texture.test.ts` asserts both, and separately asserts that all four text colours still clear
4.5:1 over each covered surface.

## Consequences

The ceiling binds _before_ the text bar does. Grain would not actually break AA until around
0.16, so the rule costs some visual strength it did not strictly have to. That is deliberate:
being bound by the stricter of the two means the atmosphere can be retuned later without
anyone having to re-derive whether the palette still holds. The check is "is it under
`stone`", which is one comparison, rather than "recompute every pair".

The textures are subtle — genuinely hard to see in a single screenshot, which is why
`atmosphere.stories.tsx` ships off/on pairs rather than one story. §6 asked for exactly this
("Subtle… restrained ornament"), so the constraint and the brief happen to agree. If they had
disagreed, the constraint would have won.

Two things are now fragile in a way worth naming. Moving the page background from `html` to
`body` makes the vignette and fog vanish completely, with no error — the note lives on
`Z_INDEX.atmosphere`. And building a future overlay as an `::after` on a content element
would put it over text and silently leave this ADR's guarantee behind; the grain's comment in
`base.css` records why it is not built that way.

**The fog is the one piece of decoration in the system that ships JavaScript.** §6 requires
it to disable "on low-power devices so we don't burn a player's phone battery at the table",
and CSS cannot express that — there is no battery media query and no way to read a core
count. The choice was a client component or not honouring the requirement.

So `Fog` is a `*.client.tsx` leaf that reads `navigator.hardwareConcurrency`,
`navigator.deviceMemory`, `navigator.connection.saveData` and the Battery Status API, and
renders nothing when any of them says the device is constrained. The thresholds live in
`canAffordAmbientMotion` — a pure function over a plain object, unit-tested against each
device class, rather than an `if` buried in an effect. It re-evaluates on `levelchange`,
`chargingchange` and on the reduced-motion media query, so unplugging a phone at 15% stops
the fog then rather than on the next page load.

That costs about a kilobyte of JavaScript, no fog at all without JavaScript, and a fade-in
after hydration instead of presence in the first paint. Acceptable for decoration; it would
not be for content, and this should not become a precedent for pulling anything else client-
side. `Vignette` stays a Server Component precisely because it has nothing to decide.

**Missing signals mean the fog stays on**, which is the opposite of how the rest of this repo
treats an unknown. Fail-closed is correct when being wrong leaks a spoiler; here being wrong
costs a slightly warmer phone. Defaulting to off whenever a signal is absent would disable
the fog on every Safari device — most of the phones at the table, including capable ones —
to catch the few that would have reported a problem. Firefox and Safari both removed the
Battery API over fingerprinting concerns, so on those browsers the core count is the only
reading we get.

The CSS guards stay alongside it: `prefers-reduced-motion: reduce`, `update: slow` and
`prefers-reduced-data: reduce` still remove the layer in the stylesheet. That duplication is
three lines and it is what holds if the component is ever rendered without its script.
Removed rather than paused, because the global reduced-motion rule would otherwise freeze
the fog mid-drift as a static grey smear.

## Alternatives considered

**Overlay the vignette, as is conventional.** Nearly every vignette on the web is drawn over
the page, and it looks better — the darkening reaches the cards at the edges rather than
stopping at them. Rejected because it puts a tint over live text, which turns every number in
ADR 0007 into an estimate. The gain is a slightly more cohesive edge; the cost is the one
property this design system is actually built around.

**Darkening-only grain, needing no cap.** The first attempt, and provably safe: multiply
blending cannot lighten, so light text can only gain contrast. Abandoned because on `crypt`
it is invisible — a texture that changes the surface by one value out of 255 is not a texture.
Worth recording so it is not re-attempted.

**Tune the alphas by eye and add no test.** What most projects do. Rejected because the
failure is invisible and permanent: nobody re-checks a decoration layer, and the contrast
suite would keep reporting green against a palette the page no longer renders.

**CSS-only low-power detection.** `update: slow` and `prefers-reduced-data: reduce` are the
closest media queries available, and they were what shipped first. Kept, but not sufficient
on their own: neither fires on an ordinary mid-range phone running low on battery, which is
the exact case §6 names. Retained as the no-JavaScript fallback rather than replaced.

**Skip the textures entirely.** They were deliberately deferred at the end of Phase 2 on the
grounds that they could not be judged against two placeholder screens. Reversed on request,
and the paired stories turned out to be the missing piece — a scene with cards, callouts and
prose is enough to judge them against, without needing the real wiki.
