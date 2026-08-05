/**
 * @sw/authz — what an actor may do. Deliberately separate from who they are.
 *
 * Better Auth answers identity. This package answers capability, and it does so as pure
 * functions over plain data: no database access, no network, no framework imports. A
 * lint rule enforces that (see tooling/eslint-config/boundaries.js), because the value
 * of this package is that the entire permission matrix can be asserted in a table-driven
 * test — and an I/O call anywhere in here ends that property.
 *
 * Both the API and the UI import `can()`. Only the API's use is real enforcement; the
 * UI's use decides whether to render an Edit button. That distinction matters enough to
 * repeat at every call site, because it is exactly the thing a future reader gets wrong.
 */

export * from "./types";
export * from "./can";
