import { serve } from "@hono/node-server";
import { createDb } from "@sw/db";

import { createApp } from "./app";
import { createAuth } from "./auth";
import { loadConfig } from "./env";

/**
 * Process entry point. All routing lives in app.ts so tests can drive it without binding
 * a port; this file owns only the things that are true of a running process.
 *
 * The order here is the point: configuration is validated, then the database connects,
 * then auth is constructed from both, then the app is assembled from the result. Every
 * dependency is passed in rather than reached for, which is what lets app.ts be tested
 * without any of them.
 */

const config = loadConfig();
const { db } = createDb({ connectionString: config.databaseUrl });
const auth = createAuth(db, config);

const app = createApp({
  authHandler: (request) => auth.handler(request),
  getSession: async (headers) => auth.api.getSession({ headers }),
  webOrigin: config.webOrigin,
  exposeOpenApiDoc: config.nodeEnv !== "production",
});

const port = config.port;

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.info(`sw-api listening on http://127.0.0.1:${info.port}`);
});

/**
 * Drain in-flight requests before exiting.
 *
 * Fly.io and Railway both stop a container by sending SIGTERM and then killing it after a
 * grace period. Without a handler the process dies immediately and every request in
 * flight becomes a connection reset for whoever was mid-read — on every single deploy.
 * It is invisible in development, because nothing ever sends SIGTERM there.
 *
 * The forced-exit timer matters as much as the handler: a `server.close()` that never
 * completes (a hung keep-alive connection is enough) would otherwise hold the process
 * open until the platform kills it, converting a clean shutdown into a slower dirty one.
 */
const SHUTDOWN_GRACE_MS = 10_000;

let shuttingDown = false;

function shutdown(signal: NodeJS.Signals): void {
  // Platforms sometimes send SIGTERM more than once; a second close() would throw.
  if (shuttingDown) return;
  shuttingDown = true;

  console.info(`${signal} received — draining connections`);

  const forceExit = setTimeout(() => {
    console.error(`did not drain within ${SHUTDOWN_GRACE_MS}ms — exiting anyway`);
    process.exit(1);
  }, SHUTDOWN_GRACE_MS);

  // Do not hold the event loop open on account of the timer itself.
  forceExit.unref();

  server.close((err) => {
    clearTimeout(forceExit);
    if (err) {
      console.error("error while closing server", err);
      process.exit(1);
    }
    console.info("drained cleanly");
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
