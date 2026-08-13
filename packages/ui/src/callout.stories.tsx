import { type Meta, type StoryObj } from "@storybook/react-vite";

import { Callout, CalloutSecret, CalloutTitle } from "./callout";

const meta = {
  title: "Content/Callout",
  component: Callout,
  parameters: { layout: "padded" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "readAloud", "tarokka", "secret", "warning"],
    },
  },
} satisfies Meta<typeof Callout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReadAloud: Story = {
  args: { variant: "readAloud" },
  render: (args) => (
    <Callout {...args} className="max-w-prose">
      <CalloutTitle>Read aloud</CalloutTitle>
      The gates of Castle Ravenloft stand open. Beyond them, a courtyard of black stone waits under
      a sky that has not shown a star in living memory.
    </Callout>
  ),
};

export const Tarokka: Story = {
  args: { variant: "tarokka" },
  render: (args) => (
    <Callout {...args} className="max-w-prose">
      <CalloutTitle>The Tarokka reading</CalloutTitle>
      <em>The Broken One.</em> Look for the treasure where the servants of the Morninglord once
      knelt.
    </Callout>
  ),
};

export const Warning: Story = {
  args: { variant: "warning" },
  render: (args) => (
    <Callout {...args} className="max-w-prose">
      <CalloutTitle>Warning</CalloutTitle>
      Entering the Amber Temple without a plan for the vestiges has ended three campaigns.
    </Callout>
  ),
};

/**
 * `CalloutSecret` labels DM-only prose the server has already cleared the viewer for.
 *
 * It is the component whose name most invites the mistake, so: it hides nothing. A player
 * never receives this text at all — the query filtered it out before serialisation. The
 * crimson edge tells the DM not to read it at the table.
 */
export const Secret: Story = {
  render: () => (
    <CalloutSecret className="max-w-prose">
      Vargas knows precisely what happens to the people he sends to the stocks. The festivals are
      not denial; they are a distraction he is running on purpose.
    </CalloutSecret>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="grid max-w-prose gap-4">
      <Callout>A neutral aside.</Callout>
      <Callout variant="readAloud">Descriptive text, spoken to the table.</Callout>
      <Callout variant="tarokka">A fortune, drawn from the deck.</Callout>
      <Callout variant="secret">DM-only material.</Callout>
      <Callout variant="warning">Something that will hurt if ignored.</Callout>
    </div>
  ),
};
