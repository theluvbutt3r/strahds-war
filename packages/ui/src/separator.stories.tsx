import { type Meta, type StoryObj } from "@storybook/react-vite";

import { OrnamentRule, Separator } from "./separator";
import { Skeleton } from "./skeleton";

const meta = {
  title: "Primitives/Separator",
  component: Separator,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-80">
      <p className="pb-4 text-sm">Overview</p>
      <Separator />
      <p className="pt-4 text-sm">History</p>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-10 items-center gap-4 text-sm">
      <span>NPCs</span>
      <Separator orientation="vertical" />
      <span>Places</span>
      <Separator orientation="vertical" />
      <span>Factions</span>
    </div>
  ),
};

/**
 * The one piece of deliberate decoration in the set. §6 allows exactly this much:
 * "one wax seal is gothic, twelve is a Halloween store."
 */
export const Ornament: Story = {
  render: () => (
    <div className="grid w-80 gap-6 text-center">
      <h2 className="font-display tracking-display text-2xl">Chapter the Third</h2>
      <OrnamentRule />
      <p className="text-text-muted text-sm">In which the party reaches Vallaki.</p>
    </div>
  ),
};

/**
 * Loading placeholders. `aria-hidden`, because a screen reader reading out six grey
 * rectangles tells the user nothing — the page announces "Loading…" once instead.
 */
export const LoadingPlaceholders: Story = {
  render: () => (
    <div className="grid w-80 gap-3">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  ),
};
