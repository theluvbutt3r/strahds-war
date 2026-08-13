/**
 * Whether this device can afford to run ambient animation.
 *
 * PLAN.md §6 asks that the fog layer "disables on low-power devices so we don't burn a
 * player's phone battery at the table". CSS cannot answer that — there is no battery media
 * query — so the decision needs JavaScript, and shipping JavaScript for a decoration is a
 * real cost. See ADR 0008 for why it was judged worth paying here and nowhere else.
 *
 * The policy is split from the reading deliberately. `canAffordAmbientMotion` is a pure
 * function over a plain object, so every threshold below is unit-tested against the device
 * classes that matter; `readDeviceSignals` is the small untestable part that touches
 * `navigator`.
 */

/**
 * What we managed to learn about the device. Every field is optional because every field is
 * genuinely missing somewhere: `deviceMemory` and the Battery API are Chromium-only, and
 * Safari — the browser most of the players will be holding — reports neither.
 */
export interface DeviceSignals {
  /** `navigator.hardwareConcurrency`. Widely supported, including Safari. */
  readonly cores?: number | undefined;
  /** `navigator.deviceMemory`, in GB, rounded down to a power of two. Chromium only. */
  readonly memoryGb?: number | undefined;
  /** `navigator.connection.saveData` — the user has asked for less of everything. */
  readonly saveData?: boolean | undefined;
  /** Battery charge, 0–1. Chromium only. */
  readonly batteryLevel?: number | undefined;
  /** Whether the device is plugged in. A charging phone has no battery to protect. */
  readonly charging?: boolean | undefined;
  /** `prefers-reduced-motion: reduce`. */
  readonly prefersReducedMotion?: boolean | undefined;
}

/**
 * Fewer cores than this and the device is a low-end phone that will feel an 80px blur
 * repainting behind the page. Modern budget handsets report 8; a 2020-era entry phone or an
 * original iPhone SE reports 2.
 */
export const MIN_CORES = 4;

/** Below 4GB is the low-memory tier, where Chrome is already throttling aggressively. */
export const MIN_MEMORY_GB = 4;

/** Under 20% and not charging is where people start watching the number. */
export const MIN_BATTERY_LEVEL = 0.2;

/**
 * The rule, in one place.
 *
 * **Missing signals mean "no evidence of a constraint", and the fog stays on.** That is the
 * deliberate direction, and it is worth being explicit about because it is the opposite of
 * how this repo treats security defaults. Fail-closed is correct when the cost of being
 * wrong is a spoiler; here the cost of being wrong is either a slightly warmer phone or an
 * unnecessarily plain page. Defaulting to "off" whenever a signal is absent would disable
 * the fog on every Safari device — which is most phones at the table, including capable
 * ones — to protect the few that would have reported a problem.
 */
export function canAffordAmbientMotion(signals: DeviceSignals): boolean {
  if (signals.prefersReducedMotion === true) return false;
  if (signals.saveData === true) return false;

  if (signals.cores !== undefined && signals.cores < MIN_CORES) return false;
  if (signals.memoryGb !== undefined && signals.memoryGb < MIN_MEMORY_GB) return false;

  // Only meaningful together: a phone at 5% that is plugged in is fine, and a phone at 90%
  // on battery is fine. The pair that matters is low *and* unplugged.
  if (
    signals.charging === false &&
    signals.batteryLevel !== undefined &&
    signals.batteryLevel < MIN_BATTERY_LEVEL
  ) {
    return false;
  }

  return true;
}

/** Chromium exposes these; the DOM lib does not declare them. */
interface NavigatorWithHints extends Navigator {
  readonly deviceMemory?: number;
  readonly connection?: { readonly saveData?: boolean };
  readonly getBattery?: () => Promise<BatteryManager>;
}

/** The subset of the Battery Status API this uses. */
export interface BatteryManager extends EventTarget {
  readonly charging: boolean;
  readonly level: number;
}

/**
 * Everything we can read synchronously. Battery is deliberately excluded — it is behind a
 * promise, so the caller layers it in once it resolves rather than waiting on it.
 */
export function readDeviceSignals(): DeviceSignals {
  if (typeof navigator === "undefined") return {};

  const nav: NavigatorWithHints = navigator;

  return {
    cores: nav.hardwareConcurrency,
    memoryGb: nav.deviceMemory,
    saveData: nav.connection?.saveData,
    prefersReducedMotion:
      typeof matchMedia === "function"
        ? matchMedia("(prefers-reduced-motion: reduce)").matches
        : undefined,
  };
}

/**
 * The Battery Status API, or `null` where it does not exist.
 *
 * Firefox and Safari removed it over fingerprinting concerns, which is a reasonable trade
 * that simply costs us this signal on those browsers. Rejections are swallowed for the same
 * reason a missing API is: no reading is not a problem to report, it is just less to go on.
 */
export async function readBattery(): Promise<BatteryManager | null> {
  if (typeof navigator === "undefined") return null;

  const nav: NavigatorWithHints = navigator;
  if (typeof nav.getBattery !== "function") return null;

  try {
    return await nav.getBattery();
  } catch {
    return null;
  }
}
