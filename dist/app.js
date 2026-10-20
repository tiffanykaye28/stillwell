"use strict";
const cfg = window.STILLWELL_CONFIG,
  live = !!(cfg.supabaseUrl && cfg.publishableKey);
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const paths = {
  home: "M3 10 12 3l9 7v11h-6v-7H9v7H3Z",
  heart: "M20 5c-3-3-6 0-8 2-2-2-5-5-8-2-4 5 3 10 8 15 5-5 12-10 8-15Z",
  chart: "M4 3v17h17M8 15v-4m5 4V7m5 8V4",
  check: "M9 3h6v4H9ZM7 5H4v16h16V5h-3M8 13l3 3 5-6",
  chat: "M4 4h16v12H9l-5 4Z",
  book: "M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15",
  calendar: "M4 5h16v16H4ZM4 10h16M8 3v4m8-4v4",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-3c0-6 16-6 16 0v3",
  shield: "M12 3 3 6v7c0 4 5 7 9 9 4-2 9-5 9-9V6ZM8 12l3 3 5-6",
  arrow: "M4 12h16m-5-5 5 5-5 5",
  leaf: "M4 20C3 7 10 3 21 3c0 11-4 18-13 14M5 19 16 8",
  sun: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",
  search: "M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v6l4 2",
  help: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9 9c0-4 7-3 6 0 0 2-3 2-3 5m0 3h.01",
  logout: "M9 3H3v18h6m5-14 5 5-5 5M8 12h13",
  settings: "M4 7h16M4 17h16M8 4v6m8 4v6",
  wind: "M3 8h13c5 0 5-6 1-6M3 12h16c5 0 5 7 0 7M3 16h8c4 0 4 6 0 6",
};
const icon = (n) =>
  `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><path d="${paths[n] || paths.leaf}"/></svg>`;
const mascot = (large = false) =>
  `<svg class="${large ? "art" : "mascot"}" viewBox="0 0 200 200" role="img" aria-label="Lumi, a gentle lavender sprout companion"><ellipse cx="100" cy="177" rx="65" ry="10" fill="#ddd8ed"/><path d="M99 59Q66 49 70 26q29 0 31 26Q109 24 138 28q-1 29-36 31" fill="#a3bdaa"/><path d="M100 63V44" stroke="#759783" stroke-width="5" stroke-linecap="round"/><path d="M45 99Q43 57 101 57q59 0 58 51l8 32q3 34-29 32H61q-35 1-27-31Z" fill="#c1b4e3"/><ellipse cx="101" cy="129" rx="49" ry="35" fill="#e9e1f7"/><path d="M62 102q8-9 15 0m47 0q8-9 15 0" fill="none" stroke="#65567d" stroke-width="4" stroke-linecap="round"/><path d="M91 113q10 10 20 0" fill="none" stroke="#65567d" stroke-width="3" stroke-linecap="round"/><ellipse cx="65" cy="113" rx="9" ry="5" fill="#e8b8ca"/><ellipse cx="137" cy="113" rx="9" ry="5" fill="#e8b8ca"/><path d="M35 119q-20-6-17 11t26 9m116-20q20-6 20 10t-22 12" fill="#c1b4e3"/><path d="M93 142q-12-14-17-3t17 18q23-12 17-19t-17 4" fill="#a6bdae"/></svg>`;
const moods = [
  ["happy", "Happy"],
  ["neutral", "Neutral"],
  ["sad", "Sad"],
  ["anxious", "Anxious"],
  ["angry", "Angry"],
];
const moodIcon = (name) => {
  const faces = {
    happy: '<path d="M7.5 14c1.1 1.5 2.6 2.3 4.5 2.3s3.4-.8 4.5-2.3"/>',
    neutral: '<path d="M8 15h8"/>',
    sad: '<path d="M7.5 16.2c1.1-1.5 2.6-2.3 4.5-2.3s3.4.8 4.5 2.3"/>',
    anxious: '<path d="M7.5 15c1-.8 1.8-.8 2.8 0s1.9.8 2.9 0 1.9-.8 2.8 0"/>',
    angry:
      '<path d="m7.8 9.2 3.1 1.5m5.3-1.5-3.1 1.5m-5.1 5.1c1.1-1.4 2.5-2.1 4-2.1s2.9.7 4 2.1"/>',
  };
  return `<svg class="mood-face mood-face-${name}" viewBox="0 0 24 24" aria-hidden="true"><circle class="mood-face-bg" cx="12" cy="12" r="10"/><path class="mood-face-features" d="M8.5 9.5h.01m7 0h.01${faces[name] || faces.neutral}"/></svg>`;
};
let session = null,
  authMode = "login";
try {
  session = JSON.parse(sessionStorage.getItem("stillwell-session"));
} catch {}
let state = {
  page: "home",
  role: "student",
  profile: { display_name: "there" },
  moods: [],
  appointments: [],
  assessments: [],
  resources: [],
  users: [],
  results: [],
  messages: [],
  selected: null,
};
const resources = [
  {
    id: "breathing",
    title: "A moment to breathe",
    category: "Mindful moments",
    body: "Find a comfortable position. Let your breathing stay gentle and natural. Follow the circle if it feels comfortable, or simply notice each breath. Stop if you feel dizzy or uncomfortable.",
    icon: "wind",
  },
  {
    id: "study",
    title: "Make room for a study break",
    category: "Student life",
    body: "Choose one small task. Work for a short period, then pause to stretch, drink water, or look away from your screen. Adjust the rhythm to what works for you.",
    icon: "book",
  },
  {
    id: "grounding",
    title: "Come back to the present",
    category: "Everyday wellbeing",
    body: "Notice five things around you. Feel your feet on the floor. Look for a texture or sound you find comfortable. There is no perfect way to pause.",
    icon: "leaf",
  },
  {
    id: "support",
    title: "Starting a conversation",
    category: "Human connection",
    body: "You could say: “I have been having a difficult time and would appreciate someone listening.” Choose a trusted person or request time with a qualified counselor.",
    icon: "chat",
  },
  {
    id: "rest",
    title: "Give yourself permission to rest",
    category: "Self-care",
    body: "Try one small boundary today: put away a task at a planned time, take a screen break, or make space for something you enjoy. Rest does not need to be earned.",
    icon: "sun",
  },
  {
    id: "external",
    title: "Explore trusted learning materials",
    category: "Resource directory",
    body: "Visit the World Health Organization mental health topic page for educational information. The link opens an external website with its own privacy policy.",
    url: "https://www.who.int/health-topics/mental-health",
    icon: "book",
  },
];
const questions = [
  "I had enough energy for everyday tasks.",
  "I felt able to manage my study workload.",
  "I made time to rest.",
  "I felt connected to someone I trust.",
];
const dateKey = () => new Date().toLocaleDateString("en-CA");
function toast(s) {
  $("#toast").textContent = s;
  $("#toast").style.display = "block";
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(
    () => ($("#toast").style.display = "none"),
    4500,
  );
}
async function request(path, opts = {}) {
  const url = path.startsWith("/rest/v1/")
    ? "/api?kind=supabase&path=" + encodeURIComponent(path)
    : path.startsWith("/api?")
      ? path
      : cfg.supabaseUrl + path;
  const r = await fetch(url, {
    ...opts,
    headers: {
      apikey: cfg.publishableKey,
      "Content-Type": "application/json",
      ...(session ? { Authorization: "Bearer " + session.access_token } : {}),
      ...opts.headers,
    },
  });
  const t = await r.text();
  let d;
  try {
    d = t ? JSON.parse(t) : null;
  } catch {
    d = null;
  }
  if (!r.ok)
    throw Error(
      d?.msg ||
        d?.message ||
        d?.error_description ||
        d?.error ||
        "Request failed. Please try again.",
    );
  return d;
}
const db = (table, query = "", opts = {}) =>
  request("/rest/v1/" + table + query, opts);
async function refresh() {
  if (!live || !session) return;
  await ensureSession();
  let p = await db("profiles", "?id=eq." + session.user.id);
  state.profile = p[0] || { display_name: "there" };
  state.role = state.profile.role || "student";
  let [m, a, r, t, res] = await Promise.all([
    db("mood_entries", "?order=entry_date.desc"),
    db("appointments", "?order=requested_at.desc"),
    db("resources", "?order=created_at.desc"),
    db("assessments", "?order=created_at"),
    db("assessment_results", "?order=created_at.desc"),
  ]);
  Object.assign(state, {
    moods: m,
    appointments: a,
    resources: r,
    assessments: t,
    results: res,
  });
  if (state.role === "admin")
    state.users = await db("profiles", "?order=created_at.desc");
}
async function ensureSession() {
  if (session?.expires_at && session.expires_at < Date.now() / 1000 + 90) {
    let d = await request("/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    setSession(d);
  }
}
function setSession(s) {
  session = s;
  if (s) sessionStorage.setItem("stillwell-session", JSON.stringify(s));
  else sessionStorage.removeItem("stillwell-session");
}
function modal(title, body) {
  $("#modal").innerHTML =
    `<button class="close" data-action="close" aria-label="Close dialog">×</button><h2>${title}</h2>${body}`;
  $("#modal").showModal();
}
function navigate(p) {
  state.page = p;
  render();
  window.scrollTo(0, 0);
}
document.addEventListener("click", (e) => {
  const button = e.target.closest("[data-auth-mode]");
  if (!button) return;
  authMode = button.dataset.authMode;
  render();
});
function nav(p, n, label) {
  return `<button class="nav ${state.page === p ? "active" : ""}" data-page="${p}">${icon(n)}${label}</button>`;
}
function render() {
  if (
    live &&
    !session &&
    !["privacy", "terms", "help"].includes(state.page)
  ) {
    $("#app").innerHTML = authView();
    return;
  }
  let staff = state.role !== "student";
  $("#app").innerHTML =
    `<div class="shell"><aside class="sidebar"><div class="brand"><span class="brandmark">${icon("leaf")}</span>stillwell<span style="color:#a69dce">.</span></div><div class="side-label">YOUR WELLBEING SPACE</div>${nav("home", "home", "Overview")}${nav("mood", "heart", "Mood check-in")}${nav("assessment", "check", "Self-assessment")}${nav("chat", "chat", "Talk with Lumi")}${nav("resources", "book", "Resource library")}${nav("appointments", "calendar", "Counseling")}${staff ? nav("counselor", "user", "Counselor workspace") : ""}${state.role === "admin" ? nav("admin", "settings", "Administration") : ""}<div class="side-bottom"><div class="side-help">${icon("help")}<h3>You don’t have to do it alone.</h3><p>Find a person to talk to when things feel difficult.</p><button class="button secondary" data-page="help">Find support ${icon("arrow")}</button></div>${nav("profile", "user", "My profile")}<button class="nav help-button" data-page="help">${icon("shield")}Need urgent help?</button></div></aside><div><header class="topbar"><button class="menu-button" data-action="menu" aria-label="Open navigation">${icon("settings")}</button><span class="mobile-brand">stillwell.</span><form id="search" class="search">${icon("search")}<input name="q" aria-label="Search resources" placeholder="Search your wellbeing resources..."></form><div class="top-right">${!live ? '<span class="chip">Interactive preview</span>' : ""}<button data-page="help" aria-label="Support">${icon("help")}</button><span class="avatar">${esc(state.profile.display_name?.[0]?.toUpperCase() || "S")}</span><span class="name">${esc(state.profile.display_name === "there" ? "Your space" : state.profile.display_name)}<br><small>${state.role === "student" ? "Student" : state.role}</small></span></div></header><main class="workspace">${!live ? '<div class="notice">Preview mode · Try every flow with sample data. Entries stay in memory and clear on refresh. Configure Supabase to enable real accounts.</div>' : ""}${pageView()}<footer><span>Stillwell · Small steps. A little more space.</span><span>${live && !session ? '<button data-page="auth">Back to log in</button> · ' : ""}<button data-page="privacy">Privacy policy</button> · <button data-page="terms">Terms of use</button> · <button data-page="help">Get support</button></span></footer></main></div></div>`;
}
function heading(k, t, sub = "") {
  return `<div class="page-heading"><div><div class="eyebrow">${k}</div><h1 style="margin-top:9px">${t}</h1>${sub ? `<p class="muted" style="margin:0">${sub}</p>` : ""}</div><span class="date">${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span></div>`;
}
const moodButtons = () =>
  `<div class="moods">${moods.map((m, i) => `<button class="mood ${state.selected === i ? "selected" : ""}" data-mood="${i}" aria-label="${m[1]}" aria-pressed="${state.selected === i}"><span class="mood-icon">${moodIcon(m[0])}</span><span class="mood-label">${m[1]}</span></button>`).join("")}</div>`;
function chart() {
  const entries = state.moods.slice(0, 7).reverse();
  return entries.length
    ? `<div class="chart">${entries.map((m) => `<div class="bar-group"><span>${moodIcon(moods.find((x) => x[1] === m.mood)?.[0] || "neutral")}</span><div class="bar" style="height:${m.intensity * 16}px"></div></div>`).join("")}</div><div class="legend">${entries.map((m) => `<span>${esc(m.entry_date.slice(5))}</span>`).join("")}</div><small>Bar height shows self-reported intensity (1–5), not a health score.</small>`
    : '<div class="empty">Your story starts with one check-in.<br><small>Save a mood to see your recent entries here.</small></div>';
}
function home() {
  return (
    heading(
      "A LITTLE SPACE FOR YOU",
      `Welcome back, ${esc(state.profile.display_name)}.`,
      "Take a breath. You’re right where you need to be.",
    ) +
    `<div class="dashboard"><div class="stack"><section class="card hero"><div><span class="eyebrow">YOUR PACE. YOUR JOURNEY.</span><h2>A small check-in.<br>A kinder day.</h2><p>You don’t need to have it all figured out.<br>Let’s start with how you’re feeling today.</p><button class="button" data-page="mood">Check in with yourself ${icon("arrow")}</button></div>${mascot(true)}</section><section class="card"><div class="card-head"><h2>How are you feeling today?</h2><span class="muted" style="font-size:11px">Just for you</span></div><small>Every feeling is welcome here.</small>${moodButtons()}</section><section><div class="card-head"><h2>A little care goes a long way</h2><button class="text-link" data-page="resources">Explore all ${icon("arrow")}</button></div><div class="tiles"><button class="tile" data-resource="breathing"><span class="iconbox">${icon("wind")}</span><div><h3>Pause & breathe</h3><p>A gentle moment to reset.</p><small>2 min · Mindfulness</small></div></button><button class="tile" data-page="assessment"><span class="iconbox mint">${icon("check")}</span><div><h3>Understand yourself</h3><p>A little space for reflection.</p><small>3 min · Self check-in</small></div></button><button class="tile" data-resource="study"><span class="iconbox peach">${icon("book")}</span><div><h3>Find your balance</h3><p>Make study time feel lighter.</p><small>4 min · Student life</small></div></button></div></section><section class="card"><div class="card-head"><h2>Your recent check-ins</h2><button class="text-link" data-page="mood">View history ${icon("arrow")}</button></div>${chart()}</section></div><aside class="stack right-column"><section class="card chat-card"><span class="chip">MEET YOUR WELLBEING COMPANION</span>${mascot()}<h2>A little support from Lumi</h2><p>A gentle place to pause, explore self-care, and find your next small step.</p><button class="button" data-page="chat">Let’s talk ${icon("chat")}</button><p style="font-size:10px;margin-bottom:0">AI support, never a replacement for human care.</p></section><section class="card"><div class="card-head"><h2>Your support circle</h2>${icon("calendar")}</div><small>Make space for a conversation.</small><div class="mini-calendar">${["M", "T", "W", "T", "F", "S", "S"].map((x) => `<span>${x}</span>`).join("")}${Array.from(
      { length: 7 },
      (_, i) => {
        let d = new Date();
        const day = (d.getDay() + 6) % 7;
        d.setDate(d.getDate() - day + i);
        return `<span class="${i === day ? "today" : ""}">${d.getDate()}</span>`;
      },
    ).join(
      "",
    )}</div><div class="divider"></div><div class="row"><span class="iconbox mint">${icon("user")}</span><div><h3 style="margin:0">Guidance counseling</h3><small>${state.appointments.length ? state.appointments.length + " request(s) in your workspace" : "A real person. A listening ear."}</small></div></div><button class="button secondary" style="width:100%;margin-top:19px" data-page="appointments">Request a session</button></section><section class="card tip"><span class="eyebrow">A GENTLE REMINDER</span><p>“You’re allowed to take a break, even when your to-do list isn’t finished.”</p><small>One small act of kindness to yourself.</small></section></aside></div>`
  );
}
function moodView() {
  return (
    heading(
      "NOTICE, WITHOUT JUDGMENT",
      "Your daily check-in",
      "A feeling is information. It doesn’t define you.",
    ) +
    `<div class="two-col"><section class="card"><h2>What feels closest today?</h2>${moodButtons()}<form id="mood-form"><label class="field">How strong is this feeling?<select name="intensity">${[1, 2, 3, 4, 5].map((x) => `<option value="${x}" ${x === 3 ? "selected" : ""}>${x} — ${["Very gentle", "Gentle", "Moderate", "Strong", "Very strong"][x - 1]}</option>`).join("")}</select></label><label class="field">A private note (optional)<textarea name="note" maxlength="1000" placeholder="What’s been on your mind?"></textarea></label><p class="muted">Your mood and note are private. They are not automatically shared with a counselor or sent to AI.</p><button class="button">Save today’s check-in</button></form></section><section class="card"><h2>Your mood history</h2>${chart()}${state.moods.map((m) => `<div class="list-item"><div class="row spread"><strong class="mood-history-label">${moodIcon(moods.find((x) => x[1] === m.mood)?.[0] || "neutral")}${esc(m.mood)}</strong><small>${esc(m.entry_date)}</small></div><p>${esc(m.note || "No note added.")}</p><button class="text-link" data-delete-mood="${esc(m.id)}">Delete entry</button></div>`).join("")}</section></div>`
  );
}
function assessmentView() {
  const a = state.assessments[0],
    qs = a?.questions || questions;
  return (
    heading(
      "MAKE ROOM FOR REFLECTION",
      "How have things felt lately?",
      "A personal reflection, not a medical assessment or diagnosis.",
    ) +
    `<div class="two-col"><section class="card"><h2>${esc(a?.title || "Everyday wellbeing reflection")}</h2><div class="notice">Think about the past seven days. This custom reflection is not a validated screening instrument and has no diagnostic cutoffs.</div><form id="assessment-form">${qs.map((q, i) => `<label class="assessment-q" style="display:block">${i + 1}. ${esc(q)}<select name="q${i}" required><option value="">Choose an answer</option><option value="0">Rarely</option><option value="1">Sometimes</option><option value="2">Often</option><option value="3">Most days</option></select></label>`).join("")}<button class="button" style="margin-top:20px">See my reflection</button></form></section><section class="card"><h2>Your reflections</h2>${state.results.length ? state.results.map((r) => `<div class="list-item"><small>${new Date(r.created_at).toLocaleDateString()}</small><h3>${r.score} / ${r.max_score} reflection points</h3><p>This only summarizes your selected answers. Consider what you would like more support with.</p><button class="text-link" data-delete-result="${esc(r.id)}">Delete reflection</button></div>`).join("") : '<div class="empty">Your reflections will appear here.</div>'}<button class="button secondary" data-page="appointments">Talk it through with a counselor</button></section></div>`
  );
}
function chatView() {
  return (
    heading(
      "A GENTLE PLACE TO PAUSE",
      "Meet Lumi",
      "Small ideas for everyday care, at your pace.",
    ) +
    `<div class="two-col"><section class="card"><div class="row">${mascot()}<div><h2>Hi, I’m Lumi.</h2><p>I can help you explore general wellbeing ideas. I’m an AI companion, not a counselor.</p></div></div><div class="notice">Privacy-first free mode: choose a general topic. Personal notes, mood history, names, and assessment results are never sent to Gemini. Free-text personal chat requires a reviewed paid-service configuration.</div><label><input id="ai-consent" type="checkbox"> I’m 18 or older and agree to send only the selected general topic to Google for an AI response. <button class="text-link" data-page="privacy">Read the privacy policy</button></label><div class="chat-log" role="log" aria-live="polite">${state.messages.length ? state.messages.map((m) => `<div class="bubble ${m.role === "user" ? "user" : ""}">${esc(m.text)}</div>`).join("") : '<div class="bubble">What would you like to make a little space for today?</div>'}</div><div class="topic-buttons">${["A breathing pause", "Study and rest balance", "Everyday self-care", "Reaching out for support"].map((s, i) => `<button data-topic="${i}">${s} ${icon("arrow")}</button>`).join("")}</div><div class="divider"></div><button class="text-link" data-action="clear-chat">Clear this conversation</button></section><section class="stack"><div class="card mint"><h2>Human support matters</h2><p>If you need to talk about personal emotional concerns, a qualified counselor can offer support that an AI cannot.</p><button class="button secondary" data-page="appointments">Request counseling</button></div><div class="card"><h2>Your conversation, your choice</h2><p>Messages here stay in this page’s memory. Refresh or clear the conversation to remove them. Google processes AI requests under its own terms.</p><p>In preview mode, Lumi uses clearly labeled example replies.</p><button class="text-link" data-page="help">I need urgent support ${icon("arrow")}</button></div></section></div>`
  );
}
function resourcesView(query = "") {
  let rr = [...resources, ...state.resources].filter((r) =>
    (r.title + " " + r.category + " " + r.body)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    heading(
      "YOUR EVERYDAY TOOLKIT",
      "A little care, within reach",
      "Explore gentle practices and practical ideas for student life.",
    ) +
    `<div class="resource-grid">${rr.map((r, i) => `<article class="card"><div class="resource-cover c${i % 3}">${icon(r.icon || "book")}</div><span class="eyebrow">${esc(r.category)}</span><h2 style="margin:12px 0">${esc(r.title)}</h2><p class="muted">${esc(r.body.slice(0, 100))}…</p><button class="text-link" data-resource="${esc(r.id)}">Explore resource ${icon("arrow")}</button></article>`).join("") || "<p>No resources matched your search.</p>"}</div>`
  );
}
function appointmentsView() {
  return (
    heading(
      "CONNECT WITH A REAL PERSON",
      "You deserve to be heard",
      "Request a conversation with your school guidance team.",
    ) +
    `<div class="two-col"><section class="card"><h2>Request a counseling session</h2><div class="notice">This sends a request, not a confirmed booking. Your school must connect and staff this service. It is not monitored for emergencies.</div><form id="appointment-form"><label class="field">Preferred date and time<input name="requested_at" type="datetime-local" required min="${new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}"></label><label class="field">Session preference<select name="mode"><option>In person</option><option>Online</option></select></label><label class="field">What would you like support with?<select name="reason"><option>Study and workload</option><option>General wellbeing</option><option>Relationships and belonging</option><option>I prefer to discuss this in person</option></select></label><label><input type="checkbox" required> I agree to share this request and my display name with the guidance team.</label><p class="muted">Mood notes, reflection answers, and AI conversations are not shared.</p><button class="button">Send appointment request ${icon("arrow")}</button></form></section><section class="card"><h2>Your requests</h2>${state.appointments.length ? state.appointments.map((a) => `<div class="list-item"><span class="chip">${esc(a.status)}</span><h3>${new Date(a.requested_at).toLocaleString()}</h3><p>${esc(a.mode)} · ${esc(a.reason)}</p>${["pending", "confirmed"].includes(a.status) ? `<button class="text-link" data-cancel="${a.id}">Cancel request</button>` : ""}</div>`).join("") : '<div class="empty">No requests yet.<br>Your next small step can start here.</div>'}</section></div>`
  );
}
function counselorView() {
  if (state.role === "student")
    return '<div class="card">This workspace is available only to authorized counselors.</div>';
  return (
    heading(
      "GUIDANCE WORKSPACE",
      "Make space for your students",
      "Only voluntarily submitted appointment details are visible here.",
    ) +
    `<section class="card"><h2>Appointment requests</h2><div class="notice">Private moods and reflection answers are not accessible. Requests are not crisis alerts and should be checked according to your school’s published response schedule.</div><div class="table-wrap"><table><thead><tr><th>Student reference</th><th>Requested time</th><th>Topic</th><th>Status</th><th>Manage</th></tr></thead><tbody>${state.appointments.map((a) => `<tr><td>${esc(a.student_name || a.user_id?.slice(0, 8) || "Preview student")}</td><td>${new Date(a.requested_at).toLocaleString()}</td><td>${esc(a.reason)}</td><td>${esc(a.status)}</td><td>${a.status === "pending" ? `<button class="button secondary" data-status="confirmed" data-id="${a.id}">Confirm</button>` : ""}${["pending", "confirmed"].includes(a.status) ? ` <button class="text-link" data-status="completed" data-id="${a.id}">Complete</button>` : ""}</td></tr>`).join("")}</tbody></table></div>${!state.appointments.length ? '<div class="empty">No appointment requests to review.</div>' : ""}</section><section class="card" style="margin-top:22px"><h2>Publish a resource</h2>${resourceForm()}${resourceManage()}</section>`
  );
}
function resourceForm() {
  return `<form id="resource-form"><div class="two-col"><label class="field">Title<input name="title" required maxlength="120"></label><label class="field">Category<input name="category" required maxlength="60"></label></div><label class="field">Resource content<textarea name="body" required maxlength="10000"></textarea></label><button class="button">Publish resource</button></form>`;
}
function resourceManage() {
  return state.resources
    .map(
      (r) =>
        `<div class="list-item row spread"><strong>${esc(r.title)}</strong><div><button class="text-link" data-edit-resource="${r.id}">Edit</button><button class="text-link" data-remove-resource="${r.id}">Remove</button></div></div>`,
    )
    .join("");
}
function adminView() {
  if (state.role !== "admin")
    return '<div class="card">Administrator access required.</div>';
  return (
    heading(
      "SYSTEM ADMINISTRATION",
      "A responsible support space",
      "Manage access and educational content without reading private reflections.",
    ) +
    `<div class="tiles"><div class="card"><small>Registered profiles</small><div class="stat">${live ? state.users.length : "—"}</div></div><div class="card"><small>Published resources</small><div class="stat">${state.resources.length + resources.length}</div></div><div class="card"><small>Reflection templates</small><div class="stat">${state.assessments.length || 1}</div></div></div><section class="card" style="margin-top:22px"><h2>Accounts & counselor access</h2>${!live ? '<div class="notice">Preview: real account management becomes available after Supabase setup. Role changes require an authenticated administrator.</div>' : ""}<div class="table-wrap"><table><thead><tr><th>Name</th><th>Role</th><th>Manage</th></tr></thead><tbody>${state.users.map((u) => `<tr><td>${esc(u.display_name)}</td><td>${esc(u.role)}</td><td><select data-user-role="${u.id}" aria-label="Role for ${esc(u.display_name)}">${["student", "counselor", "admin"].map((r) => `<option ${u.role === r ? "selected" : ""}>${r}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table></div></section><div class="two-col" style="margin-top:22px"><section class="card"><h2>Resources</h2>${resourceForm()}${resourceManage()}</section><section class="card"><h2>Reflection template</h2><p class="muted">Use only non-diagnostic custom questions. Clinical screening tools require separate validation and scoring.</p><form id="template-form"><label class="field">Title<input name="title" required value="${esc(state.assessments[0]?.title || "Everyday wellbeing reflection")}"></label><label class="field">Questions (one per line, 1–10)<textarea name="questions" required>${esc((state.assessments[0]?.questions || questions).join("\n"))}</textarea></label><button class="button">Save template</button></form></section></div>`
  );
}
function profileView() {
  return (
    heading("YOUR ACCOUNT", "Your space, your choices") +
    `<div class="two-col"><section class="card"><h2>Profile details</h2><form id="profile-form"><label class="field">Display name<input name="display_name" value="${esc(state.profile.display_name)}" required maxlength="60"></label><button class="button">Save profile</button></form><div class="divider"></div>${!live ? `<label class="field">Explore a preview role<select id="preview-role">${["student", "counselor", "admin"].map((r) => `<option ${state.role === r ? "selected" : ""}>${r}</option>`).join("")}</select></label><small>This preview switch does not grant live account permissions.</small>` : `<p>Role: ${esc(state.role)}</p><button class="button outline" data-action="logout">Sign out</button>`}</section><section class="card"><h2>Data choices</h2><p>Export your visible personal records or delete individual mood entries and reflections in their history views.</p><button class="button secondary" data-action="export">Export my data</button><div class="divider"></div><h3>Account deletion</h3><p>Deleting your account removes your profile, moods, reflections, and appointment records from the active database. Backups follow the operator’s configured retention.</p><button class="button danger" data-action="delete-account">Delete my account & records</button></section></div>`
  );
}
function authView() {
  const signup = authMode === "signup";
  return `<main class="login-screen"><section class="auth-frame card"><aside class="login-welcome"><div class="brand"><span class="brandmark">${icon("leaf")}</span>stillwell<span style="color:#a69dce">.</span></div><div class="login-art">${mascot(true)}</div><div class="welcome-copy"><span class="eyebrow">YOUR WELLBEING SPACE</span><h2>A little space<br>just for you.</h2><p>Take a breath. You’re right where you need to be.</p></div></aside><section class="auth-panel"><div class="login-heading"><span class="eyebrow">${signup ? "GET STARTED" : "WELCOME BACK"}</span><h1>${signup ? "Create your account" : "Log in"}</h1><p>${signup ? "Make a little space for yourself." : "Sign in to continue to your space."}</p></div><form id="auth-form">${signup ? '<label class="field">Display name<input name="name" maxlength="60" required autocomplete="name" placeholder="Your name"></label>' : ""}<label class="field">Email<input name="email" type="email" required autocomplete="email" placeholder="you@example.com"></label><label class="field">Password<input name="password" type="password" minlength="12" required autocomplete="${signup ? "new-password" : "current-password"}" placeholder="At least 12 characters"></label>${signup ? '<label class="signup-consent"><input name="accept" type="checkbox" required> I am 18 or older and accept the <button type="button" data-page="terms">Terms of use</button> and <button type="button" data-page="privacy">Privacy policy</button>.</label>' : ""}<button class="button login-submit" name="mode" value="${signup ? "signup" : "login"}">${signup ? "Create account" : "Log in"}${icon("arrow")}</button></form>${signup ? '<p class="auth-alternate">Already have an account? <button type="button" data-auth-mode="login">Log in</button></p>' : '<div class="auth-actions"><button type="button" class="auth-switch" data-action="reset-password">Forgot password?</button><span>New to Stillwell? <button type="button" class="auth-switch" data-auth-mode="signup">Create an account</button></span></div>'}</section></section></main>`;
}
function helpView() {
  return (
    heading("HUMAN SUPPORT COMES FIRST", "You don’t have to face this alone.") +
    `<section class="card" style="max-width:850px"><h2>If you may be in immediate danger</h2><p>Contact your local emergency services or go to the nearest emergency department. If possible, reach out to someone you trust and ask them to stay with you. Move away from anything you could use to hurt yourself, if you can do so safely.</p><div class="notice warn">Stillwell is not an emergency service. This page and the AI are not continuously monitored. We do not automatically contact anyone or guarantee detection of a crisis.</div><h3>If you need someone to talk to</h3><p>Reach out to a trusted person or a qualified mental-health professional. Your school guidance office may also be able to help.</p><button class="button" data-page="appointments">Request a non-urgent counseling session</button><div class="divider"></div><p class="muted">School contact details must be verified and added by your institution before launch. No unverified hotline numbers are displayed.</p></section>`
  );
}
function policyView(type) {
  let privacy = type === "privacy";
  return (
    heading(
      "CLEAR INFORMATION. INFORMED CHOICES.",
      privacy ? "Privacy policy" : "Terms of use",
      "Prototype policy · Version 1 · Updated 19 October 2026",
    ) +
    `<article class="card policy" style="max-width:900px"><div class="notice warn">This is a development policy draft. The operating institution, privacy contact, retention schedule, and jurisdiction must be completed and reviewed before collecting real student information.</div>${privacy ? `<h3>What we collect and why</h3><p>When connected, Supabase Auth processes your email and authentication credentials. The application stores your display name, role, policy acceptance, daily mood and optional note, reflection results, and appointment requests. These support your account, personal history, and requested counseling services.</p><h3>Who can see your records</h3><p>Students can access their own mood entries and reflection results. Authorized counselors can access voluntarily submitted appointment details and the display name supplied with a request. Administrators manage profiles, roles and content, but the application does not grant them access to private mood notes or assessment answers. Privileged database operators can technically access stored data. This service does not offer end-to-end encryption.</p><h3>AI and Google Gemini</h3><p>In free mode, only a predefined general wellbeing topic is sent to Gemini after you opt in. Your account identifier, mood notes, assessment answers and appointment details are not included. Google may use free-service prompts and responses to improve its products, and human review may occur. Do not submit personal or confidential information. AI conversation text is kept in page memory only; server-side usage counters contain no message content.</p><h3>Storage and session information</h3><p>Preview entries exist only in browser memory and disappear on refresh. A connected account uses Supabase PostgreSQL; authentication tokens are stored in session storage for the current browser tab. Network providers may process technical logs. No advertising analytics are included. Hosting and database providers may process data outside your country according to the operator’s selected region.</p><h3>Your choices and deletion</h3><p>Use My profile to export your records or delete your account. You can delete individual moods and reflections. Deleting the account cascades through personal records in the active database. Provider backups and logs may remain for the configured retention period. Before launch, the operator must publish the actual retention period and a working contact for privacy requests.</p><h3>Sharing and safeguarding</h3><p>Appointment submission requires your agreement to share that request with the guidance team. The application does not automatically send crisis alerts. Any future safeguarding disclosure procedure must be explained by the operating institution before activation.</p><h3>Age and contact</h3><p>This implementation is intended for adults aged 18 and above. The institution must publish its legal name, privacy officer contact, and applicable rights process before live use.</p>` : `<h3>Purpose of the service</h3><p>Stillwell offers self-reflection, general wellbeing education and appointment requests. It does not diagnose, treat, provide medical advice, or replace a qualified professional. Reflection points are a summary of answers, not a clinical score.</p><h3>Eligibility and account responsibilities</h3><p>This implementation is for adults aged 18 or older. Keep your credentials private, provide accurate account information, and use the service respectfully. You may not access another person’s records or misuse staff access.</p><h3>AI limitations</h3><p>Lumi is an AI companion and may produce inaccurate or unsuitable information. It is not a therapist. Do not rely on AI for medical decisions or emergencies. Free mode supports general topics only and does not accept personal emotional disclosures.</p><h3>Counseling requests</h3><p>A submitted request is pending until a counselor confirms it. Availability and response times depend on your institution. No live counseling service or partner relationship is implied by this prototype.</p><h3>Urgent situations</h3><p>The platform is not monitored for emergencies and cannot promise detection or intervention. Contact local emergency services, a trusted person, or an appropriate professional when urgent help is needed.</p><h3>Content and availability</h3><p>Educational material is provided for general information. External websites have separate policies. Service availability, free API quotas and provider features can change. You may stop using the service and request deletion of your records.</p><h3>Before institutional launch</h3><p>The operator must add its legal identity, contact details, applicable jurisdiction, support arrangements and reviewed policies. These draft terms do not claim regulatory compliance or replace legal review.</p>`}<div class="divider"></div><button class="button secondary" data-page="home">Return to my space</button></article>`
  );
}
function pageView() {
  switch (state.page) {
    case "home":
      return home();
    case "mood":
      return moodView();
    case "assessment":
      return assessmentView();
    case "chat":
      return chatView();
    case "resources":
      return resourcesView(state.search || "");
    case "appointments":
      return appointmentsView();
    case "counselor":
      return counselorView();
    case "admin":
      return adminView();
    case "profile":
      return profileView();
    case "help":
      return helpView();
    case "privacy":
    case "terms":
      return policyView(state.page);
    case "auth":
      return authView();
    default:
      return home();
  }
}
function openResource(id) {
  const r = [...resources, ...state.resources].find((x) => x.id === id);
  if (!r) return;
  modal(
    esc(r.title),
    `<p>${esc(r.body)}</p>${id === "breathing" ? '<div class="breathing" id="breathing">Breathe naturally</div><button class="button" data-action="breathe">Start gentle guide</button><p class="muted">Follow a comfortable pace. Stop anytime.</p>' : ""}${r.url && /^https:\/\//.test(r.url) ? `<a class="button" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">Open resource</a>` : ""}`,
  );
}
async function edge(body) {
  await ensureSession();
  return request("/api?kind=support", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  try {
    if (b.dataset.page) {
      navigate(b.dataset.page);
      return;
    }
    if (b.dataset.mood !== undefined) {
      state.selected = Number(b.dataset.mood);
      if (state.page === "home") navigate("mood");
      else render();
      return;
    }
    if (b.dataset.resource) {
      openResource(b.dataset.resource);
      return;
    }
    if (b.dataset.deleteMood) {
      if (!confirm("Delete this mood entry?")) return;
      if (live)
        await db("mood_entries", "?id=eq." + b.dataset.deleteMood, {
          method: "DELETE",
        });
      state.moods = state.moods.filter((x) => x.id !== b.dataset.deleteMood);
      render();
      return;
    }
    if (b.dataset.deleteResult) {
      if (!confirm("Delete this reflection?")) return;
      if (live)
        await db("assessment_results", "?id=eq." + b.dataset.deleteResult, {
          method: "DELETE",
        });
      state.results = state.results.filter(
        (x) => x.id !== b.dataset.deleteResult,
      );
      render();
      return;
    }
    if (b.dataset.cancel || b.dataset.status) {
      let id = b.dataset.cancel || b.dataset.id,
        status = b.dataset.cancel ? "cancelled" : b.dataset.status;
      if (live)
        await db("rpc/set_appointment_status", "", {
          method: "POST",
          body: JSON.stringify({ appointment_id: id, new_status: status }),
        });
      else state.appointments.find((x) => x.id === id).status = status;
      await refresh();
      render();
      toast("Request updated.");
      return;
    }
    if (b.dataset.topic !== undefined) {
      if (!$("#ai-consent").checked) {
        toast("Please read and accept the AI disclosure first.");
        return;
      }
      let i = Number(b.dataset.topic),
        topics = [
          "A breathing pause",
          "Study and rest balance",
          "Everyday self-care",
          "Reaching out for support",
        ];
      b.disabled = true;
      let reply;
      if (live) {
        reply = (await edge({ action: "topic", topic: i, consent: true }))
          .reply;
      } else reply = "Preview reply: " + resources[[0, 1, 4, 3][i]].body;
      state.messages.push(
        { role: "user", text: topics[i] },
        { role: "assistant", text: reply },
      );
      render();
      $("#ai-consent").checked = true;
      return;
    }
    if (b.dataset.removeResource) {
      if (!confirm("Remove this resource?")) return;
      if (live)
        await db("resources", "?id=eq." + b.dataset.removeResource, {
          method: "DELETE",
        });
      state.resources = state.resources.filter(
        (x) => x.id !== b.dataset.removeResource,
      );
      render();
      return;
    }
    if (b.dataset.editResource) {
      let r = state.resources.find((x) => x.id === b.dataset.editResource);
      modal(
        "Edit resource",
        `<form id="edit-resource-form" data-id="${r.id}"><label class="field">Title<input name="title" required value="${esc(r.title)}"></label><label class="field">Category<input name="category" required value="${esc(r.category)}"></label><label class="field">Content<textarea name="body" required>${esc(r.body)}</textarea></label><button class="button">Save changes</button></form>`,
      );
      return;
    }
    switch (b.dataset.action) {
      case "close":
        $("#modal").close();
        clearInterval(window.breathTimer);
        break;
      case "menu":
        $(".sidebar").classList.toggle("open");
        break;
      case "clear-chat":
        state.messages = [];
        render();
        break;
      case "breathe": {
        let el = $("#breathing");
        el.classList.toggle("running");
        clearInterval(window.breathTimer);
        if (el.classList.contains("running")) {
          let n = 0;
          el.textContent = "Breathe in gently";
          window.breathTimer = setInterval(() => {
            if (!$("#modal").open) {
              clearInterval(window.breathTimer);
              return;
            }
            n = (n + 1) % 10;
            el.textContent = n < 4 ? "Breathe in gently" : "Breathe out slowly";
          }, 1000);
          b.textContent = "Stop guide";
        } else {
          el.textContent = "Breathe naturally";
          b.textContent = "Start gentle guide";
        }
        break;
      }
      case "logout":
        try {
          await request("/auth/v1/logout", { method: "POST" });
        } finally {
          setSession(null);
          location.reload();
        }
        break;
      case "reset-password": {
        const email = $("[name=email]").value;
        if (!email) {
          toast("Enter your email first.");
          return;
        }
        await request("/auth/v1/recover", {
          method: "POST",
          body: JSON.stringify({ email, redirect_to: location.origin }),
        });
        toast("If the address is registered, a reset link will arrive.");
        break;
      }
      case "export": {
        const blob = new Blob(
            [
              JSON.stringify(
                {
                  profile: state.profile,
                  moods: state.moods,
                  reflections: state.results,
                  appointments: state.appointments,
                },
                null,
                2,
              ),
            ],
            { type: "application/json" },
          ),
          a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "stillwell-my-data.json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        break;
      }
      case "delete-account":
        if (
          !confirm("Permanently delete your account and all personal records?")
        )
          return;
        if (live) {
          await edge({ action: "delete-account" });
          setSession(null);
          location.reload();
        } else {
          state.moods = [];
          state.results = [];
          state.appointments = [];
          toast("Preview records cleared.");
          render();
        }
        break;
    }
  } catch (err) {
    toast(err.message);
  } finally {
    b.disabled = false;
  }
});
document.addEventListener("change", async (e) => {
  try {
    if (e.target.id === "preview-role") {
      state.role = e.target.value;
      render();
    }
    if (e.target.dataset.userRole) {
      if (!confirm("Change this account role to " + e.target.value + "?")) {
        render();
        return;
      }
      await db("rpc/admin_set_role", "", {
        method: "POST",
        body: JSON.stringify({
          target_user: e.target.dataset.userRole,
          new_role: e.target.value,
        }),
      });
      await refresh();
      render();
      toast("Role updated.");
    }
  } catch (err) {
    toast(err.message);
    render();
  }
});
document.addEventListener("submit", async (e) => {
  e.preventDefault();
  let f = e.target,
    fd = new FormData(f),
    v = Object.fromEntries(fd),
    submit = e.submitter;
  if (submit) submit.disabled = true;
  try {
    if (live && session) await ensureSession();
    switch (f.id) {
      case "search":
        state.search = v.q;
        navigate("resources");
        break;
      case "auth-form": {
        if (submit.value === "signup") {
          if (!fd.has("accept"))
            throw Error(
              "Please accept the policies and confirm you are 18 or older.",
            );
          await request("/auth/v1/signup", {
            method: "POST",
            body: JSON.stringify({
              email: v.email,
              password: v.password,
              data: {
                display_name: v.name || "Student",
                policy_version: "1",
                adult_confirmed: true,
              },
            }),
          });
          toast(
            "Account created. Check your email to confirm before signing in.",
          );
        } else {
          let s = await request("/auth/v1/token?grant_type=password", {
            method: "POST",
            body: JSON.stringify({ email: v.email, password: v.password }),
          });
          setSession(s);
          await refresh();
          navigate("home");
        }
        break;
      }
      case "mood-form": {
        if (state.selected === null) throw Error("Choose a mood first.");
        let row = {
          mood: moods[state.selected][1],
          intensity: Number(v.intensity),
          note: v.note,
          entry_date: dateKey(),
        };
        if (live) {
          await db("mood_entries", "?on_conflict=user_id,entry_date", {
            method: "POST",
            headers: { Prefer: "resolution=merge-duplicates" },
            body: JSON.stringify({ ...row, user_id: session.user.id }),
          });
          await refresh();
        } else {
          state.moods = state.moods.filter(
            (x) => x.entry_date !== row.entry_date,
          );
          state.moods.unshift({ ...row, id: crypto.randomUUID() });
        }
        render();
        if (
          /(kill myself|end my life|suicide|hurt myself|immediate danger)/i.test(
            v.note,
          )
        ) {
          modal(
            "Please reach out to a real person now",
            '<p>If you may be in immediate danger, contact local emergency services or go to the nearest emergency department. If you can, ask someone you trust to stay with you.</p><p>Your note was saved privately. No one has been alerted. This simple text check can miss concerns or misunderstand context.</p><button class="button" data-action="close">Close</button>',
          );
          break;
        }
        modal(
          "A small step, taken.",
          `<p>Your check-in is saved. ${["A good moment can be worth noticing.", "You don’t need to label everything perfectly.", "You deserve kindness on difficult days.", "Try one comfortable pause, if that feels useful.", "Give yourself space before choosing your next step."][state.selected]}</p><button class="button secondary" data-action="close">Back to my space</button>`,
        );
        break;
      }
      case "assessment-form": {
        let qs = state.assessments[0]?.questions || questions,
          answers = qs.map((_, i) => Number(v["q" + i])),
          score = answers.reduce((a, b) => a + b, 0),
          row = {
            answers,
            score,
            max_score: qs.length * 3,
            assessment_id: state.assessments[0]?.id || null,
          };
        if (live) {
          if (!row.assessment_id)
            throw Error(
              "Ask an administrator to publish a reflection template.",
            );
          await db("assessment_results", "", {
            method: "POST",
            body: JSON.stringify({ ...row, user_id: session.user.id }),
          });
          await refresh();
        } else
          state.results.unshift({
            ...row,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
          });
        render();
        modal(
          "Your reflection",
          `<h3>${score} / ${row.max_score} reflection points</h3><p>This is a simple summary of how often you selected each answer, not a clinical score. Notice which area you would like to make more space for.</p><p>${
            qs
              .filter((_, i) => answers[i] < 2)
              .map(esc)
              .join("<br>") ||
            "Keep noticing the routines and connections that feel supportive."
          }</p><button class="button" data-action="close">Done</button>`,
        );
        break;
      }
      case "appointment-form": {
        if (new Date(v.requested_at) <= new Date())
          throw Error("Please choose a future time.");
        let row = {
          requested_at: new Date(v.requested_at).toISOString(),
          mode: v.mode,
          reason: v.reason,
          student_name: state.profile.display_name,
          status: "pending",
        };
        if (live) {
          await db("appointments", "", {
            method: "POST",
            body: JSON.stringify({
              ...row,
              user_id: session.user.id,
              sharing_consent: true,
            }),
          });
          await refresh();
        } else state.appointments.unshift({ ...row, id: crypto.randomUUID() });
        render();
        toast("Request submitted. It remains pending until confirmed.");
        break;
      }
      case "profile-form":
        if (live) {
          await db("profiles", "?id=eq." + session.user.id, {
            method: "PATCH",
            body: JSON.stringify({ display_name: v.display_name }),
          });
          await refresh();
        } else state.profile.display_name = v.display_name;
        render();
        toast("Profile saved.");
        break;
      case "resource-form":
      case "edit-resource-form": {
        let row = { title: v.title, category: v.category, body: v.body };
        if (live) {
          await db("resources", f.dataset.id ? "?id=eq." + f.dataset.id : "", {
            method: f.dataset.id ? "PATCH" : "POST",
            body: JSON.stringify(row),
          });
          await refresh();
        } else if (f.dataset.id)
          Object.assign(
            state.resources.find((r) => r.id === f.dataset.id),
            row,
          );
        else state.resources.push({ ...row, id: crypto.randomUUID() });
        $("#modal").close();
        render();
        toast("Resource saved.");
        break;
      }
      case "template-form": {
        let qs = v.questions
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        if (qs.length < 1 || qs.length > 10) throw Error("Use 1–10 questions.");
        let row = { title: v.title, questions: qs };
        if (live) {
          await db(
            "assessments",
            state.assessments[0] ? "?id=eq." + state.assessments[0].id : "",
            {
              method: state.assessments[0] ? "PATCH" : "POST",
              body: JSON.stringify(row),
            },
          );
          await refresh();
        } else state.assessments = [{ ...row, id: "preview" }];
        render();
        toast("Template saved.");
        break;
      }
      case "password-form":
        await request("/auth/v1/user", {
          method: "PUT",
          body: JSON.stringify({ password: v.password }),
        });
        $("#modal").close();
        toast("Password updated.");
        break;
    }
  } catch (err) {
    toast(err.message);
  } finally {
    if (submit) submit.disabled = false;
  }
});
async function init() {
  const hash = new URLSearchParams(location.hash.slice(1));
  if (live && hash.get("access_token")) {
    const token = hash.get("access_token");
    setSession({
      access_token: token,
      refresh_token: hash.get("refresh_token"),
      expires_at: Date.now() / 1000 + Number(hash.get("expires_in") || 3600),
    });
    try {
      session.user = await request("/auth/v1/user");
      setSession(session);
    } catch {
      setSession(null);
    }
    history.replaceState(null, "", location.pathname);
  }
  try {
    await refresh();
  } catch (err) {
    toast("Connection issue: " + err.message);
  }
  render();
  if (hash.get("type") === "recovery" && session)
    modal(
      "Set a new password",
      '<form id="password-form"><label class="field">New password<input name="password" type="password" minlength="12" required></label><button class="button">Update password</button></form>',
    );
}
init();
