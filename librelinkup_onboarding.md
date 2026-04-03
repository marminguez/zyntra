# LibreLinkUp onboarding flow (official follower/share model)

## Summary
Zyntra now models Libre onboarding as an official Connected Apps / Follower flow:
1. User sends invite from Libre app with exact email.
2. User accepts invitation in LibreLinkUp with same email.
3. Zyntra verifies connection only through already-available, authorized data in Zyntra's own integration layer.

## State machine
- `NOT_STARTED`
- `INVITE_SENT`
- `WAITING_FOR_LIBRELINKUP_ACCEPTANCE`
- `SHARE_ACCEPTED_NO_DATA_YET`
- `WAITING_FOR_DATA` (hackathon-safe fallback state)
- `SYNC_ACTIVE`
- `SYNC_ERROR`
- `EMAIL_MISMATCH`
- `NETWORK_OR_UPLOAD_DELAY`

## Security and compliance constraints
- No credential scraping.
- No WebView login automation.
- No reverse-engineered/private Abbott endpoints.
- No password/token logging.

## What “Check connection” does
- Reads onboarding state from `LibreConnection`.
- Checks for glucose records already ingested in Zyntra (`Signal` source/type).
- Updates status + diagnostics.

If data is not available yet, onboarding can continue in `WAITING_FOR_DATA` and the app can still run demo/sample behavior.

## Known limitations
- Without an official live Libre provider fully wired into Zyntra, verifier can only confirm based on data already present in Zyntra.
- Region mismatch is exposed as warning metadata when timezone values differ.
