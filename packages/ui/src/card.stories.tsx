import { type Meta, type StoryObj } from "@storybook/react-vite";

import { Badge } from "./badge";
import { Button } from "./button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";

const meta = {
  title: "Primitives/Card",
  component: Card,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>The Burgomaster of Vallaki</CardTitle>
        <CardDescription>Baron Vargas Vallakovich · Alive</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          Convinced that forced merriment keeps the darkness at bay, and increasingly willing to
          punish anyone who fails to enjoy it.
        </p>
      </CardContent>
      <CardFooter>
        <Button size="sm">Open</Button>
        <Button size="sm" variant="ghost">
          Relationships
        </Button>
      </CardFooter>
    </Card>
  ),
};

export const WithBadges: Story = {
  render: () => (
    <Card className="max-w-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle>Izek Strazni</CardTitle>
          <Badge variant="danger">Hostile</Badge>
        </div>
        <CardDescription>Captain of the guard</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Badge>NPC</Badge>
        <Badge variant="blood">Vallaki</Badge>
        <Badge variant="arcane">Fiendish arm</Badge>
      </CardContent>
    </Card>
  ),
};

/**
 * Three surfaces, stacked, showing the depth steps.
 *
 * `void` → `crypt` → `stone` sit about 1.3:1 apart, well under the 3:1 WCAG asks of
 * meaningful boundaries. That is allowed here because the separation is decorative — no
 * state is conveyed by it. Anything that *does* convey state uses gold or crimson.
 */
export const Surfaces: Story = {
  render: () => (
    <div className="bg-background max-w-md rounded-lg p-6">
      <p className="text-text-muted mb-3 text-xs tracking-wide uppercase">void — the page</p>
      <Card>
        <CardContent className="pt-6">
          <p className="text-text-muted mb-3 text-xs tracking-wide uppercase">crypt — a card</p>
          <div className="bg-raised rounded-sm p-4">
            <p className="text-text-muted text-xs tracking-wide uppercase">
              stone — an input or hover state
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  ),
};
