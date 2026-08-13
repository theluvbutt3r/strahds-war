import { type Meta, type StoryObj } from "@storybook/react-vite";
import { BookOpen, Plus, Trash2 } from "lucide-react";

import { Button } from "./button";

const meta = {
  title: "Primitives/Button",
  component: Button,
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "ghost", "link", "danger", "gold"],
    },
    size: { control: "select", options: ["sm", "default", "lg", "icon"] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "Open the tome" },
};

/**
 * Every variant, side by side — the view that makes an inconsistency obvious.
 *
 * `gold` is the odd one out on purpose: it is the only variant with dark text, because
 * `bone` on `gold` measures 2.43:1. See ADR 0007.
 */
export const Variants: Story = {
  args: { children: "Button" },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} variant="default">
        Primary
      </Button>
      <Button {...args} variant="secondary">
        Secondary
      </Button>
      <Button {...args} variant="ghost">
        Ghost
      </Button>
      <Button {...args} variant="link">
        Link
      </Button>
      <Button {...args} variant="danger">
        Destroy
      </Button>
      <Button {...args} variant="gold">
        Seal
      </Button>
    </div>
  ),
};

export const Sizes: Story = {
  args: { children: "Button" },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="default">
        Default
      </Button>
      <Button {...args} size="lg">
        Large
      </Button>
      <Button {...args} size="icon" aria-label="Add an entry">
        <Plus />
      </Button>
    </div>
  ),
};

export const WithIcons: Story = {
  args: { children: "Button" },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button>
        <Plus />
        New NPC
      </Button>
      <Button variant="secondary">
        <BookOpen />
        Read lore
      </Button>
      <Button variant="danger">
        <Trash2 />
        Delete
      </Button>
    </div>
  ),
};

export const Disabled: Story = {
  args: { children: "Sealed shut", disabled: true },
};

/**
 * `asChild` renders the child element with the button's styling, so a link can look like a
 * button without an `<a>` nested inside a `<button>` — invalid HTML that breaks keyboard
 * activation in ways that are easy to miss.
 */
export const AsLink: Story = {
  args: { children: "" },
  render: () => (
    <Button asChild variant="secondary">
      <a href="#barovia">Travel to Barovia</a>
    </Button>
  ),
};
