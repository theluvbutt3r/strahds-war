import { type Meta, type StoryObj } from "@storybook/react-vite";
import { Bookmark, Share2, Star } from "lucide-react";

import { Button } from "./button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip.client";

const meta = {
  title: "Overlays/Tooltip",
  component: Tooltip,
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Note that every trigger below also carries an `aria-label`.
 *
 * Tooltips do not appear on touch, and players read this on phones at the table — so
 * anything conveyed only by a tooltip is conveyed to nobody on the primary device. The
 * tooltip is a convenience for pointer users on top of a label that already exists.
 */
export const Default: Story = {
  render: () => (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Bookmark this page">
              <Bookmark />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bookmark for offline reading</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Mark as a favourite">
              <Star />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Favourite</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Copy a link to this page">
              <Share2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy link</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
};

export const Sides: Story = {
  render: () => (
    <TooltipProvider>
      <div className="flex items-center gap-3">
        {(["top", "right", "bottom", "left"] as const).map((side) => (
          <Tooltip key={side}>
            <TooltipTrigger asChild>
              <Button variant="secondary" size="sm">
                {side}
              </Button>
            </TooltipTrigger>
            <TooltipContent side={side}>Opens {side}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  ),
};
