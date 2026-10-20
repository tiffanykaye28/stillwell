# Stillwell — frontend to backend setup

A responsive HTML/CSS/JavaScript website with Python serverless API routes, deployed together on Vercel. Supabase provides authentication and PostgreSQL. Gemini support and database requests run through the Vercel Python Function; server secrets never reach browser code.

## What works now

The application includes registration, email confirmation, login, refresh tokens, password reset, profiles, RLS-protected records, server-scored reflections, role administration, account deletion, and optional server-side Gemini requests. Live use requires the Supabase schema and Vercel environment variables below. This project does not represent an actual institution or verified counseling service.

## 1. Run the website locally

1. Install Python 3.12 or newer and the Vercel CLI. This project uses only the Python standard library; it has no third-party Python packages.
2. Link this folder to your Vercel project with `vercel link`. Copy `.env.example` to `.env.local`, then set the private values described in the Vercel deployment section below.
3. Run `vercel dev` and open the local URL it prints. This runs both the static site and the Python Function locally. Do not use `python -m http.server`; it cannot serve the API routes.
4. Vercel deploys the contents of `dist/` as the website and `api/index.py` as a serverless function. Supabase Auth remains hosted by Supabase; authenticated database requests and the optional Gemini support call use the Vercel API.

## 2. Start Supabase

1. Open the Supabase project whose URL is configured in the site. The supplied migration is intended only for a new, empty project dedicated to Stillwell. Do not run it against an existing application or a project containing data before reviewing the SQL and making a backup.
2. For a new, empty project, open SQL Editor and run `supabase/migrations/202610190001_initial.sql` once. It runs inside a transaction.
3. In Authentication, enable Email provider and email confirmation. Set the Site URL to your deployed website origin and allow that same origin as a redirect URL. Configure SMTP for real users; Supabase default email delivery is restricted and is not a production mail service. Use an appropriate minimum password length (the UI uses 12).
4. The project URL and public **publishable key** are already set in `dist/config.js` for Supabase Auth:

```js
window.STILLWELL_CONFIG = {
  supabaseUrl: "https://zwltlwggnvyempxrkdhp.supabase.co",
  publishableKey: "YOUR_PUBLISHABLE_KEY",
};
```

These two values are public by design. RLS protects records. Never put the Gemini key, database password, Supabase secret API key, or service-role key in this file. Add your Vercel production URL and any preview URL patterns to Supabase Auth's Site URL/redirect allowlist.

5. Register a test adult account. Check its email, confirm it, then sign in. All new users become students; submitted metadata cannot create staff roles. The API trigger also requires adult-confirmed registration metadata.
6. With your trusted SQL Editor, make the first administrator (replace the email):

```sql
update public.profiles p
set role = 'admin'
from auth.users u
where p.id = u.id and u.email = 'YOUR_ADMIN_EMAIL';
```

Sign out/in or refresh the app. Go to My profile → Administration appears in navigation. Admins can change other users to counselors. Users cannot change their own roles. Do not give students direct access to your Supabase dashboard.

## 3. PostgreSQL tables and access

| Table                       | Primary and foreign keys                                      | Purpose                                              | Application access                                                   |
| --------------------------- | ------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------- |
| `auth.users`                | `id` PK                                                       | Supabase-managed email, hashed credentials, sessions | Supabase Auth only                                                   |
| `public.profiles`           | `id` PK/FK → auth.users                                       | Display name, role, policy acceptance                | Own profile; admin profile directory; users update display name only |
| `public.mood_entries`       | `id` PK; `user_id` FK → profiles; UNIQUE(user_id, entry_date) | Daily mood, intensity, private note                  | Owner only, including deletion                                       |
| `public.assessments`        | `id` PK                                                       | Custom nonclinical reflection questions              | Signed-in read; admin write                                          |
| `public.assessment_results` | `id` PK; `user_id` FK; `assessment_id` FK                     | Answers, question snapshot, server-calculated total  | Owner read/insert/delete                                             |
| `public.appointments`       | `id` PK; `user_id` FK → profiles                              | Requested time, category, mode, status, consent      | Owner and authorized counselors/admins; restricted status RPC        |
| `public.resources`          | `id` PK                                                       | Educational resources                                | Signed-in read; counselor/admin manage                               |
| `private.ai_usage`          | PK(user_id, usage_date); FK → profiles                        | Atomic daily AI request count, no content            | Restricted quota function only                                       |

All exposed tables have RLS. Private notes are not available to counselors/admins through the application. Privileged database operators remain able to read the database; this is not end-to-end encryption. Every personal FK cascades on account deletion. Assessment results retain a question snapshot so later template edits cannot rewrite historical answers.

RPCs: `set_appointment_status`, `admin_set_role`, `consume_ai_quota`. They use explicit caller authorization, fixed search paths and restricted EXECUTE grants. They intentionally use limited SECURITY DEFINER access for privileged operations. Public/anon execution is revoked. The role helper and auth/score triggers are in a non-exposed private schema.

## 4. Get a free Gemini API key

1. Open https://aistudio.google.com/apikey and sign in with an eligible adult account.
2. Create/select a Google Cloud project and create an API key. Availability depends on region and account. Keep it private; do not paste it into chat, Git, SQL, or frontend code. If a key has already been shared in chat, revoke it and generate a replacement before use.
3. Review https://ai.google.dev/gemini-api/docs/pricing and select a text model that currently has free-tier availability for your account. Copy its exact model identifier into `GEMINI_MODEL`. The model name is deliberately not hardcoded because availability and quotas change.
4. Check your project's rate limits in AI Studio. A free key does not mean unlimited requests. Per-minute and daily caps vary; exhausted quotas return 429. The app also enforces 20 authenticated requests per user per database day. Failed provider requests still consume an app request to deter repeated retries.
5. Google’s free/unpaid terms say not to submit sensitive, confidential or personal information. Therefore this implementation accepts only four predefined general wellness topics at the server boundary. It never forwards browser-supplied free text, mood notes, identity, assessment answers or appointments. A checkbox alone does not make sensitive free-tier processing appropriate.

The API terms currently restrict API clients directed toward or likely to be accessed by under-18 users and prohibit clinical practice/medical advice. This adult prototype uses nonclinical educational support. Do not launch it school-wide for minors merely by adding a checkbox. Review target audience and provider eligibility before deployment.

### Personal emotional conversations

Update (20 October 2026): the message composer and bounded conversation endpoint
are now implemented, but disabled by default. Keep
`LUMI_PERSONAL_CHAT_ENABLED=false` for the current unpaid Gemini project.
Once a suitable paid-service project and privacy disclosures are in place, set
this server-only variable to `true` and redeploy. The browser reads the capability
from `/api?kind=ai-config`; the server independently rejects personal chat while
disabled. No key or provider credential is exposed by that endpoint.

Enabled chat accepts at most 2,000 characters per message and six recent exchanges.
It sends only those messages, not saved records or profile details. Conversation
text stays in page memory, clears on reload/logout, and is not stored in the app
database. Google has its own retention practices. Authentication, consent, and
the existing daily quota remain required. Local preview responses are examples.
The earlier paragraph below describes the rationale for the default free mode;
the formerly deferred endpoint is now implemented behind this switch.

This package deliberately does not enable free-text emotional disclosure to the free API. For a future personal-chat release, choose an appropriate paid-service arrangement or another suitable provider, obtain institutional privacy/security review, establish age eligibility, define consent and retention, implement safeguarding and human escalation procedures, then add a separately reviewed free-text endpoint. Paid service alone is not clinical validation. The existing mood and counseling features do not require Gemini.

## 5. Deploy to Vercel

The repository includes `vercel.json` with `dist/` as the static output directory and `api/index.py` as a Python serverless function. It uses Vercel's Python runtime and standard library; no third-party Python packages are required.

In Vercel Project Settings → Environment Variables, add the required server-only variables for Preview and Production. Enter secret values directly in the Vercel dashboard; do not send them through chat, SQL, or source files:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (required only for account deletion)
- `GEMINI_API_KEY` (optional; add a newly generated key only)
- `GEMINI_MODEL` (optional; use an exact, currently available Gemini model ID)

`SUPABASE_SECRET_KEY` is the private Supabase API secret used by the database proxy. `SUPABASE_SERVICE_ROLE_KEY` is used only for authenticated account deletion. The browser continues to use the public publishable key for Supabase Auth. Never put server credentials in `dist/config.js`, commit them, or return them from an API.

For local Vercel development, copy `.env.example` to `.env.local`, fill it with server credentials locally, and run `vercel dev`. `.env.local` is ignored by Git. You can also link with `vercel link` and pull configured values using `vercel env pull .env.local`. Redeploy after changing Vercel variables; use `vercel --prod` to deploy production after testing.

The `/api` Python Function validates every Supabase user token, restricts database paths to the application's tables and RPCs, and forwards the user's bearer token so database row-level security still applies. The support action only forwards one of four predefined general wellbeing topics to Gemini; it never forwards arbitrary chat text or personal records. If Gemini is not configured, normal non-AI site features continue to work.

Set these Vercel environment variables:

| Secret                      | Value                                                                      |
| --------------------------- | -------------------------------------------------------------------------- |
| `SUPABASE_URL`              | Supabase project URL (already used by the browser config)                  |
| `SUPABASE_SECRET_KEY`       | Private Supabase API secret key, for server-side PostgREST/Auth validation |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy service-role JWT for deleting the authenticated user's account      |
| `GEMINI_API_KEY`            | Optional, server-only Google AI Studio key                                 |
| `GEMINI_MODEL`              | Optional exact, currently available model ID                               |

Gemini API keys are not database settings. The Supabase migration creates `private.ai_usage` for per-user daily request counts only; it intentionally stores no API credentials or prompts. Do not add a Gemini key to SQL, Supabase tables, or SQL migrations.

## Private counseling staff sign-in

Open `/#staff` for the private staff form. It accepts a username and password,
with no public staff registration. `STAFF_LOGIN_USERNAME` and `STAFF_LOGIN_EMAIL`
map the username to its Supabase Auth account on the server. Supabase verifies
the password, and the server checks the persisted profile role before returning
the user's ordinary session. Passwords and service keys are not in browser code.

The designated operator account now has the `admin` role for account-role,
assessment, resource, and system-report management. Separate staff accounts can
be assigned the `counselor` role, which manages appointment requests and resources
without site-wide role administration. Neither role can read students' private
moods or reflections through the app. The dashboard supports active/all/status
filters, manual refresh, confirmation, completion, and cancellation. Database
permissions remain the authority; knowing the staff URL does not grant access.

`scripts/provision-staff.mjs` is a trusted, one-time provisioning utility, not a
public API. It requires the service-role key and temporary
`STAFF_BOOTSTRAP_PASSWORD` in its execution environment. It creates a marked Auth
account and verifies its counselor profile, refuses to take over an unrelated
existing account, and never resets an existing password. Remove the temporary
password after provisioning and redeploy without it. Normal builds do not run
the utility. No account password should be committed.

## 6. End-to-end flows

### Polished features and public configuration

- The homepage recommends guided resources using the user's own latest mood and
  reflection in browser memory. No personal records are forwarded to Gemini.
- Students select a reflection template; PostgreSQL recalculates its score and
  stores a question snapshot. Administrators can create, edit, and delete multiple
  templates. These are non-diagnostic custom reflections, not clinical screeners.
- `/api?kind=reports` checks the authenticated profile role and returns exact
  aggregate service counts. It uses the user's token and never queries private
  moods or assessment answers. Follow-up indicators mean requests pending more
  than 48 hours, not a clinical risk score.
- Public pages are available at `/#help`, `/#privacy`, and `/#terms`.
- `/api?kind=public-config` exposes only the explicitly public operator/contact
  fields listed in `.env.example`. Set these in Vercel and redeploy when verified
  school contact details or retention practices change.
- Retention text describes current behavior: records remain until individual
  deletion, account deletion, or an operator-handled request. There is no automatic
  age-based purge. Do not promise a scheduled purge until one is implemented.
- School office hours and telephone details are not supplied. The app uses its
  appointment workflow and identifies that limitation. Philippines crisis contact
  details were retrieved from the connected helpline directory on 21 October 2026.
- Educational materials link to WHO and NHS, including video and audio guides.
- The free Gemini mode is intentionally topic-only, as requested. There is no
  inactive message box suggesting personal chat is available.

- Registration → policy/adult confirmation → email confirmation → login → Auth session → Vercel Python Function validates the user token → profile and personal data loaded through RLS.
- Mood → choose reaction/intensity/note → upsert one record per local date → history/chart → delete.
- Reflection → answer all questions → insert → database validates answers and computes score/snapshots questions → personal result. It is not a validated screening instrument and has no clinical thresholds.
- Counseling → select a future time and category → explicitly agree to share → pending request → counselor confirms/completes → student sees updated status on refresh. No email notification is promised. Counselor availability and live service staffing must be arranged by the institution.
- AI → explicit adult/topic-processing disclosure → authenticated Vercel Python Function → atomic quota → generic topic only → Gemini response → transient chat. No chat messages are persisted.
- Admin → protected role RPC → database role updated → resources/template managed. System counts show account/content totals, without exposing private emotional data.
- Password reset → email recovery link → session established from callback fragment → choose new password.
- Delete account → explicit confirmation → revoke refresh sessions → delete authenticated user through the admin Auth endpoint → FK cascades remove personal records. Existing access JWTs may remain cryptographically valid until expiry, but deleted profiles/records prevent access and the API verifies the account each time.

## 7. Verification checklist

Before accepting real data, run in a test project:

- Create students A/B, counselor C and admin D. Verify A cannot read, update or delete B's mood/results by calling REST directly, not only hiding buttons.
- Attempt to set role via signup metadata and PATCH profiles: it must fail or stay student. A cannot call admin role RPC.
- Counselor C must see appointment requests but no other users' mood notes or assessment results. Check both SELECT and mutation attempts.
- A can cancel their own pending request but cannot confirm it or change another user's request. Closed requests cannot be reopened through the status RPC.
- Edit a reflection template and verify historical question snapshots remain unchanged. Send forged score values and verify the database recalculates them.
- Call `/api?kind=support` without a token, with an expired/invalid token, and from a different origin. It must reject. Send free text: the API must ignore it and forward only a valid predefined topic.
- Send 21 topic requests in a day: the 21st must be blocked by app quota. Simulate Gemini 429, missing secrets and timeout; no false successful AI response should appear.
- Exercise email confirmation, recovery, refresh, sign-out, deletion, profile export and per-record deletion.
- Test 360px/768px/1440px layout, keyboard navigation, readable contrast and screen reader labels. Runtime browser QA was unavailable in the build environment; complete this before launch.
- Run Supabase Security Advisors and review any findings, especially grants and SECURITY DEFINER functions.

The migration can be checked for RLS activation with:

```sql
select tablename, rowsecurity from pg_tables where schemaname='public';
select routine_schema,routine_name,grantee,privilege_type
from information_schema.routine_privileges
where routine_name in ('admin_set_role','set_appointment_status','consume_ai_quota');
```

## 8. Institutional launch requirements

The Privacy Policy and Terms pages are development drafts with truthful limitations. Fill in the institution's legal identity, privacy contact, jurisdiction, retention schedule, actual counselor response hours and verified support resources. Have the institution review them. Configure backup retention, least-privilege staff access, operational audit logging without private message content, SMTP, abuse protections/CAPTCHA, provider billing limits and incident response. Never claim guaranteed crisis detection or automatic emergency intervention. The app offers an always-available urgent-support page; it does not send alerts or monitor students. A limited browser-only phrase check can show an urgent-support message after a private mood note is saved. It can miss concerns and produce false positives; no phrase detection is a clinical evaluation.

The supplied reflection is nonclinical. If a validated mental-health screening tool is required, verify its license, exact wording, scoring, applicable population, interpretation and professional oversight before adding it. No invented clinical cutoff is included.

## Sources checked 19 October 2026

- Vercel Python Functions: https://vercel.com/docs/functions/runtimes/python
- Gemini terms: https://ai.google.dev/gemini-api/terms
- Gemini quickstart: https://ai.google.dev/gemini-api/docs/quickstart
- Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Auth user validation: https://supabase.com/docs/reference/javascript/auth-getuser
- Supabase changelog: https://supabase.com/changelog.md (modern TLS required after announced cipher retirement; browser fetch uses platform TLS)
