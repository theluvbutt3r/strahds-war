"use client";

import { Button } from "@sw/ui";
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
    <div className="grid gap-3">
      {discordEnabled ? (
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => {
            start("discord");
          }}
          disabled={pending !== null}
        >
          {pending === "discord" ? "Opening Discord…" : "Sign in with Discord"}
        </Button>
      ) : null}

      {googleEnabled ? (
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => {
            start("google");
          }}
          disabled={pending !== null}
        >
          {pending === "google" ? "Opening Google…" : "Sign in with Google"}
        </Button>
      ) : null}

      {!discordEnabled && !googleEnabled ? (
        <p className="text-text-muted text-sm">
          No sign-in provider is configured. Set the Discord or Google credentials in the
          API&rsquo;s environment — see <code className="font-mono text-xs">.env.example</code>.
        </p>
      ) : null}

      {error ? (
        // `role="alert"` so a screen reader announces the failure without the user having
        // to go looking for it. The visual crimson is `text-accent` (emberLit), which is
        // the readable crimson — `ember` at this size would be 3.3:1.
        <p role="alert" className="text-text-accent text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void signOut().finally(() => {
          window.location.reload();
        });
      }}
    >
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
