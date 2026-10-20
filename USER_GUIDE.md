# Stillwell user and administrator guide

## Student flow

1. Create an account, confirm the email, and sign in. The current service is for
   adults aged 18 or older. Email delivery depends on Supabase Auth/SMTP setup.
2. Save a daily mood using the face icons, intensity, and optional private
   note. History and suggestions use your own records.
3. Choose a wellbeing, stress/rest, or worry/calm reflection. Results summarize
   selected answers and are not a diagnosis. Previous answers retain their
   original question snapshot when a template changes.
4. Open a suggested resource: breathing guide, study timer, grounding exercise,
   conversation builder, rest planner, or educational materials.
5. Opt into a general-topic Lumi reply. Only the selected preset topic goes to
   Gemini in the current free mode.
6. Request counseling and agree to share the request details. Check its status
   after staff confirm, complete, or cancel it. No email notification is promised.
7. Use My profile to export records, edit your display name, sign out, or delete
   the account. You can delete individual mood entries and reflection results.

## Counseling and administration

Open `https://stillwell-chi.vercel.app/#staff` and use the provisioned credentials.
The designated operator account has full administration access. Passwords are
verified by Supabase and are not embedded in the website.

- **Counselor workspace:** filter requests, refresh, confirm, complete, or cancel.
  The follow-up indicator identifies requests pending over 48 hours.
- **Resources:** publish/edit/remove educational content. An optional HTTPS link
  can point to an article, video, or audio guide.
- **Administration:** assign student/counselor/admin roles to registered accounts.
  Your own role selector is disabled to prevent accidental loss of access.
- **Assessments:** choose a template to edit, or create another. Questions should
  be positively worded and use the displayed 0–3 frequency scale.
- **Reports:** download aggregate request/account/content counts. Reports do not
  expose private mood notes, answers, or AI conversations.

## Public support and policies

- Urgent help: `https://stillwell-chi.vercel.app/#help`
- Privacy: `https://stillwell-chi.vercel.app/#privacy`
- Terms: `https://stillwell-chi.vercel.app/#terms`

School: St.Cecilia. Operator: John Benedict B. Nacua. Country: Philippines.
Privacy contact: johnbenedictbucao2@gmail.com.

The school must supply verified telephone details and office hours before these
can be published. Appointment availability depends on the actual guidance team.
The urgent-support page is available without signing in. It does not contact
anyone automatically.

## Backend and provider setup

See [SETUP.md](SETUP.md) for Gemini, Supabase, Vercel environment variables,
PostgreSQL tables, RLS rules, account roles, and deployment.

The database schema is in
`supabase/migrations/202610190001_initial.sql`. It includes profiles, mood entries,
assessment templates/results, appointments, resources, and private AI usage
counters. Do not rerun the initial schema on the existing production database.

See [VERIFICATION.md](VERIFICATION.md) for the distinction between live tests,
simulated browser checks, and email-delivery checks that still require an inbox.
