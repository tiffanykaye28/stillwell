# Verification

## Requirements polish, 21 October 2026

- Sixteen Python tests passed, including report authorization and ensuring staff
  report queries never read private moods or assessment answers.
- Browser checks passed for emoji mood choices, local recommendations, explicit
  urgent-support choice, three selectable reflection categories, saved question
  snapshots, multiple-template creation/edit/deletion, resource links, report
  downloads, general-topic-only chat, and nine routes at 1440px/390px.
- Live Supabase tests created four temporary QA accounts and verified password
  login, mood persistence, cross-user/counselor/admin privacy boundaries,
  rejection of student role escalation, server recalculation of assessment
  scores, question snapshots after template deletion, counselor confirmation and
  completion, student visibility of status changes, resource create/edit/read,
  and administrator role assignment. Temporary accounts and test records were
  removed in the script's finally block. Existing user records were not edited.
- Live browser checks verified the designated account's admin role, exact-count
  reports, assessment templates, operator/privacy/retention text, Philippines
  support directory, and a real Gemini general-topic response (1,041 characters).
- Three missing reflection templates were added without replacing existing
  content. No schema migration was needed; the existing PostgreSQL tables and
  RLS policies support the added functionality.
- Personal AI chat stays off at the user's request. School phone/office hours
  are explicitly unconfirmed; no contact details or staffing claims were invented.
- Email delivery/confirmation/password-reset inbox behavior was not tested with
  a real recipient. Live QA accounts were created with the trusted Auth admin API.
- Reproducible browser polish checks: `node tests/polish-flows.cjs`.
  Live database checks: `scripts/verify-live.mjs`, for a trusted server environment
  only, using temporary records. Normal deployments do not run setup/test scripts.

## Private counseling dashboard, 21 October 2026

- Thirteen backend unit tests pass, including staff-role enforcement, wrong
  credentials, malformed input, rate-limit propagation, and session-only output.
- Desktop and phone browser checks passed with simulated auth/database transport:
  username sign-in, denied login, request filters, confirm/complete/cancel, refresh,
  session restoration, and student-role UI denial.
- Live browser verification passed: wrong password rejected; requested staff
  credentials accepted; persisted counselor role confirmed; dashboard loaded;
  refresh/reload and logout succeeded; 390px viewport had no horizontal overflow.
  Private mood/reflection lists were empty for the new staff account.
- Live appointment records were not modified. Status transitions were tested
  against simulated transport; existing database authorization remains unchanged.
- The account was provisioned through a trusted build step using server secrets.
  The temporary bootstrap variable and build command were removed afterward.

## Interactive resource library, 20 October 2026

- All six built-in resources now open interactive activities or a curated link
  directory. Custom resources retain their text/links and gain a downloadable
  takeaway worksheet.
- Playwright/Edge checks passed for breathing start/pause/resume/reset/completion
  and close cleanup; study-duration selection, focus completion, and break
  completion; grounding back/next/skip/restart; message creation, clipboard,
  downloads, and counseling navigation; rest plans and completion; directory
  targets; and escaped custom content.
- Tests use a controlled browser clock to exercise timer completion without
  waiting through real study sessions. Clipboard transport is mocked; download
  events are real browser events. No messages are sent to other people.
- Each built-in activity was checked at 1440px and 390px widths with no horizontal
  overflow. Phone rest-plan screenshot reviewed. JavaScript syntax checks pass.
- Run with `npm.cmd install --prefix .vercel/qa --no-package-lock --no-audit --no-fund playwright`
  then `node tests/resource-activities.cjs` (requires installed Microsoft Edge).
- Activity data is ephemeral; explicit downloads create local text files.
  No database schema, account records, or AI provider configuration was changed.

## Lumi conversation update, 20 October 2026

- Seven Python unit tests pass, covering provider errors, model normalization,
  chat context validation, personal-chat gating, and exclusion of extra personal
  content from free-mode topic requests.
- Frontend JavaScript syntax checks pass.
- Playwright with Edge passed consent, typed send, follow-up history, failed-send
  draft retention, clearing while a request is pending, refresh clearing, and
  free-mode topic payload checks using simulated HTTP responses.
- Desktop (1440px) and phone (390px) checks found no horizontal overflow; phone
  screenshot reviewed.
- Prompt now requests fuller conversational replies. Gemini 3 Flash uses minimal
  thinking and a 2,048-token output budget instead of 500 shared output tokens.
- Personal chat remains disabled for the user's confirmed unpaid Gemini setup.
  Real provider response quality and authenticated production chat have not been
  verified in these tests.

Updated 20 October 2026:

- Node syntax checks passed for the frontend JavaScript.
- The former Supabase-hosted support endpoint and local server have been replaced with the Vercel Python Function in `api/index.py`.
- The Vercel Python handler could not be run in this environment because no Python runtime or Vercel CLI is installed. Vercel deployment and live server-to-Supabase/Gemini requests remain unverified.
- The configured Supabase Auth endpoints responded, but the REST API requires a server-side secret key. Set `SUPABASE_SECRET_KEY` as a private Vercel environment variable; never expose it in the browser.
- Gemini credentials must be configured as private Vercel environment variables; the Supabase migration stores usage counts only. A key shared in chat should be revoked and replaced before deployment.

Executed 19 October 2026:

- Node syntax check for frontend JavaScript.
- jsdom interaction checks: 11 routes, mood saving, reflection scoring, counseling request and counselor confirmation, resource create/edit, and topic chat passed.
- PostgreSQL migration executed successfully in PGlite with a mocked Supabase auth schema.
- Database behavior checks passed: signup role locked to student despite metadata; cross-user private-record reads and writes blocked; direct role escalation blocked; counselors cannot read private moods; reflection score recalculated server-side; appointment status authorization enforced; quota blocks request 21; administrator role RPC works.

These checks are not live Supabase integration tests. No user project or provider keys were configured. Browser visual QA was unavailable; responsive CSS and markup were reviewed, but actual device rendering remains unverified. SMTP, real Auth redirects, API quotas, provider responses and institution staffing must be verified during setup.
