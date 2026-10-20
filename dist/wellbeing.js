"use strict";
window.Wellbeing = {
  selectedAssessment() {
    return state.assessments.find(a => a.id === state.assessmentId) || state.assessments[0];
  },
  suggestions() {
    const latest = state.moods[0], reflection = state.results[0];
    const ids = {Happy:["rest","support"],Neutral:["study","rest"],Sad:["support","rest"],Anxious:["grounding","breathing"],Angry:["grounding","rest"]}[latest?.mood] || ["breathing","study"];
    const picks = [...ids];
    if (reflection && reflection.score / reflection.max_score < .5) picks.push("support");
    return `<section class="card recommendations"><span class="eyebrow">SMALL STEPS FOR YOU</span><h2>A little support for today</h2><p>${latest ? `Based on your latest ${esc(latest.mood.toLowerCase())} check-in` : "Start with a gentle everyday activity"}${reflection ? " and your latest reflection" : ""}. These are optional wellbeing ideas, not clinical advice. Your records stay out of AI requests.</p><div class="tiles">${[...new Set(picks)].map(id=>{const r=resources.find(r=>r.id===id);return `<button class="tile" data-resource="${id}"><span class="iconbox">${icon(r.icon)}</span><span><strong>${esc(r.title)}</strong><br><small>Open guided activity ${icon("arrow")}</small></span></button>`;}).join("")}</div></section>`;
  },
  moodSummary() {
    const recent=state.moods.slice(0,30);
    if (!recent.length) return "";
    const counts=Object.fromEntries(moods.map(([,name])=>[name,recent.filter(m=>m.mood===name).length]));
    return `<div class="mood-summary"><h3>Your last ${recent.length} check-ins</h3><div class="mood-counts">${Object.entries(counts).map(([name,n])=>`<span>${esc(name)} <strong>${n}</strong></span>`).join("")}</div><p class="muted">Patterns describe your entries; they do not predict your health or diagnose a condition.</p></div>`;
  },
  reports() {
    const c=state.report?.counts;
    if(!c)return `<section class="card report-panel"><h2>Service activity</h2><p>${state.reportError ? esc(state.reportError) : "Reports are available after signing in to the connected service."}</p></section>`;
    return `<section class="card report-panel"><div class="card-head"><h2>Service activity</h2><button class="text-link" data-polish="export-report">Download report ${icon("arrow")}</button></div><div class="tiles"><div><small>Requests in the last 30 days</small><div class="stat">${c.last30days}</div></div><div><small>Previous 30 days</small><div class="stat">${c.previous30days}</div></div><div><small>Pending longer than 48 hours</small><div class="stat">${c.waiting48h}</div></div></div><p class="muted">Follow-up indicators reflect request age, not clinical risk. No private mood notes, assessment answers, or AI messages are included.</p>${state.role==="admin"?`<div class="mood-counts"><span>Accounts <strong>${c.profiles}</strong></span><span>Counselors <strong>${c.counselors}</strong></span><span>Assessments <strong>${c.assessments}</strong></span><span>Published resources <strong>${c.resources}</strong></span></div>`:""}<small>Updated ${new Date(state.report.generated_at).toLocaleString()}</small></section>`;
  },
  contacts() {
    const c=state.publicConfig || {};
    const email=typeof c.counseling_email==="string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.counseling_email) ? c.counseling_email : "";
    const phone=typeof c.counseling_phone==="string" && /^[+\d\s()-]{5,30}$/.test(c.counseling_phone) ? c.counseling_phone : "";
    return `<section class="card contact-panel"><h2>Your support contacts</h2>${c.operator_name?`<h3>${esc(c.operator_name)}</h3>`:""}${email || phone ? `<div class="activity-actions">${email?`<a class="button secondary" href="mailto:${esc(email)}">Email counseling</a>`:""}${phone?`<a class="button secondary" href="tel:${esc(phone.replace(/[^\d+]/g,""))}">Call ${esc(phone)}</a>`:""}</div><p>${esc(c.counseling_hours || "Contact the office to confirm availability.")}</p>`:`<p>Use the appointment form for a non-urgent request, or contact your school guidance office directly. ${esc(c.counseling_hours || "School phone details and office hours have not been supplied.")}</p>`}<button class="button secondary" data-page="appointments">Request an appointment</button>${c.country?.toLowerCase()==="philippines"?'<div class="crisis-contact"><h3>NCMH Crisis Hotline - Philippines</h3><p>24/7 support by phone for emotional distress or a mental-health crisis.</p><a class="button" href="tel:+63180018881553?oai_link_source=model_response_hotline">1800-1888-1553</a><p><a href="https://www.facebook.com/ncmhcrisishotline?mibextid=LQQJ4d&oai_link_source=model_response_hotline" target="_blank" rel="noopener noreferrer">NCMH Crisis Hotline website</a></p></div>':""}<p class="muted">If there is immediate danger, contact local emergency services or go to the nearest emergency department. This website does not send emergency alerts.</p></section>`;
  },
  operatorPolicy() {
    const c=state.publicConfig || {};
    const ready=c.operator_name && c.country && c.privacy_email && c.retention_notice;
    return `<div class="notice ${ready?"":"warn"}">${ready?"Operator information":"Operator details are incomplete. This policy remains a draft until the school supplies its contact and retention information."}</div>${c.operator_name?`<h3>Operator</h3><p>${esc(c.operator_name)}${c.country?" - "+esc(c.country):""}</p>`:""}${c.privacy_email?`<p>Privacy contact: ${esc(c.privacy_email)}</p>`:""}${c.retention_notice?`<h3>Record retention</h3><p>${esc(c.retention_notice)}</p>`:""}`;
  },
  templatesEditor() {
    const selected=state.assessments.find(a=>a.id===state.editAssessmentId);
    return `<h2>Assessment templates</h2><p class="muted">Use non-diagnostic, positively worded questions. Answers range from Rarely (0) to Most days (3); totals are descriptive only.</p><label class="field">Choose a template<select id="template-select"><option value="">Create a new template</option>${state.assessments.map(a=>`<option value="${esc(a.id)}" ${a.id===selected?.id?"selected":""}>${esc(a.title)}</option>`).join("")}</select></label><form id="template-form" data-id="${esc(selected?.id || "")}"><label class="field">Title<input name="title" required maxlength="120" value="${esc(selected?.title || "")}"></label><label class="field">Questions (one per line, 1-10)<textarea name="questions" required>${esc((selected?.questions || []).join("\n"))}</textarea></label><div class="activity-actions"><button class="button">Save template</button>${selected?`<button type="button" class="text-link" data-polish="delete-template" data-id="${esc(selected.id)}">Delete template</button>`:""}</div></form>`;
  }
};
document.addEventListener("change", e=>{
  if(e.target.id==="assessment-select"){state.assessmentId=e.target.value;render();}
  if(e.target.id==="template-select"){state.editAssessmentId=e.target.value;render();}
});
document.addEventListener("click",async e=>{
  const b=e.target.closest("[data-polish]");if(!b)return;
  try {
    if(b.dataset.polish==="export-report" && state.report) {
      const text="Stillwell service report\nGenerated: "+state.report.generated_at+"\n\n"+Object.entries(state.report.counts).map(([k,v])=>`${k}: ${v}`).join("\n")+"\n\nAggregate service activity only. No personal records included.";
      const url=URL.createObjectURL(new Blob([text],{type:"text/plain;charset=utf-8"}));
      const a=document.createElement("a");a.href=url;a.download="stillwell-service-report.txt";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
    if(b.dataset.polish==="delete-template" && state.role==="admin") {
      if(!confirm("Delete this template? Previous reflection results keep their question snapshots."))return;
      if(live){await db("assessments","?id=eq."+encodeURIComponent(b.dataset.id),{method:"DELETE"});await refresh();}
      else state.assessments=state.assessments.filter(a=>a.id!==b.dataset.id);
      state.editAssessmentId="";render();toast("Template deleted.");
    }
  } catch(error){toast(error.message);}
});
