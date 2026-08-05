/**
 * @sw/editor — TipTap 3 with the campaign's custom node types.
 *
 * Planned extensions: [[Wikilink]], @mention, stat block, DM-only block, Tarokka card,
 * read-aloud box. The DM-only block is the one with teeth — it renders visibly distinct
 * in the editor and is stripped server-side for anyone without clearance, so it is never
 * merely hidden with CSS.
 *
 * Phase 4 fills this in (docs/PLAN.md §9).
 */

export const EDITOR_PHASE = 4 as const;
