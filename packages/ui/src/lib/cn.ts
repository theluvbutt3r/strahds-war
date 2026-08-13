import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Joins class names and resolves Tailwind conflicts, last one winning.
 *
 * The conflict part is the reason this exists rather than a template string. A component
 * declares `bg-crypt` in its variant and a caller passes `className="bg-stone"`; plain
 * concatenation leaves both in the attribute and the winner is whichever CSS rule Tailwind
 * happened to emit later — stable in one build, and not in the next. `twMerge` knows the
 * two belong to the same group and drops the earlier one, so callers can always override.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
