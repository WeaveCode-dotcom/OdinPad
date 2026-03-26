# Daily stats and “today”

## Local calendar

- Client-side writing stats use **local calendar** helpers in `src/lib/user-stats-daily.ts` (`getLocalISODate()`, etc.), so “today” follows the writer’s device timezone.

## RPC `increment_user_daily_words`

- The client passes `p_stat_date` from `getLocalISODate()` so server-side aggregates align with the user’s chosen day in normal conditions.

## Clock skew

- Large device clock errors can make “today” disagree with the real world; NTP is recommended for users who rely on streak accuracy.
- Near **midnight local time**, rapid typing can land updates on either side of the day boundary — this is expected for client-keyed dates.

## Daily quote Edge Function

- Quote idempotency uses user + date semantics implemented in the Edge Function and related tables; if users report wrong calendar days, compare stored `quote_date` with `getLocalISODate()` expectations.
