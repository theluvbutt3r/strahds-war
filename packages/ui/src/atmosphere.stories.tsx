import { type Meta, type StoryObj } from "@storybook/react-vite";

import { Vignette } from "./atmosphere";
import { Badge } from "./badge";
import { Button } from "./button";
import { Callout, CalloutTitle } from "./callout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Fog } from "./fog.client";
import { OrnamentRule } from "./separator";

/**
 * The three textures from PLAN.md §6, each with an off/on pair.
 *
 * They are deliberately hard to see one at a time — that is the brief ("Subtle… restrained
 * ornament"). The paired stories exist so the difference can be judged by flipping between
 * two screenshots rather than by squinting at one.
 */
const meta = {
  title: "Design tokens/Atmosphere",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A page-shaped scene, so each texture is judged against real content rather than a swatch. */
function Scene({ children }: { readonly children?: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh px-8 py-16">
      {children}
      <div className="relative mx-auto grid max-w-2xl gap-8">
        <header className="grid justify-items-center gap-4 text-center">
          <h1 className="font-display tracking-display text-4xl font-bold">STRAHD&rsquo;S WAR</h1>
          <OrnamentRule className="w-48" />
        </header>

        <p className="text-text-muted mx-auto max-w-prose text-center">
          The mists close behind you. Whatever road you took into the valley, it is not there any
          more.
        </p>

        <div className="grid gap-4 tablet:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle>Vallaki</CardTitle>
                <Badge variant="nature">Settlement</Badge>
              </div>
              <CardDescription>Walled town · Baron Vargas Vallakovich</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Festival banners hang over streets nobody walks after dark.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle>Castle Ravenloft</CardTitle>
                <Badge variant="danger">Hostile</Badge>
              </div>
              <CardDescription>Fortress · Strahd von Zarovich</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Black stone, and a courtyard under a starless sky.</p>
            </CardContent>
          </Card>
        </div>

        <Callout variant="readAloud" className="mx-auto">
          <CalloutTitle>Read aloud</CalloutTitle>
          The gates stand open. They were not open a moment ago.
        </Callout>

        <div className="flex justify-center gap-3">
          <Button>Enter the valley</Button>
          <Button variant="secondary">Turn back</Button>
        </div>
      </div>
    </div>
  );
}

/** A tighter view, for judging the grain — it is a per-card texture, not a page one. */
function CardPair({ grain }: { readonly grain: boolean }) {
  return (
    <div className="grid min-h-dvh place-content-center gap-6 p-12">
      <Card grain={grain} className="w-[28rem]">
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
      </Card>

      <Card grain={grain} className="w-[28rem]">
        <CardContent className="pt-6">
          <div className="bg-raised rounded-sm p-4 text-sm">
            A raised surface inside a card. The grain sits on the card only — nested surfaces and
            text are untouched, because it is a background layer rather than an overlay.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const GrainOff: Story = { render: () => <CardPair grain={false} /> };
export const GrainOn: Story = { render: () => <CardPair grain /> };

export const VignetteOff: Story = { render: () => <Scene /> };
export const VignetteOn: Story = {
  render: () => (
    <Scene>
      <Vignette />
    </Scene>
  ),
};

export const FogOff: Story = { render: () => <Scene /> };

/**
 * The fog animates over 90 seconds, so a screenshot catches one arbitrary moment of it.
 * Open the story rather than trusting the still.
 *
 * It also gates itself on device capability (ADR 0008), so on a low-end phone, a device
 * under 20% battery, or with reduced motion enabled, this story correctly renders nothing.
 * That is the feature, but it does mean "the fog story looks empty" is not always a bug —
 * check the reduced-motion setting before going looking for one.
 */
export const FogOn: Story = {
  render: () => (
    <Scene>
      <Fog />
    </Scene>
  ),
};

/** Everything at once, which is the only combination that ever actually ships. */
export const AllThree: Story = {
  render: () => (
    <Scene>
      <Vignette />
      <Fog />
    </Scene>
  ),
};
