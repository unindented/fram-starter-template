/**
 * A Bunny Edge Scripting middleware that protects a pull zone with HTTP Basic Auth.
 *
 * The `AUTH_USERS` secret holds `user:password` pairs separated by `;`. The username must not
 * contain `:`, and both parts must be ASCII, because `btoa` only encodes Latin-1.
 *
 * The pull zone must have "Run script before cache" on, or cached files skip the check.
 */

import * as BunnySDK from "@bunny.net/edgescript-sdk@0.13.0";

const realm = "Photos & Videos";
const allowed = new Set(
  (process.env.AUTH_USERS ?? "")
    .split(";")
    .map((line) => line.trim())
    .filter((line) => line.includes(":"))
    .map((pair) => `Basic ${btoa(pair)}`),
);

BunnySDK.net.http.servePullZone().onClientRequest((ctx) => {
  // Let ACME HTTP-01 challenges through so the TLS certificate can be issued and renewed.
  const { pathname } = new URL(ctx.request.url);
  if (
    pathname.startsWith("/.well-known/acme-challenge/") ||
    allowed.has(ctx.request.headers.get("Authorization") ?? "")
  ) {
    return Promise.resolve(ctx.request);
  }
  return Promise.resolve(
    new Response("Authentication required", {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
        "WWW-Authenticate": `Basic realm="${realm}", charset="UTF-8"`,
      },
    }),
  );
});
