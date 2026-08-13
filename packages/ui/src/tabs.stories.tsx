import { type Meta, type StoryObj } from "@storybook/react-vite";

import { Badge } from "./badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs.client";

const meta = {
  title: "Navigation/Tabs",
  component: Tabs,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * What the right rail collapses into below 1280px (§7).
 *
 * The active tab is marked by the gold underline *and* by `aria-selected`. Colour alone
 * would fail WCAG 1.4.1 — a reader who cannot separate the gold from the muted grey would
 * have no way to tell which panel they are looking at.
 */
export const Default: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-96">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
        <TabsTrigger value="related">Related</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <p className="text-sm">Baron Vargas Vallakovich, burgomaster of Vallaki. Alive.</p>
      </TabsContent>
      <TabsContent value="history">
        <p className="text-sm">Took the seat after his predecessor vanished in the woods.</p>
      </TabsContent>
      <TabsContent value="related">
        <div className="flex flex-wrap gap-2">
          <Badge>Vallaki</Badge>
          <Badge>Izek Strazni</Badge>
          <Badge>Lady Fiona Wachter</Badge>
        </div>
      </TabsContent>
    </Tabs>
  ),
};

/**
 * A "Secrets" tab exists only when the server sent secrets.
 *
 * Radix unmounts inactive panels, which is a performance detail everywhere else and a
 * spoiler detail here — but it is not the protection. The protection is that a player's
 * response never carried this content, so there was no tab to render.
 */
export const WithSecrets: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-96">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="secrets">Secrets</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <p className="text-sm">Runs festival after festival to keep the town cheerful.</p>
      </TabsContent>
      <TabsContent value="secrets">
        <div className="grid gap-2">
          <Badge variant="secret">DM only</Badge>
          <p className="text-sm">He knows exactly what the stocks are for.</p>
        </div>
      </TabsContent>
    </Tabs>
  ),
};
