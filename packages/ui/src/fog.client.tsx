"use client";

import { type ComponentProps, useEffect, useState } from "react";

import { cn } from "./lib/cn";
import {
  type BatteryManager,
  canAffordAmbientMotion,
  readBattery,
  readDeviceSignals,
} from "./lib/device-capability";

/**
 * Slow drifting fog. **Landing page only** — §6 is specific about that, and it is a
 * reasonable rule: atmosphere that follows you onto every entity page stops being
 * atmosphere and becomes something moving behind text you are trying to read.
 *
 * ## Why this one ships JavaScript
 *
 * Everything else in @sw/ui that carries `"use client"` does so because it needs browser
 * behaviour to *work* — a focus trap, a roving tab index. This one is decoration, so the
 * bar is higher, and the reason it clears it is §6's own requirement: the fog must disable
 * "on low-power devices so we don't burn a player's phone battery at the table". CSS has no
 * battery query and no way to read core count. The choice was JavaScript or not honouring
 * the requirement. ADR 0008 records it.
 *
 * The cost, stated plainly: about a kilobyte of JS, no fog at all without JavaScript, and
 * the layer fades in after hydration rather than being present in the first paint. All
 * three are acceptable for a decoration and would not be for content.
 *
 * `prefers-reduced-motion` is handled twice on purpose — here, and again in `base.css`. The
 * CSS rule is the one that holds if this component is ever rendered without its script, and
 * the duplication costs three lines.
 */
export function Fog({ className, ...props }: ComponentProps<"div">) {
  // Starts false so the server renders nothing and hydration cannot mismatch. On a capable
  // device the fog appears a frame later, which is why it fades in rather than snapping.
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    let battery: BatteryManager | null = null;

    const evaluate = () => {
      if (!active) return;
      setEnabled(
        canAffordAmbientMotion({
          ...readDeviceSignals(),
          ...(battery === null ? {} : { batteryLevel: battery.level, charging: battery.charging }),
        }),
      );
    };

    evaluate();

    // Re-evaluate when the preference changes, so toggling reduced motion in the OS takes
    // effect without a reload. `matchMedia` is absent in some test environments.
    const motion =
      typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
    motion?.addEventListener("change", evaluate);

    void readBattery().then((found) => {
      if (!active || found === null) return;
      battery = found;
      // Unplugging at 15% should stop the fog then, not on the next page load.
      found.addEventListener("levelchange", evaluate);
      found.addEventListener("chargingchange", evaluate);
      evaluate();
    });

    return () => {
      active = false;
      motion?.removeEventListener("change", evaluate);
      battery?.removeEventListener("levelchange", evaluate);
      battery?.removeEventListener("chargingchange", evaluate);
    };
  }, []);

  if (!enabled) return null;

  return <div aria-hidden="true" className={cn("fog animate-fade-in", className)} {...props} />;
}
