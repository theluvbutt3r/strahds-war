/**
 * @sw/ui — shadcn/ui primitives vendored and restyled Barovian.
 *
 * Components are copied in as source rather than installed from a package. That is the
 * whole point of shadcn/ui: heavy restyling never fights the library, because there is no
 * library to fight — only files in this directory that we own and can read. Radix supplies
 * the parts that are genuinely hard to get right by hand (focus traps, roving focus,
 * type-ahead, the ARIA bookkeeping), and nothing supplies the styling.
 *
 * ## Two rules for anything added here
 *
 * **Colour comes from the semantic tokens.** `bg-surface`, `text-text-muted`,
 * `text-on-fill` — not `bg-crypt` and never a raw hex. Half the palette is too dark to
 * carry text, and the pairs that are safe are the ones the contrast test checks
 * (ADR 0007). A component that reaches past the tokens is a component the test cannot see.
 *
 * **A component enforces nothing.** Visibility is decided on the server, in the query,
 * before serialisation. `CalloutSecret` and the `secret` badge *label* DM-only material
 * that the viewer has already been cleared for; they do not withhold it. If a component
 * ever looks like the thing keeping a player out, the design is wrong — see ADR 0006.
 */

export { Vignette } from "./atmosphere";
export { Badge, badgeVariants, type BadgeProps } from "./badge";
export { Button, buttonVariants, type ButtonProps } from "./button";
export { Callout, CalloutSecret, CalloutTitle, type CalloutProps } from "./callout";
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";
export { Input, Textarea } from "./input";
export { Label } from "./label";
export { OrnamentRule, Separator } from "./separator";
export { Skeleton } from "./skeleton";

export { cn } from "./lib/cn";

// Interactive primitives. These carry "use client" and become client-boundary components
// in the Next app; a Server Component may render them, but must not hand them content it
// would not put in the page payload.
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./dialog.client";
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "./dropdown-menu.client";
// Decoration rather than behaviour, and the only client component here that is. It gates
// itself on device capability, which CSS cannot express — see ADR 0008.
export { Fog } from "./fog.client";
export { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs.client";
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip.client";
