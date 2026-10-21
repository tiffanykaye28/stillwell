/* Apply before styles load to avoid a light flash when dark mode is selected. */
(() => {
  "use strict";
  const key = "stillwell-appearance";
  const choices = ["light", "dark", "system"];
  const system = window.matchMedia("(prefers-color-scheme: dark)");
  let preference = "system";
  try {
    const saved = localStorage.getItem(key);
    if (choices.includes(saved)) preference = saved;
  } catch {}
  function apply() {
    const theme =
      preference === "system"
        ? system.matches
          ? "dark"
          : "light"
        : preference;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelectorAll('input[name="appearance"]').forEach((input) => {
      input.checked = input.value === preference;
    });
  }
  apply();
  window.mountAppearance = () => {
    const target = document.querySelector(".topbar .top-right");
    const template = document.getElementById("appearance-template");
    if (target && template && !target.querySelector(".appearance-options")) {
      target.prepend(template.content.cloneNode(true));
    }
    apply();
  };
  document.addEventListener("DOMContentLoaded", apply);
  system.addEventListener("change", apply);
  document.addEventListener("change", (event) => {
    if (
      !event.target.matches('input[name="appearance"]') ||
      !choices.includes(event.target.value)
    )
      return;
    preference = event.target.value;
    try {
      localStorage.setItem(key, preference);
    } catch {}
    apply();
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== key && event.key !== null) return;
    preference = choices.includes(event.newValue) ? event.newValue : "system";
    apply();
  });
})();
