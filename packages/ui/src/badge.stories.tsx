import { type Meta, type StoryObj } from "@storybook/react-vite";
import { Lock } from "lucide-react";

import { Badge } from "./badge";

const meta = {
  title: "Primitives/Badge",
  component: Badge,
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "blood", "nature", "arcane", "danger", "secret"],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "Vallaki" },
};

export const Variants: Story = {
  args: { children: "Badge" },
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>NPC</Badge>
      <Badge variant="blood">Vistani</Badge>
      <Badge variant="nature">Svalich Woods</Badge>
      <Badge variant="arcane">Abjuration</Badge>
      <Badge variant="danger">Hostile</Badge>
      <Badge variant="secret">
        <Lock />
        DM only
      </Badge>
    </div>
  ),
};

/**
 * The `secret` badge marks tier. It does not enforce it.
 *
 * If this is rendering, the server already decided the viewer clears `dm` and sent the
 * content. Nothing is withheld by leaving it off — see ADR 0006.
 */
export const SecretIsALabelNotAGate: Story = {
  args: { children: "" },
  render: () => (
    <div className="max-w-sm space-y-3">
      <div className="flex items-center gap-2">
        <span className="font-display text-lg">The Burgomaster</span>
        <Badge variant="secret">
          <Lock />
          DM only
        </Badge>
      </div>
      <p className="text-text-muted text-sm">
        Visibility is enforced in the query, before serialisation. This badge tells the DM not to
        read the next paragraph aloud.
      </p>
    </div>
  ),
};
