"use client";

import { useState } from "react";

import { signIn, signOut } from "../../../lib/auth-client";

/**
 * The only interactive leaf in the sign-in flow.
 *
 * `"use client"` is confined to this file — the lint rule in
 * tooling/eslint-config/restricted-syntax.js permits it in `*.client.tsx` and nowhere
 * else. That boundary is load-bearing for spoiler safety: Server Components keep DM-tier
 * material out of the browser bundle entirely, so interactivity has to be pushed into
 * small named leaves like this one rather than pulled up into pages.
 *
 * Nothing here reads campaign content. It starts an OAuth redirect and nothing more,
 * which is exactly the amount of work that belongs on the client.
 */

const buttonStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.85rem 1.25rem",
  border: "1px solid var(--gold, #b08d4f)",
  background: "transparent",
  color: "var(--bone, #e8e3d9)",
  font: "inherit",
  letterSpacing: "0.06em",
  cursor: "pointer",
};

export function SignInButtons({
  discordEnabled,
  googleEnabled,
}: {
  readonly discordEnabled: boolean;
  readonly googleEnabled: boolean;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = (provider: "discord" | "google") => {
    setPending(provider);
    setError(null);

    void signIn
      .social({ provider, callbackURL: window.location.origin })
      .catch((cause: unknown) => {
        setPending(null);
        // Deliberately generic. The failure the user can act on is "it didn't work, try
        // again"; the provider's error text is for the server log, not the sign-in page.
        setError("Sign-in could not be started. Please try again.");
        console.error("sign-in failed", cause);
      });
  };

  return (
    <div style={{ display: "grid", gap: "0.75rem", width: "min(22rem, 100%)" }}>
      {discordEnabled ? (
        <button
          type="button"
          style={buttonStyle}
          onClick={() => {
            start("discord");
          }}
          disabled={pending !== null}
        >
          {pending === "discord" ? "Opening Discord…" : "Sign in with Discord"}
        </button>
      ) : null}

      {googleEnabled ? (
        <button
          type="button"
          style={buttonStyle}
          onClick={() => {
            start("google");
          }}
          disabled={pending !== null}
        >
          {pending === "google" ? "Opening Google…" : "Sign in with Google"}
        </button>
      ) : null}

      {!discordEnabled && !googleEnabled ? (
        <p style={{ color: "var(--mist, #6e6a75)", margin: 0, fontSize: "0.875rem" }}>
          No sign-in provider is configured. Set the Discord or Google credentials in the
          API&rsquo;s environment — see <code>.env.example</code>.
        </p>
      ) : null}

      {error ? (
        <p role="alert" style={{ color: "var(--ember, #b33636)", margin: 0, fontSize: "0.875rem" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      style={{ ...buttonStyle, width: "auto", padding: "0.5rem 1rem", fontSize: "0.875rem" }}
      disabled={pending}
      onClick={() => {
        setPending(true);
        void signOut().finally(() => {
          window.location.reload();
        });
      }}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
