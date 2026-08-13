import { Card, CardContent, CardDescription, CardHeader, CardTitle, OrnamentRule } from "@sw/ui";

import { SignInButtons } from "../components/client/auth-buttons.client";

/**
 * The front door.
 *
 * ADR 0002: there is no anonymous read path. An unauthenticated request reaches this page
 * and nothing else.
 *
 * Which providers to offer is decided here, on the server, from build-time configuration
 * rather than by asking the API — a button for an unconfigured provider leads to an OAuth
 * error page, which reads as a broken site rather than as a missing setting.
 */

const discordEnabled = process.env.NEXT_PUBLIC_DISCORD_ENABLED !== "false";
const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_ENABLED !== "false";

export const metadata = {
  title: "Sign in — Strahd's War",
};

export default function SignInPage() {
  return (
    <main className="grid min-h-dvh place-content-center justify-items-center gap-8 p-8">
      <header className="grid justify-items-center gap-4 text-center">
        <h1 className="font-display tracking-display text-3xl font-bold desktop:text-4xl">
          STRAHD&rsquo;S WAR
        </h1>
        <OrnamentRule className="w-40" />
      </header>

      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle as="h2" className="text-lg">
            The valley keeps its own counsel
          </CardTitle>
          <CardDescription>Sign in to be let through the mists.</CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4">
          <SignInButtons discordEnabled={discordEnabled} googleEnabled={googleEnabled} />

          <p className="text-text-muted text-center text-xs leading-relaxed">
            Signing in with Discord grants the Player role automatically if you are in the campaign
            server. Everything else is granted by hand.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
