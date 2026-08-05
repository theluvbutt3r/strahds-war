import { DEFAULT_VISIBILITY, ROLES } from "@sw/schemas";

/**
 * Phase 0 placeholder. Its one job is to prove the wiring end to end: a Server Component
 * importing a workspace package, rendered without a build step in between.
 *
 * Phase 3 replaces this with the real wiki (docs/PLAN.md §9).
 */
export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeContent: "center",
        gap: "1.5rem",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ margin: 0, fontSize: "clamp(2rem, 6vw, 3.5rem)", letterSpacing: "0.08em" }}>
        STRAHD&rsquo;S WAR
      </h1>
      <p style={{ color: "var(--mist)", margin: 0, maxWidth: "44ch", lineHeight: 1.6 }}>
        The mists have not yet parted. Phase 0 &mdash; foundation only.
      </p>
      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "auto auto",
          gap: "0.35rem 1.25rem",
          margin: 0,
          fontSize: "0.875rem",
          color: "var(--mist)",
          justifyContent: "center",
        }}
      >
        <dt>Roles defined</dt>
        <dd style={{ margin: 0, color: "var(--bone)" }}>{ROLES.length}</dd>
        <dt>Default visibility</dt>
        <dd style={{ margin: 0, color: "var(--gold)" }}>{DEFAULT_VISIBILITY}</dd>
      </dl>
    </main>
  );
}
