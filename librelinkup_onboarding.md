# LibreLinkUp onboarding flow

## Summary
Zyntra supports two practical paths:
1. Follower/share onboarding (Connected Apps invite + LibreLinkUp acceptance).
2. Direct sync checks when the user logs in to Zyntra with Libre credentials.

## Follower/share state machine
- `NOT_STARTED`
- `INVITE_SENT`
- `WAITING_FOR_LIBRELINKUP_ACCEPTANCE`
- `SHARE_ACCEPTED_NO_DATA_YET`
- `WAITING_FOR_DATA`
- `SYNC_ACTIVE`
- `SYNC_ERROR`
- `EMAIL_MISMATCH`
- `NETWORK_OR_UPLOAD_DELAY`

## Current behavior
- If a freestyle credential token is available, `Check connection` attempts direct LibreLinkUp sync and ingests readings.
- If no credential token is available, Zyntra falls back to the follower/share verifier flow.

## Known limitations
- Direct login/sync depends on LibreLinkUp API behavior and can fail on auth/rate limits.
- Follower/share mode may remain in waiting states until cloud glucose uploads become available.
