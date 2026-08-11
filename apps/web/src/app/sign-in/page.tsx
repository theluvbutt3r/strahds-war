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
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeContent: "center",
        justifyItems: "center",
        gap: "1.75rem",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ margin: 0, fontSize: "clamp(1.75rem, 5vw, 2.75rem)", letterSpacing: "0.08em" }}>
        STRAHD&rsquo;S WAR
      </h1>

      <p style={{ color: "var(--mist)", margin: 0, maxWidth: "38ch", lineHeight: 1.6 }}>
        The valley keeps its own counsel. Sign in to be let through the mists.
      </p>

      <SignInButtons discordEnabled={discordEnabled} googleEnabled={googleEnabled} />

      <p style={{ color: "var(--mist)", margin: 0, maxWidth: "40ch", fontSize: "0.8125rem" }}>
        Signing in with Discord grants the Player role automatically if you are in the campaign
        server. Everything else is granted by hand.
      </p>
    </main>
  );
}
