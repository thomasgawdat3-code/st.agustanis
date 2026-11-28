# Security Specification (`security_spec.md`)

## 1. Data Invariants
1. `/app_config/main` contains only non-PII fellowship configuration (logo image data URL capped at 220KB, UI copy, colors, shapes, quotes, practices, competition dates). It may be read (`get`) by clients so every participant immediately receives live developer edits, and **only** verified admins (`isAdmin()`) may create/update it.
2. `/participants/{participantId}` stores registered users' names, hashed 4-digit PINs (`pinHash`), and reading/quiz progress. Blanket `list` is **strictly restricted** to `isAdmin()` so regular visitors cannot scrape the list of all registered members.
3. Single-document `get` on `/participants/{participantId}` allows a returning user (who knows their exact normalized triple-name ID and verifies their `pinHash` locally) to resume progress across devices, while `create` and `update` enforce strict schema keys (`hasAll`, `hasOnly`), size bounds, immutable `id`/`createdAt`/`pinHash`, and valid ID regex `^[a-zA-Z0-9_-]+$`.
4. `/participants_summary/{summaryId}` permits `get` only on bounded shard IDs (`shard_00`..`shard_31` and legacy `main`), disables `list`, caps `entries` map size per shard, and excludes `pinHash`.
5. `/admins/{uid}` is readable only by its owner (`request.auth.uid == uid`) or existing admins, and never writable from unprivileged clients.

## 2. Adversarial Payloads ("Dirty Dozen")
1. Unauthenticated write to `/app_config/main` -> `PERMISSION_DENIED`
2. Unverified-email token spoofing admin email writing `/app_config/main` -> `PERMISSION_DENIED`
3. Admin write to `/app_config/main` with ghost field (`isVerified: true`) -> `PERMISSION_DENIED`
4. Admin write to `/app_config/main` with oversized logo (>220KB) -> `PERMISSION_DENIED`
5. Unauthenticated `list` query on `/participants` -> `PERMISSION_DENIED`
6. Participant `create` with invalid ID characters (`../admin`) -> `PERMISSION_DENIED`
7. Participant `create` with 1MB junk string in `fullName` -> `PERMISSION_DENIED`
8. Participant `create` missing `pinHash` -> `PERMISSION_DENIED`
9. Participant `update` attempting to overwrite `pinHash` or `createdAt` -> `PERMISSION_DENIED`
10. Participant `update` injecting ghost field (`isAdmin: true`) -> `PERMISSION_DENIED`
11. Unauthenticated write to `/admins/{uid}` -> `PERMISSION_DENIED`
12. Catch-all read/write on `/other_collection/doc` -> `PERMISSION_DENIED`
