/**
 * Proves that the repo's package boundaries are actually enforced — not merely declared.
 *
 * PLAN.md §3 claims isolation comes from lint rules and package manifests rather than
 * repository walls. That claim is only worth anything if it keeps being true, and the
 * usual way it stops being true is silent: a resolver change, a config refactor, a
 * plugin that no longer matches paths the way it did. Nothing errors; the rules simply
 * stop firing, and the first sign of trouble is a spoiler in production.
 *
 * So this asserts the four mechanisms independently, by writing genuinely illegal code
 * and requiring each one to reject it:
 *
 *   1. pnpm manifests    — @sw/db is not resolvable from apps/web at all
 *   2. ESLint            — the layering and DB_RESTRICTED rules report an error
 *   3. dependency-cruiser — the forbidden edge is reported
 *   4. ESLint            — the spoiler-safety rules reject role branching in every scope
 *
 * The positive control at the end matters as much as the violations: a broken lint setup
 * that fails on *everything* would otherwise read as a pass.
 *
 * Mechanism 4 was added after the Phase 0 audit found the role-comparison ban silently
 * disabled across apps/web, packages/ui and packages/editor — `react.js` had redeclared
 * `no-restricted-syntax` for its own purpose, and flat config replaces a rule's options
 * rather than merging them, so the security rule vanished while still appearing to be
 * configured. Nothing failed. Mechanism 3 passed the whole time, because it only ever
 * watched package boundaries. See docs/AUDIT-REMEDIATION.md.
 *
 * The lesson generalises past that one bug: a rule that is correct today is not the same
 * as a rule that stays correct, and the difference is whether something writes illegal
 * code and checks. Any future rule the design leans on belongs here too.
 *
 * Run: pnpm verify:boundaries
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Absolute path to a locally installed CLI's JavaScript entry point.
 *
 * WHY NOT JUST RUN `pnpm exec eslint`. This harness used to shell out to `pnpm`, and on
 * Windows that cannot work: `pnpm` there is `pnpm.CMD`, a batch shim, and `execFileSync`
 * spawns executables directly rather than through a shell. The call throws ENOENT before
 * any checking happens — and because the catch in `run()` reports a throw as "non-zero
 * exit, empty output", every single check read as *rejected for the wrong reason* while
 * the positive controls read as failures. A harness whose whole purpose is to distinguish
 * "the rule fired" from "something else went wrong" was reporting the second as the
 * first, for every check, on the maintainer's own platform.
 *
 * Appending `.CMD` does not fix it either: since the fix for CVE-2024-27980, Node refuses
 * to spawn `.cmd`/`.bat` without `shell: true`, and adding a shell reintroduces argument
 * quoting as a problem — this repo's own path contains an apostrophe.
 *
 * So resolve the tool's entry point and run it under the Node binary already executing
 * this script. No shell, no shims, no quoting, identical on Windows, macOS and Linux.
 *
 * The path comes from the tool's own `bin` field rather than being hardcoded, so a
 * version bump that relocates the file surfaces here as a clear error instead of a
 * mysterious one. package.json is read as a *file* on purpose: dependency-cruiser's
 * `exports` map does not expose `./package.json`, so `require.resolve` cannot reach it.
 */
function toolEntry(pkg: string, binName: string): string {
  const manifestPath = join(ROOT, "node_modules", pkg, "package.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`${pkg} is not installed — run \`pnpm install\` before verifying boundaries.`);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    bin?: string | Record<string, string>;
  };
  const entry = typeof manifest.bin === "string" ? manifest.bin : manifest.bin?.[binName];
  if (!entry) {
    throw new Error(
      `${pkg} declares no "${binName}" bin — its layout changed; update toolEntry().`,
    );
  }

  return join(ROOT, "node_modules", pkg, entry);
}

interface Fixture {
  readonly label: string;
  /** Repo-relative path. Must sit inside the real package so path-based rules match. */
  readonly path: string;
  readonly source: string;
  /**
   * Substring expected in the checker's output.
   *
   * Matched against the rule's *message*, not its name, so that renaming or replacing a
   * rule does not quietly turn this assertion into a tautology — the reason the code was
   * rejected has to survive, not just the fact that something rejected it.
   */
  readonly expect: string;
}

const VIOLATIONS: readonly Fixture[] = [
  {
    label: "apps/web imports @sw/db",
    path: "apps/web/src/app/__boundary_check__.ts",
    source: `import { DB_PHASE } from "@sw/db";\nexport const leak = DB_PHASE;\n`,
    expect: "DB_RESTRICTED",
  },
  {
    label: "packages/schemas (layer 0) imports @sw/authz",
    path: "packages/schemas/src/__boundary_check__.ts",
    source: `import { can } from "@sw/authz";\nexport const impure = can;\n`,
    expect: "Layer-0 packages",
  },
  {
    label: "packages/authz reaches for the database",
    path: "packages/authz/src/__boundary_check__.ts",
    source: `import { drizzle } from "drizzle-orm";\nexport const io = drizzle;\n`,
    expect: "must stay free of I/O",
  },
  {
    label: "packages/ui imports @sw/db",
    path: "packages/ui/src/__boundary_check__.ts",
    source: `import { DB_PHASE } from "@sw/db";\nexport const leak = DB_PHASE;\n`,
    expect: "DB_RESTRICTED",
  },
  {
    // The bypass that pnpm cannot see. A bare `@sw/db` specifier fails to resolve from a
    // package that never declared it — but a relative path into ../../db reaches the same
    // code with no manifest entry at all. This is the case the path-based rules exist for.
    label: "packages/ui reaches into packages/db by relative path",
    path: "packages/ui/src/__boundary_check_relative__.ts",
    source: `import { DB_PHASE } from "../../db/src/index";\nexport const leak = DB_PHASE;\n`,
    expect: "may not import",
  },
];

const LEGAL: Fixture = {
  label: "positive control — packages/authz imports @sw/schemas",
  path: "packages/authz/src/__boundary_check_ok__.ts",
  source: `import { DEFAULT_VISIBILITY } from "@sw/schemas";\nexport const fine = DEFAULT_VISIBILITY;\n`,
  expect: "",
};

// ---------------------------------------------------------------------------
// Mechanism 4 fixtures — spoiler-safety rules
// ---------------------------------------------------------------------------

/**
 * Where the role ban must fire. The view layer entries are the ones that regressed:
 * `react.js` scoped its own `no-restricted-syntax` to exactly these three packages, which
 * is why the ban died there and nowhere else. `services/api` is included as the control
 * that kept working — if it is the only one passing, the same bug is back.
 */
const ROLE_SCOPES = [
  { label: "apps/web (server component)", dir: "apps/web/src/app", ext: ".tsx" },
  { label: "apps/web (plain module)", dir: "apps/web/src/app", ext: ".ts" },
  { label: "apps/web (client component)", dir: "apps/web/src/app", ext: ".client.tsx" },
  { label: "packages/ui", dir: "packages/ui/src", ext: ".tsx" },
  { label: "packages/editor", dir: "packages/editor/src", ext: ".ts" },
  { label: "services/api", dir: "services/api/src", ext: ".ts" },
] as const;

/**
 * The ways a role check gets written. The first is the obvious one the original selector
 * caught; the rest are the spellings that walked straight around it. Each must be rejected
 * in each scope above.
 */
const ROLE_BRANCH_FORMS = [
  {
    label: 'actor.role === "co-dm"',
    suffix: "_member",
    source: (jsx: boolean) =>
      jsx
        ? `export function Probe(u: { role: string }) {\n  return u.role === "co-dm" ? null : null;\n}\n`
        : `export const probe = (u: { role: string }) => u.role === "co-dm";\n`,
  },
  {
    label: 'actor["role"] === "co-dm"',
    suffix: "_computed",
    source: (jsx: boolean) =>
      jsx
        ? `export function Probe(u: { role: string }) {\n  return u["role"] === "co-dm" ? null : null;\n}\n`
        : `export const probe = (u: { role: string }) => u["role"] === "co-dm";\n`,
  },
  {
    label: 'destructured `role === "overlord"`',
    suffix: "_destructured",
    source: (jsx: boolean) =>
      jsx
        ? `export function Probe(u: { role: string }) {\n  const { role } = u;\n  return role === "overlord" ? null : null;\n}\n`
        : `export const probe = (u: { role: string }) => {\n  const { role } = u;\n  return role === "overlord";\n};\n`,
  },
  {
    label: '["co-dm", "overlord"].includes(actor.role)',
    suffix: "_includes",
    source: (jsx: boolean) =>
      jsx
        ? `export function Probe(u: { role: string }) {\n  return ["co-dm", "overlord"].includes(u.role) ? null : null;\n}\n`
        : `export const probe = (u: { role: string }) => ["co-dm", "overlord"].includes(u.role);\n`,
  },
  {
    label: "switch (actor.role)",
    suffix: "_switch",
    source: (jsx: boolean) =>
      jsx
        ? `export function Probe(u: { role: string }) {\n  switch (u.role) {\n    default:\n      return null;\n  }\n}\n`
        : `export const probe = (u: { role: string }) => {\n  switch (u.role) {\n    default:\n      return 0;\n  }\n};\n`,
  },
] as const;

/**
 * Legal code the role rules must NOT reject.
 *
 * These carry as much weight as the violations. A selector broad enough to catch every
 * spelling above is also broad enough to start rejecting ordinary code, and a rule that
 * cries wolf gets an inline disable comment — which then suppresses the real finding on
 * that line forever. The `"player"` case is the specific trap: it is a role name *and* a
 * Visibility tier, so a naive literal ban would break every legitimate clearance check.
 */
const ROLE_LEGAL: readonly Fixture[] = [
  {
    label: 'positive control — `visibility === "player"` is a tier check, not a role check',
    path: "apps/web/src/app/__role_check_ok__.ts",
    source: `import { type Visibility } from "@sw/schemas";\nexport const shown = (v: Visibility) => v === "player";\n`,
    expect: "",
  },
  {
    label: "positive control — @sw/authz may still name roles as data",
    path: "packages/authz/src/__role_check_ok__.ts",
    source: `import { type Role } from "@sw/schemas";\nexport const PUBLISHERS: readonly Role[] = ["co-dm", "overlord"];\n`,
    expect: "",
  },
];

let failures = 0;

function report(ok: boolean, label: string, detail = ""): void {
  if (ok) {
    console.log(`  [32m✓[0m ${label}`);
  } else {
    failures += 1;
    console.log(`  [31m✗[0m ${label}${detail ? `\n      ${detail}` : ""}`);
  }
}

function write(fixture: Fixture): void {
  const full = join(ROOT, fixture.path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, fixture.source, "utf8");
}

function remove(fixture: Fixture): void {
  rmSync(join(ROOT, fixture.path), { force: true });
}

/**
 * Runs a locally installed CLI under Node and returns its combined output plus status.
 *
 * A failure to *launch* is deliberately not folded into "the tool exited non-zero". The
 * two mean opposite things here — a non-zero exit is a rule firing, which is what most
 * checks below are asserting, whereas a launch failure means nothing was checked at all.
 * Reporting the second as the first is precisely how this harness passed as "everything
 * rejected" while doing no work; it throws now, loudly, rather than being scored.
 */
function run(entry: string, args: string[]): { code: number; output: string } {
  try {
    const output = execFileSync(process.execPath, [entry, ...args], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 32 * 1024 * 1024,
    });
    return { code: 0, output };
  } catch (error) {
    const err = error as { status?: number; code?: string; stdout?: string; stderr?: string };

    // `status` is null when the process never ran (ENOENT) or died on a signal. Either
    // way no checking happened, so this is a harness fault, not a finding.
    if (typeof err.status !== "number") {
      throw new Error(
        `failed to run ${entry}: ${err.code ?? "unknown error"}. The boundary harness could not execute, so nothing was verified.`,
        { cause: error },
      );
    }

    return { code: err.status, output: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

const ESLINT = toolEntry("eslint", "eslint");
const DEPCRUISE = toolEntry("dependency-cruiser", "depcruise");

function lint(paths: string[]): { code: number; output: string } {
  return run(ESLINT, ["--no-warn-ignored", "--format", "stylish", ...paths]);
}

function depcruise(dirs: string[]): { code: number; output: string } {
  return run(DEPCRUISE, [...dirs, "--output-type", "err"]);
}

// ---------------------------------------------------------------------------
// 1. pnpm manifests — the physical mechanism
// ---------------------------------------------------------------------------
console.log("\nMechanism 1 — pnpm manifests (undeclared imports cannot resolve)");

for (const consumer of ["apps/web", "packages/ui", "packages/editor"]) {
  const linked = existsSync(join(ROOT, consumer, "node_modules", "@sw", "db"));
  report(
    !linked,
    `@sw/db is not linked into ${consumer}`,
    linked ? `${consumer}/node_modules/@sw/db exists — something declared it as a dependency` : "",
  );
}

{
  const linked = existsSync(join(ROOT, "services/api/node_modules/@sw/db"));
  report(
    linked,
    "@sw/db IS linked into services/api (it is supposed to be)",
    linked ? "" : "run `pnpm install` first",
  );
}

// ---------------------------------------------------------------------------
// 2. ESLint — layering rules
// ---------------------------------------------------------------------------
console.log("\nMechanism 2 — ESLint boundary rules");

for (const fixture of VIOLATIONS) {
  write(fixture);
  try {
    const { code, output } = lint([fixture.path]);
    const rejected = code !== 0;
    const rightReason = output.includes(fixture.expect);
    report(
      rejected && rightReason,
      fixture.label,
      !rejected
        ? "ESLint exited 0 — the rule did not fire"
        : !rightReason
          ? `rejected, but not by ${fixture.expect}:\n      ${output.trim().split("\n").slice(0, 4).join("\n      ")}`
          : "",
    );
  } finally {
    remove(fixture);
  }
}

// ---------------------------------------------------------------------------
// 3. dependency-cruiser — forbidden edges and cycles
// ---------------------------------------------------------------------------
console.log("\nMechanism 3 — dependency-cruiser");

{
  // Deliberately the relative-path fixture rather than the bare-specifier one.
  // dependency-cruiser reasons about resolved files, and `import "@sw/db"` from a package
  // that never declared it resolves to nothing at all — there is no edge in the graph to
  // forbid. Its real job is the edge that *does* resolve: a relative path that walks
  // around the manifest, or a dependency someone adds to package.json on purpose.
  const fixture = VIOLATIONS[4]!;
  write(fixture);
  try {
    const { code, output } = depcruise(["apps", "services", "packages"]);
    report(
      code !== 0 && output.includes("db-only-from-api"),
      "db-only-from-api rejects a relative-path reach into packages/db",
      code === 0
        ? "depcruise exited 0 — the rule did not fire"
        : !output.includes("db-only-from-api")
          ? `rejected, but by a different rule:\n      ${output.trim().split("\n").slice(0, 3).join("\n      ")}`
          : "",
    );
  } finally {
    remove(fixture);
  }
}

{
  const { code, output } = depcruise(["apps", "services", "packages", "tooling"]);
  report(code === 0, "the repo as it stands has no forbidden edges or cycles", output.trim());
}

// ---------------------------------------------------------------------------
// 4. ESLint — spoiler-safety rules
// ---------------------------------------------------------------------------
console.log("\nMechanism 4 — spoiler-safety lint rules (role branching)");

// Every scope, because the bug this exists to catch was scope-shaped: the rule worked
// perfectly in services/api the entire time it was dead in the view layer, so a check
// that sampled one location would have reported green.
for (const scope of ROLE_SCOPES) {
  for (const form of ROLE_BRANCH_FORMS) {
    const fixture: Fixture = {
      label: `${form.label} — rejected in ${scope.label}`,
      path: `${scope.dir}/__role_check__${form.suffix}${scope.ext}`,
      source: form.source(scope.ext.endsWith(".tsx")),
      expect: "Do not compare roles directly",
    };
    write(fixture);
    try {
      const { code, output } = lint([fixture.path]);
      const rejected = code !== 0;
      const rightReason = output.includes(fixture.expect);
      report(
        rejected && rightReason,
        fixture.label,
        !rejected
          ? "ESLint exited 0 — the role ban is not configured in this scope"
          : !rightReason
            ? `rejected, but not by the role ban:\n      ${output.trim().split("\n").slice(0, 4).join("\n      ")}`
            : "",
      );
    } finally {
      remove(fixture);
    }
  }
}

{
  // The 'use client' ban must survive alongside the role selectors — the two policies
  // share one rule name, which is exactly how they clobbered each other before.
  const fixture: Fixture = {
    label: "'use client' is still rejected in a Server Component",
    path: "apps/web/src/app/__use_client_check__.tsx",
    source: `"use client";\nexport function Probe() {\n  return null;\n}\n`,
    expect: "Adding 'use client'",
  };
  write(fixture);
  try {
    const { code, output } = lint([fixture.path]);
    report(
      code !== 0 && output.includes(fixture.expect),
      fixture.label,
      code === 0 ? "ESLint exited 0 — the 'use client' ban did not fire" : output.trim(),
    );
  } finally {
    remove(fixture);
  }
}

// ---------------------------------------------------------------------------
// Positive controls
// ---------------------------------------------------------------------------
console.log("\nPositive controls — legal code must still pass");

write(LEGAL);
try {
  const { code, output } = lint([LEGAL.path]);
  report(code === 0, LEGAL.label, output.trim());
} finally {
  remove(LEGAL);
}

for (const fixture of ROLE_LEGAL) {
  write(fixture);
  try {
    const { code, output } = lint([fixture.path]);
    report(code === 0, fixture.label, output.trim());
  } finally {
    remove(fixture);
  }
}

// ---------------------------------------------------------------------------

if (failures > 0) {
  console.error(
    `\n[31m${failures} boundary check(s) failed.[0m The isolation guarantees in PLAN.md §3 are not holding.\n`,
  );
  process.exit(1);
}

console.log("\n[32mAll boundary mechanisms are enforcing.[0m\n");
