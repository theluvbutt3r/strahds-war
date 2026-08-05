/**
 * @sw/content-render — TipTap JSON to HTML/React.
 *
 * Lives apart from @sw/editor so the phone app can render campaign content identically
 * without shipping a rich-text editor it will never use.
 *
 * Phase 3 fills this in (docs/PLAN.md §9).
 */

export const CONTENT_RENDER_PHASE = 3 as const;
