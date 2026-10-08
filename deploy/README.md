# Password protection on bunny.net

`bunny-auth.ts` is an [Edge Scripting](https://bunny.net/docs/edge-scripting-overview) middleware that asks for a username and password (using [basic authentication](https://developer.mozilla.org/docs/Web/HTTP/Guides/Authentication#basic_authentication_scheme)) before it serves any file of the gallery.

## Setup

1. In *Edge Platform > Scripting*, create a middleware script, and paste `bunny-auth.ts` in it.
2. In the script's *Env Configuration > Environment Secrets*, add `AUTH_USERS` with `user:password` pairs separated by `;`:

```
alice:correct-horse;bob:battery-staple
```

3. Link the script to the pull zone of the gallery.
4. In the pull zone's *General > Origin*, turn on **Run script before cache**. Without it, the script only runs on cache misses, and cached files load without a password.
5. Publish the script.

## Checks

1. Load the gallery once, so that its files are in the cache.
2. In a private window, open the gallery, and then a direct image URL. Both must ask for a password, and reject a wrong one.
3. Open `https://<your-host>/.well-known/acme-challenge/test`. It must return a 404 without asking for a password, so that the TLS certificate can renew.

## Notes

- To add or remove a user, edit the `AUTH_USERS` secret. Give each user their own password, so that removing one user doesn't lock out the others.
- Use ASCII only in usernames and passwords. The username must not contain `:`.
- Make sure that no other pull zone serves the same storage zone, because it would skip the check.
- The script lets requests to `/.well-known/acme-challenge/` through without a password, so that Let's Encrypt can check the domain. Don't store other files under that path.
- Basic auth has no logout. The browser keeps the credentials until it closes.
