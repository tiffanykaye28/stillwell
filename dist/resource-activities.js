"use strict";
window.ResourceActivities = (() => {
  const q = (s) => document.querySelector(s);
  const escape = (s) => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let timer = null, activity = null, lastFocus = null;
  const steps = [
    ["Look around", "Notice five things you can see. Take your time with their shapes or colors."],
    ["Notice contact", "Notice four comfortable points of contact, such as your feet on the floor or clothing against your arm."],
    ["Listen", "Notice three sounds, near or far. If listening is uncomfortable, look for three more colors instead."],
    ["Find something pleasant", "Notice two familiar smells, or picture two places you find comfortable. You can skip this step."],
    ["Finish gently", "Notice one thing that feels steady right now. Choose a small next step, such as a drink of water or reaching out to someone."]
  ];
  function stop() {
    clearInterval(timer);
    timer = null;
    activity = null;
  }
  function actions(html) { return `<div class="activity-actions">${html}</div>`; }
  function button(action, label, secondary = false) {
    return `<button type="button" class="button${secondary ? " secondary" : ""}" data-activity="${action}">${label}</button>`;
  }
  function clock(seconds) {
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }
  function open(resource) {
    stop();
    lastFocus = document.activeElement;
    const id = resource.id;
    let body = "";
    if (id === "breathing" || id === "study") {
      const breathing = id === "breathing";
      body = breathing
        ? `<p>Settle into a comfortable position. Follow the gentle pace only if it suits you; there is no breath holding. Stop if you feel dizzy or uncomfortable.</p><div class="activity-orbit"><div id="activity-circle">At your pace</div></div><p id="activity-phase" role="status">Ready for a one-minute pause</p>`
        : `<p>Choose one manageable task. The timer will stop at the end of your focus session, then you can start a five-minute break.</p><label class="field">My small task<input id="focus-task" maxlength="150" placeholder="For example, read two pages"></label><label class="field">Focus duration<select id="focus-duration"><option value="5">5 minutes</option><option value="15">15 minutes</option><option value="25">25 minutes</option></select></label><p id="activity-phase" role="status">Ready to focus</p>`;
      body += `<div class="activity-clock" id="activity-clock" role="timer">${breathing ? "01:00" : "05:00"}</div><progress id="activity-progress" max="100" value="0" aria-label="Session progress"></progress>${actions(button("start", "Start") + button("reset", "Reset", true))}<p class="muted">Closing this activity stops the timer. No alarms or notifications run after you leave.</p>`;
    } else if (id === "grounding") {
      body = `<p>Move through five optional steps at your own pace. Keep your eyes open if that feels better. Skip anything that does not suit you.</p><div id="ground-step"></div>`;
    } else if (id === "support") {
      body = `<p>Prepare a message to someone you trust. This builder stays on this page and does not send anything.</p><label class="field">Who would you like to contact?<input id="support-person" maxlength="80" placeholder="A friend, family member, or counselor"></label><label class="field">What would help?<select id="support-need"><option value="listen">Someone to listen</option><option value="company">Some company</option><option value="practical">Help with one practical task</option><option value="counselor">Time with a counselor</option></select></label>${button("draft", "Build my message")}<label class="field activity-result">Your message - edit it to sound like you<textarea id="support-draft" rows="5" maxlength="2000"></textarea></label>${actions(button("copy-message", "Copy message", true) + button("download-message", "Download", true) + button("counseling", "Request counseling", true))}<p class="muted">You decide whether and how to send it. If one person is unavailable, consider another trusted person.</p>`;
    } else if (id === "rest") {
      body = `<p>Make one realistic plan for a pause. Choose what feels useful today; this is not a checklist you have to finish.</p><fieldset class="activity-options"><legend>During my break, I want to...</legend>${["Put my screen aside", "Have water or a snack", "Stretch comfortably", "Sit quietly", "Do something I enjoy"].map((s,i)=>`<label><input type="checkbox" name="rest-choice" value="${escape(s)}" ${i===0?"checked":""}> ${s}</label>`).join("")}</fieldset><label class="field">When will I pause?<input id="rest-when" maxlength="120" placeholder="For example, after this lesson"></label><label class="field">For how long?<select id="rest-duration"><option>5 minutes</option><option>10 minutes</option><option>20 minutes</option></select></label>${button("rest-plan", "Create my rest plan")}<div id="rest-result" class="activity-result" aria-live="polite"></div>`;
    } else if (id === "external") {
      const links = [
        ["WHO: Doing What Matters in Times of Stress", "An illustrated guide with practical exercises and language editions.", "https://www.who.int/publications/i/item/9789240003927"],
        ["NHS: Breathing exercises for stress", "Instructions for comfortable, unforced breathing.", "https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/"],
        ["WHO: Mental health", "An overview and links to educational information.", "https://www.who.int/health-topics/mental-health"]
      ];
      body = `<p>Choose a learning resource. Each opens the publisher's website in a new tab; their privacy policy applies.</p><div class="learning-links">${links.map(([title,description,url])=>`<article><h3>${escape(title)}</h3><p>${escape(description)}</p><a class="button secondary" href="${url}" target="_blank" rel="noopener noreferrer">Open materials <span class="sr-only">(new tab)</span></a></article>`).join("")}</div>`;
    } else {
      const links = [...new Set([resource.url, ...(resource.body.match(/https:\/\/[^\s<>"']+/g) || [])])]
        .filter(url => typeof url === "string" && /^https:\/\//.test(url)).slice(0, 8);
      body = `<p class="resource-full-text">${escape(resource.body)}</p><div class="activity-actions">${links.map((url,i)=>`<a class="button secondary" href="${escape(url)}" target="_blank" rel="noopener noreferrer">Open material${links.length>1?" "+(i+1):""}</a>`).join("")}</div><label class="field activity-result">One thing I want to try<textarea id="resource-takeaway" rows="4" maxlength="2000" placeholder="Turn this resource into one small next step"></textarea></label>${button("download-takeaway", "Download my takeaway")}`;
    }
    modal(escape(resource.title), `<div class="resource-activity">${body}<p class="activity-feedback" id="activity-feedback" role="status"></p><small>Activity entries stay only while this panel is open. Downloads are saved only when you choose them.</small></div>`);
    activity = {id, running:false, remaining:id==="breathing"?60:300, total:id==="breathing"?60:300, phase:"focus", step:0, notes:[]};
    if (id === "grounding") showStep();
    if (id === "support") draft();
  }
  function feedback(text) { if (q("#activity-feedback")) q("#activity-feedback").textContent = text; }
  function paintTimer() {
    if (!activity) return;
    const elapsed = activity.total - activity.remaining;
    q("#activity-clock").textContent = clock(activity.remaining);
    q("#activity-progress").value = elapsed / activity.total * 100;
    if (activity.id === "breathing") {
      const inhale = elapsed % 10 < 4;
      q("#activity-circle").classList.toggle("inhale", activity.running && inhale);
      const label = activity.running ? (inhale ? "Breathe in gently" : "Breathe out gently") : "At your pace";
      q("#activity-circle").textContent = label;
      q("#activity-phase").textContent = activity.remaining === 0 ? "Your pause is complete. Return to your natural breathing." : activity.running ? label : "Paused - breathe naturally";
    }
  }
  function tick() {
    if (!activity?.running) return;
    activity.remaining = Math.max(0, Math.ceil((activity.deadline - Date.now()) / 1000));
    paintTimer();
    if (activity.remaining === 0) {
      activity.running = false;
      clearInterval(timer);
      paintTimer();
      const start = q('[data-activity="start"]');
      if (activity.id === "study") {
        q("#activity-phase").textContent = activity.phase === "focus" ? "Focus session finished. Take a comfortable break when you are ready." : "Break finished. Decide whether to continue or rest longer.";
        start.textContent = activity.phase === "focus" ? "Start 5-minute break" : "Start another focus session";
      } else start.textContent = "Start again";
    }
  }
  function startTimer() {
    if (activity.running) {
      tick();
      activity.running = false;
      clearInterval(timer);
      paintTimer();
      q('[data-activity="start"]').textContent = "Resume";
      if (activity.id === "study") q("#activity-phase").textContent = "Paused";
      return;
    }
    if (!activity.remaining) {
      if (activity.id === "study") activity.phase = activity.phase === "focus" ? "break" : "focus";
      activity.total = activity.id === "breathing" ? 60 : activity.phase === "break" ? 300 : Number(q("#focus-duration").value) * 60;
      activity.remaining = activity.total;
    }
    activity.running = true;
    activity.deadline = Date.now() + activity.remaining * 1000;
    q('[data-activity="start"]').textContent = "Pause";
    if (q("#focus-duration")) q("#focus-duration").disabled = true;
    if (activity.id === "study") q("#activity-phase").textContent = activity.phase === "focus" ? "One small task at a time" : "Break time - stretch, rest, or look away from the screen";
    paintTimer();
    clearInterval(timer);
    timer = setInterval(tick, 250);
  }
  function showStep() {
    const n = activity.step;
    q("#ground-step").innerHTML = n < steps.length
      ? `<p class="eyebrow">Step ${n+1} of 5</p><h3 tabindex="-1" id="ground-heading">${steps[n][0]}</h3><p>${steps[n][1]}</p><label class="field">Optional: what do you notice?<textarea id="ground-note" maxlength="500" rows="3">${escape(activity.notes[n] || "")}</textarea></label>${actions((n ? button("back","Back",true):"")+button("next",n===4?"Finish":"Next")+button("skip","Skip this step",true))}`
      : `<h3 tabindex="-1" id="ground-heading">You made a little space</h3><p>There is no right way to feel afterward. You can repeat the exercise, return to your day, or reach out for support.</p>${actions(button("ground-restart","Start again",true)+button("counseling","Find human support",true))}`;
    q("#ground-heading").focus();
  }
  function draft() {
    const person = q("#support-person").value.trim() || "there";
    const requests = {listen:"Could you listen for a little while? I do not need you to fix everything.", company:"Would you have some time to sit with me or take a short walk?", practical:"Could you help me choose one manageable next step?", counselor:"Could we arrange a time to talk about support options?"};
    q("#support-draft").value = `Hi ${person}, I have been finding things difficult lately. ${requests[q("#support-need").value]} Let me know when you have time.`;
  }
  function download(text, name) {
    if (!text.trim()) return feedback("Add something first, then try again.");
    const url = URL.createObjectURL(new Blob([text], {type:"text/plain;charset=utf-8"}));
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    feedback("Your download is ready. Keep it somewhere private if it contains personal details.");
  }
  document.addEventListener("click", async e => {
    const b = e.target.closest("[data-activity]");
    if (!b || !activity) return;
    const action = b.dataset.activity;
    if (action === "start") startTimer();
    if (action === "reset") {
      clearInterval(timer);
      activity.running = false; activity.phase = "focus";
      activity.total = activity.id === "breathing" ? 60 : Number(q("#focus-duration").value)*60;
      activity.remaining = activity.total;
      if (q("#focus-duration")) q("#focus-duration").disabled = false;
      paintTimer();
      q("#activity-phase").textContent = "Ready when you are";
      q('[data-activity="start"]').textContent = "Start";
    }
    if (["next","back","skip","ground-restart"].includes(action)) {
      if (q("#ground-note")) activity.notes[activity.step] = q("#ground-note").value;
      activity.step = action === "ground-restart" ? 0 : activity.step + (action === "back" ? -1 : 1);
      showStep();
    }
    if (action === "draft") draft();
    if (action === "copy-message") {
      const text = q("#support-draft").value;
      if (!text.trim()) return feedback("Write a message first.");
      try { await navigator.clipboard.writeText(text); feedback("Copied. Paste it into your preferred messaging app when you are ready."); }
      catch { q("#support-draft").select(); feedback("Select and copy the message manually using your device's copy command."); }
    }
    if (action === "download-message") download(q("#support-draft").value,"my-conversation-message.txt");
    if (action === "download-takeaway") download(q("#resource-takeaway").value,"my-resource-takeaway.txt");
    if (action === "counseling") { q("#modal").close(); navigate("appointments"); }
    if (action === "rest-plan") {
      const choices = [...document.querySelectorAll('[name="rest-choice"]:checked')].map(el=>el.value);
      if (!choices.length) return feedback("Choose at least one thing for your break.");
      activity.plan = `My rest plan\n\nWhen: ${q("#rest-when").value.trim() || "At my next comfortable stopping point"}\nDuration: ${q("#rest-duration").value}\n\n${choices.map(s=>"- "+s).join("\n")}\n\nI can adjust this plan if my needs change.`;
      q("#rest-result").innerHTML = `<h3>Your plan</h3><p class="resource-full-text">${escape(activity.plan)}</p>${button("download-plan","Download my plan",true)}<label class="rest-complete"><input type="checkbox" id="rest-complete"> I made time for this pause</label>`;
      feedback("Your plan is ready. Download it if you want to keep it after closing.");
    }
    if (action === "download-plan") download(activity.plan,"my-rest-plan.txt");
  });
  document.addEventListener("change", e => {
    if (e.target.id === "focus-duration" && activity?.id === "study" && !activity.running) {
      activity.remaining = activity.total = Number(e.target.value)*60; paintTimer();
    }
    if (e.target.id === "rest-complete") feedback(e.target.checked ? "You made some space for yourself. You can take another pause whenever you need one." : "");
  });
  document.addEventListener("DOMContentLoaded", () => {
    q("#modal").addEventListener("close", () => { stop(); if (lastFocus?.isConnected) lastFocus.focus(); });
  });
  return {open, stop};
})();
