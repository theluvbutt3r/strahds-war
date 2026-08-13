import { type Meta, type StoryObj } from "@storybook/react-vite";

import { Input, Textarea } from "./input";
import { Label } from "./label";

const meta = {
  title: "Forms/Input",
  component: Input,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: "Ireena Kolyana" },
  render: (args) => (
    <div className="w-80">
      <Input {...args} />
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-80 gap-2">
      <Label htmlFor="npc-name">Name</Label>
      <Input id="npc-name" placeholder="Ireena Kolyana" />
    </div>
  ),
};

/**
 * The error state is driven by `aria-invalid`, not by a `variant` prop.
 *
 * That attribute is what a screen reader announces, so styling from the same source keeps
 * the two from disagreeing — a crimson border with no announcement is a field only sighted
 * users know is wrong. The message uses `role="alert"` for the same reason.
 */
export const Invalid: Story = {
  render: () => (
    <div className="grid w-80 gap-2">
      <Label htmlFor="npc-slug">Slug</Label>
      <Input
        id="npc-slug"
        defaultValue="Ireena Kolyana"
        aria-invalid
        aria-describedby="slug-error"
      />
      <p id="slug-error" role="alert" className="text-text-accent text-xs">
        Slugs are lowercase and hyphenated.
      </p>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="grid w-80 gap-2">
      <Label htmlFor="npc-locked">Sealed</Label>
      <Input id="npc-locked" defaultValue="Strahd von Zarovich" disabled />
    </div>
  ),
};

export const Multiline: Story = {
  render: () => (
    <div className="grid w-96 gap-2">
      <Label htmlFor="npc-notes">Session notes</Label>
      <Textarea id="npc-notes" placeholder="What the party actually did…" rows={4} />
    </div>
  ),
};
