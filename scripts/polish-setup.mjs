import { readFile } from "node:fs/promises";
if (process.env.STILLWELL_POLISH_SETUP !== "true") process.exit(0);
const base = process.env.SUPABASE_URL.trim().replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};
async function call(path, options = {}) {
  const r = await fetch(base + path, {
    ...options,
    headers: { ...headers, ...options.headers },
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok)
    throw new Error(`Setup failed: HTTP ${r.status} at ${path.split("?")[0]}`);
  return r.status === 204 ? null : r.json();
}
let user;
for (let page = 1; page <= 100; page++) {
  const data = await call(`/auth/v1/admin/users?page=${page}&per_page=100`);
  user = data.users.find(
    (u) => u.email === process.env.STAFF_LOGIN_EMAIL.trim(),
  );
  if (user || data.users.length < 100) break;
}
if (
  !user ||
  user.app_metadata?.stillwell_staff_username !==
    process.env.STAFF_LOGIN_USERNAME.trim()
)
  throw new Error(
    "Configured staff account marker does not match; no changes made.",
  );
const updated = await call(`/rest/v1/profiles?id=eq.${user.id}&select=role`, {
  method: "PATCH",
  headers: { Prefer: "return=representation" },
  body: JSON.stringify({ role: "admin" }),
});
if (updated.length !== 1 || updated[0].role !== "admin")
  throw new Error("Admin role verification failed.");
const templates = JSON.parse(
  await readFile(new URL("../dist/assessments.json", import.meta.url), "utf8"),
);
let added = 0;
for (const template of templates) {
  const rows = await call(
    "/rest/v1/assessments?select=id&title=eq." +
      encodeURIComponent(template.title),
  );
  if (!rows.length) {
    await call("/rest/v1/assessments", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(template),
    });
    added++;
  }
}
console.log(
  `Existing designated staff account now has admin access. Added ${added} missing assessment templates; existing content preserved.`,
);
