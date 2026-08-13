import { type Meta, type StoryObj } from "@storybook/react-vite";
import {
  AA_BODY_TEXT,
  contrastRatio,
  FILL_COLORS,
  PALETTE,
  SHIPPED_PAIRS,
  SURFACE_COLORS,
  TEXT_COLORS,
  TYPE_SCALE,
  type ColorName,
} from "@sw/design-tokens";

/**
 * The tokens themselves, rendered.
 *
 * This page is not the guarantee — `contrast.test.ts` in @sw/design-tokens is, and it runs
 * in CI where nobody can skip it by not opening a story. What this adds is the thing a test
 * cannot: seeing the palette next to its own numbers, so "that crimson looks unreadable" and
 * "that crimson measures 3.29:1" arrive at the same moment.
 */
const meta = {
  title: "Design tokens/Overview",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function ratio(foreground: ColorName, background: ColorName): string {
  return contrastRatio(PALETTE[foreground], PALETTE[background]).toFixed(2);
}

function Swatch({ name }: { readonly name: ColorName }) {
  return (
    <div className="grid gap-1">
      <div
        className="border-border h-14 w-full rounded-sm border"
        style={{ backgroundColor: PALETTE[name] }}
      />
      <span className="font-mono text-xs">{name}</span>
      <span className="text-text-muted font-mono text-xs">{PALETTE[name]}</span>
    </div>
  );
}

export const Palette: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-8">
      <section className="grid gap-3">
        <h2 className="font-display text-xl">Surfaces</h2>
        <div className="grid grid-cols-3 gap-3">
          {SURFACE_COLORS.map((name) => (
            <Swatch key={name} name={name} />
          ))}
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="font-display text-xl">Text colours</h2>
        <p className="text-text-muted text-sm">
          The only four permitted to carry text. `TextColor` in @sw/design-tokens makes any other
          one a compile error where a text colour is expected.
        </p>
        <div className="grid grid-cols-4 gap-3">
          {TEXT_COLORS.map((name) => (
            <Swatch key={name} name={name} />
          ))}
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="font-display text-xl">Fill colours</h2>
        <p className="text-text-muted text-sm">
          Backgrounds, borders and large display type. Every one of these is under 4.5:1 on a dark
          surface, so none of them may set body text — see ADR 0007.
        </p>
        <div className="grid grid-cols-4 gap-3">
          {FILL_COLORS.map((name) => (
            <Swatch key={name} name={name} />
          ))}
        </div>
      </section>
    </div>
  ),
};

/**
 * Every pair the design system commits to, with its measured ratio.
 *
 * The `blood` and `ember` rows at the bottom are the reason the text tier exists: PLAN.md §6
 * originally put them at 3.9:1 and 5.3:1 and concluded `ember` could carry text.
 */
export const Contrast: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-8">
      <section className="grid gap-3">
        <h2 className="font-display text-xl">Shipped pairs</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-text-muted border-rule/30 border-b text-xs tracking-wide uppercase">
              <th className="py-2 font-medium">Sample</th>
              <th className="py-2 font-medium">Pair</th>
              <th className="py-2 text-right font-medium">Ratio</th>
              <th className="py-2 text-right font-medium">AA</th>
            </tr>
          </thead>
          <tbody>
            {SHIPPED_PAIRS.map((pair) => {
              const measured = contrastRatio(PALETTE[pair.foreground], PALETTE[pair.background]);
              return (
                <tr key={pair.usage} className="border-rule/15 border-b">
                  <td className="py-2">
                    <span
                      className="inline-block rounded-sm px-3 py-1 text-sm"
                      style={{
                        backgroundColor: PALETTE[pair.background],
                        color: PALETTE[pair.foreground],
                      }}
                    >
                      Barovia
                    </span>
                  </td>
                  <td className="text-text-muted py-2 font-mono text-xs">{pair.usage}</td>
                  <td className="py-2 text-right font-mono">{measured.toFixed(2)}</td>
                  <td className="py-2 text-right font-mono text-xs">
                    {measured >= pair.minimum ? "pass" : "FAIL"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="grid gap-3">
        <h2 className="font-display text-xl">Why the text tier exists</h2>
        <p className="text-text-muted text-sm">
          These are the fill colours set as text on `void`, which is what §6 originally asked for.
          AA body text needs {AA_BODY_TEXT}:1.
        </p>
        <div className="grid gap-2">
          {(["blood", "ember", "mist"] as const).map((name) => (
            <div
              key={name}
              className="flex items-center justify-between rounded-sm px-4 py-3"
              style={{ backgroundColor: PALETTE.void }}
            >
              <span style={{ color: PALETTE[name] }}>The mists close behind you ({name})</span>
              <span className="font-mono text-xs" style={{ color: PALETTE.mistLit }}>
                {ratio(name, "void")}:1 — fails
              </span>
            </div>
          ))}
          {(["emberLit", "mistLit"] as const).map((name) => (
            <div
              key={name}
              className="flex items-center justify-between rounded-sm px-4 py-3"
              style={{ backgroundColor: PALETTE.void }}
            >
              <span style={{ color: PALETTE[name] }}>The mists close behind you ({name})</span>
              <span className="font-mono text-xs" style={{ color: PALETTE.mistLit }}>
                {ratio(name, "void")}:1 — passes
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  ),
};

export const Typography: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-8">
      <section className="grid gap-4">
        <h2 className="font-display text-xl">Faces</h2>
        <p className="font-display text-3xl tracking-display">Cinzel — carved stone</p>
        <p className="font-serif text-lg">
          Spectral — long-form lore, read-aloud text, anything the eye stays with.
        </p>
        <p className="font-sans text-base">
          Inter — navigation, forms, admin. Legibility beats atmosphere for functional text.
        </p>
        <p className="font-mono text-sm">JetBrains Mono — 2d6 + 3, AC 16, CR 15</p>
      </section>

      <section className="grid gap-3">
        <h2 className="font-display text-xl">Scale</h2>
        {Object.entries(TYPE_SCALE).map(([name, step]) => (
          <div key={name} className="flex items-baseline gap-4">
            <span className="text-text-muted w-14 shrink-0 font-mono text-xs">{name}</span>
            <span style={{ fontSize: step.size, lineHeight: step.lineHeight }}>
              The lands of Barovia
            </span>
            <span className="text-text-muted ml-auto shrink-0 font-mono text-xs">
              {step.size} / {step.lineHeight}
            </span>
          </div>
        ))}
      </section>

      <section className="grid gap-3">
        <h2 className="font-display text-xl">Measure</h2>
        <p className="prose text-sm">
          Prose is capped at 72 characters. Below about 65 the eye hits a line break too often to
          build any rhythm; above about 75 the return sweep starts landing on the wrong line, and
          the reader loses their place in a way they experience as the writing being hard to follow
          rather than as a layout problem.
        </p>
      </section>
    </div>
  ),
};
