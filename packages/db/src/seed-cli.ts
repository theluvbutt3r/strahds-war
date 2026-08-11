import { main } from "./seed";

/**
 * The seed script's entry point, kept separate from seed.ts so that importing `seed()`
 * in a test does not connect to a database or read `process.env` as a side effect of the
 * import.
 */
main()
  .then((result) => {
    console.info(`Seeded ${result.entities} entities and ${result.links} links.`);
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
