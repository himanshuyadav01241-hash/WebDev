const CFG = { ...DEFAULTS.settings };
let PLAN_NAMES = [];

/* Menu */
const nav = $("#nav"), mb = $("#menu");
mb.onclick = () => mb.setAttribute("aria-expanded", nav.classList.toggle("open"));
nav.addEventListener("click", e => { if (e.target.tagName === "A") { nav.classList.remove("open"); mb.setAttribute("aria-expanded", "false"); } });
$("#year").textContent = new Date().getFullYear();

/* Responsive preview: real width, scaled to fit any screen */
const r = $("#w"), o = $("#wo"), sc = $("#screen"), stage = $(".stage");
let timer;
function fit() {
  const s = Math.min(1, (stage.clientWidth - 32) / +r.value);
  sc.style.setProperty("--s", s);
  stage.style.height = (sc.offsetHeight * s + 40) + "px";
}
function setW(v, user) {
  if (user) clearInterval(timer);
  v = Math.max(320, Math.min(1200, v));
  r.value = v; sc.style.setProperty("--w", v + "px"); o.textContent = v + "px"; fit();
}
r.oninput = () => setW(+r.value, true);
$$(".sizes button").forEach(b => b.onclick = () => setW(+b.dataset.w, true));
addEventListener("resize", fit);
if (window.ResizeObserver) new ResizeObserver(fit).observe(sc);
setW(375);
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  setTimeout(() => {
    let v = 375; const end = innerWidth < 700 ? 768 : 1100;
    timer = setInterval(() => { v += 8; if (v >= end) { v = end; clearInterval(timer); } setW(v); }, 16);
  }, 700);
}

/* Content (from Firebase when set up, otherwise the starter content) */
function applyCfg() {
  $$("[data-wa]").forEach(a => a.href = "https://wa.me/" + CFG.whatsapp);
  $$("[data-mail]").forEach(a => { a.href = "mailto:" + CFG.email; a.textContent = CFG.email; });
}
function renderPlans(plans) {
  PLAN_NAMES = plans.map(p => p.name);
  $("#plans").replaceChildren(...plans.map(p => h("div", { class: "plan" + (p.highlight ? " pick" : "") },
    p.highlight ? h("span", { class: "tag" }, "Recommended") : null,
    h("h3", {}, p.name), h("div", { class: "price" }, p.price),
    h("ul", {}, (p.features || []).map(f => h("li", {}, f))),
    h("a", { class: "btn" + (p.highlight ? "" : " ghost"), href: "#contact", onclick: () => { $("#plan").value = p.name; } }, "Choose " + p.name))));
  $("#plan").replaceChildren(...[...PLAN_NAMES, "Not sure yet"].map(n => h("option", {}, n)));
}
function renderProjects(list) {
  $("#projects").replaceChildren(...list.map(p => h("article", {},
    h("div", { class: "shot", style: `--a:${safeColor(p.colorA, "#FFD27A")};--b:${safeColor(p.colorB, "#FF9F6B")}` }),
    h("h3", {}, p.title), h("p", {}, p.desc))));
}
applyCfg();
(async function load() {
  let plans = DEFAULTS.plans, projects = DEFAULTS.projects;
  if (fb) {
    try {
      const [s, p, j] = await Promise.all([
        fb.db.doc("settings/site").get(),
        fb.db.collection("plans").orderBy("order").get(),
        fb.db.collection("projects").orderBy("order").get()]);
      if (s.exists) Object.assign(CFG, s.data());
      if (/x/i.test(CFG.whatsapp || "x")) CFG.whatsapp = DEFAULTS.settings.whatsapp;
      if (!p.empty) plans = p.docs.map(d => d.data());
      if (!j.empty) projects = j.docs.map(d => d.data());
    } catch (e) { console.warn(e); }
  }
  renderPlans(plans); renderProjects(projects); applyCfg();
})();

/* Enquiry form: saved to Firebase, with a WhatsApp backup link */
$("#quote").onsubmit = async e => {
  e.preventDefault();
  const f = new FormData(e.target), btn = e.target.querySelector("button"), msg = $("#formMsg");
  const d = { name: f.get("name").trim(), biz: f.get("biz").trim(), plan: f.get("plan"), msg: f.get("msg").trim(), contact: f.get("contact").trim(), status: "new" };
  const text = `Hi ${CFG.name}, I'm ${d.name} (${d.contact}). Business: ${d.biz}. Package: ${d.plan}. ${d.msg}`;
  const wa = h("a", { href: "https://wa.me/" + CFG.whatsapp + "?text=" + encodeURIComponent(text), target: "_blank", rel: "noopener" }, "Message me on WhatsApp too");
  btn.disabled = true;
  try {
    if (!fb) throw new Error("no firebase");
    await fb.db.collection("enquiries").add({ ...d, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    msg.replaceChildren("Thanks, your enquiry is sent. I will contact you soon. ", wa);
    e.target.reset();
  } catch (err) {
    console.error("Enquiry not saved:", err);
    msg.replaceChildren("Your enquiry could not be saved online. Please send it here instead: ", wa);
  }
  btn.disabled = false;
};
