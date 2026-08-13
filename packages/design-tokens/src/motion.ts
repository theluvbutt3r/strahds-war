/**
 * Durations and easing curves.
 *
 * §6 asks for "a crypt door rather than a modern app's snap" — 250–400ms where a typical
 * interface would use 150ms. That range is the atmosphere budget, and it is spent only on
 * things the eye is already following: a panel opening, a page transition.
 *
 * Two things stay fast regardless, because slowness there reads as a broken app rather than
 * as atmosphere: anything answering a click that the user is waiting on, and anything that
 * repeats (hover states, focus rings). Those get `instant`.
 */
export const DURATIONS = {
  /** 120ms — hover, focus, button press. Feedback, not animation. */
  instant: "120ms",
  /** 250ms — dropdowns, tooltips, tabs. The floor of §6's range. */
  quick: "250ms",
  /** 320ms — drawers, modals, the left rail sliding in. */
  base: "320ms",
  /** 400ms — page and route transitions. The ceiling; nothing is slower than this. */
  slow: "400ms",
} as const;

export type Duration = keyof typeof DURATIONS;

/**
 * Easing curves.
 *
 * `standard` is asymmetric — quick to leave, slow to arrive — which is what makes motion
 * feel weighted rather than mechanical. Linear is reserved for things with no mass, like a
 * progress bar or the drifting fog.
 */
export const EASINGS = {
  /** Default for anything entering or moving. Fast out, gentle in. */
  standard: "cubic-bezier(0.22, 0.61, 0.36, 1)",
  /** Exits. Starts gently, accelerates away — the reverse feels like the element is fleeing. */
  exit: "cubic-bezier(0.4, 0, 1, 1)",
  /** Continuous motion only: fog drift, progress, spinners. */
  linear: "linear",
} as const;

export type Easing = keyof typeof EASINGS;

/**
 * The duration everything collapses to under `prefers-reduced-motion: reduce`.
 *
 * Not `0s`. A transition of exactly zero fires no `transitionend` event in some browsers,
 * so any code waiting on one to unmount a modal hangs — a real bug that reduced-motion users
 * hit and nobody else ever sees. 1ms is imperceptible and still fires the event.
 *
 * This is a token, not a policy: the media query that applies it belongs in the global
 * stylesheet, which arrives with the Tailwind `@theme` block in the next Phase 2 step.
 */
export const REDUCED_MOTION_DURATION = "1ms";
