// Run only in a trusted server environment. No password belongs in source.
const env = process.env;
if (!env.STAFF_BOOTSTRAP_PASSWORD) {
  console.log("No staff provisioning requested.");
  process.exit(0);
}
const project = (env.SUPABASE_URL || "").trim().replace(/\/$/, "");
const email = (env.STAFF_LOGIN_EMAIL || "").trim();
const username = (env.STAFF_LOGIN_USERNAME || "").trim();
const serviceKey = (env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(project) || !email || !username || !serviceKey) {
  throw new Error("Staff provisioning configuration is incomplete.");
}
const headers = {apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json"};
async function call(path, options = {}) {
  const response = await fetch(project + path, {...options, headers: {...headers, ...options.headers}, signal: AbortSignal.timeout(20000)});
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Staff provisioning request failed: HTTP ${response.status} at ${path.split("?")[0]}`);
  return data;
}
let user = null;
for (let page = 1; page <= 100; page++) {
  const data = await call(`/auth/v1/admin/users?page=${page}&per_page=100`);
  user = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (user || data.users.length < 100) break;
  if (page === 100) throw new Error("User lookup limit reached; no changes made.");
}
if (user && user.app_metadata?.stillwell_staff_username !== username) {
  throw new Error("Existing account does not match provisioning marker; no changes made.");
}
if (!user) {
  user = await call("/auth/v1/admin/users", {
    method: "POST", body: JSON.stringify({
      email, password: env.STAFF_BOOTSTRAP_PASSWORD.trim(), email_confirm: true,
      app_metadata: {stillwell_staff_username: username},
      user_metadata: {display_name: "Counseling Admin", adult_confirmed: true, policy_version: "1"},
    }),
  });
}
const rows = await call(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=id,role`, {
  method: "PATCH", headers: {Prefer: "return=representation"},
  body: JSON.stringify({role: "counselor"}),
});
if (rows.length !== 1 || rows[0].role !== "counselor") throw new Error("Staff role verification failed.");
console.log("Counseling staff account provisioned and role verified. Existing passwords were not reset.");
