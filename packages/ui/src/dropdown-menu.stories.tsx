import { type Meta, type StoryObj } from "@storybook/react-vite";
import { FileText, MapPin, Users } from "lucide-react";

import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "./dropdown-menu.client";

const meta = {
  title: "Overlays/DropdownMenu",
  component: DropdownMenu,
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The "+ New" menu from the left rail.
 *
 * Which items exist is a server decision. Rendering every capability and disabling the ones
 * a role lacks would tell a player exactly what the DM can do — a smaller leak than content,
 * but a leak. Build the item list from `can()` and omit what does not apply.
 */
export const Default: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary">New entry</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Create</DropdownMenuLabel>
        <DropdownMenuItem>
          <Users />
          NPC
          <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <MapPin />
          Location
        </DropdownMenuItem>
        <DropdownMenuItem>
          <FileText />
          Session recap
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>Import from Markdown</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

export const WithCheckboxes: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">Filter</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Show</DropdownMenuLabel>
        <DropdownMenuCheckboxItem checked>Alive</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked>Undead</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem>Deceased</DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
