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

/* Rendering */
function applyCfg() {
  $$("[data-wa]").forEach(a => a.href = "https://wa.me/" + CFG.whatsapp);
  $$("[data-watext]").forEach(a => a.textContent = "WhatsApp +" + String(CFG.whatsapp).replace(/^(\d{2})(\d{5})(\d+)$/, "$1 $2 $3"));
  $$("[data-mail]").forEach(a => { a.href = "mailto:" + CFG.email; a.textContent = CFG.email; });
}
function renderPlans(plans) {
  PLAN_NAMES = plans.map(p => p.name);
  const sel = $("#plan"), keep = sel.value;
  $("#plans").replaceChildren(...plans.map(p => h("div", { class: "plan" + (p.highlight ? " pick" : "") },
    p.highlight ? h("span", { class: "tag" }, "Recommended") : null,
    h("h3", {}, p.name), h("div", { class: "price" }, p.price),
    h("ul", {}, (p.features || []).map(f => h("li", {}, f))),
    h("a", { class: "btn" + (p.highlight ? "" : " ghost"), href: "#contact", onclick: () => { sel.value = p.name; } }, "Choose " + p.name))));
  const names = [...PLAN_NAMES, "Not sure yet"];
  sel.replaceChildren(...names.map(n => h("option", {}, n)));
  if (names.includes(keep)) sel.value = keep;
}
function renderProjects(list) {
  $("#projects").replaceChildren(...list.map(p => h("article", {},
    h("div", { class: "shot", style: `--a:${safeColor(p.colorA, "#FFD27A")};--b:${safeColor(p.colorB, "#FF9F6B")}` }),
    h("h3", {}, p.title), h("p", {}, p.desc))));
}

/* Live content: admin changes appear here instantly (cached copy shows first for a fast start) */
const CACHE = "insane_content_v1", DEF = { cfg: {}, plans: DEFAULTS.plans, projects: DEFAULTS.projects };
let painted = false;
function paint(c) {
  Object.assign(CFG, DEFAULTS.settings, c.cfg || {});
  if (!CFG.whatsapp || /x/i.test(CFG.whatsapp)) CFG.whatsapp = DEFAULTS.settings.whatsapp;
  applyCfg(); renderPlans(c.plans); renderProjects(c.projects); painted = true;
}
if (!fb) paint(DEF);
else {
  let cached = null; try { cached = JSON.parse(localStorage.getItem(CACHE)); } catch (e) {}
  if (cached && cached.plans) paint(cached); else setTimeout(() => { if (!painted) paint(DEF); }, 2500);
  const st = { cfg: null, plans: null, projects: null };
  const update = () => {
    if (!st.cfg || !st.plans || !st.projects) return;
    const c = { cfg: st.cfg, plans: st.plans.length ? st.plans : DEF.plans, projects: st.projects.length ? st.projects : DEF.projects };
    paint(c); try { localStorage.setItem(CACHE, JSON.stringify(c)); } catch (e) {}
  };
  const fail = e => { console.warn(e); if (!painted) paint(DEF); };
  fb.db.ref("settings").on("value", s => { st.cfg = s.val() || {}; update(); }, fail);
  fb.db.ref("plans").on("value", s => { st.plans = toList(s.val()); update(); }, fail);
  fb.db.ref("projects").on("value", s => { st.projects = toList(s.val()); update(); }, fail);
}

/* Enquiry form: saved to the database, with a WhatsApp backup link */
$("#quote").onsubmit = async e => {
  e.preventDefault();
  const f = new FormData(e.target), btn = e.target.querySelector("button"), msg = $("#formMsg"), label = btn.textContent;
  const d = { name: f.get("name").trim(), contact: f.get("contact").trim(), biz: f.get("biz").trim(), plan: f.get("plan"), msg: f.get("msg").trim(), status: "new" };
  const text = `Hi ${CFG.name}, I'm ${d.name} (${d.contact}). Business: ${d.biz}. Package: ${d.plan}. ${d.msg}`;
  const wa = h("a", { href: "https://wa.me/" + CFG.whatsapp + "?text=" + encodeURIComponent(text), target: "_blank", rel: "noopener" }, "Message on WhatsApp too");
  btn.disabled = true; btn.textContent = "Sending...";
  try {
    if (!fb) throw new Error("not-configured");
    await withTimeout(fb.db.ref("enquiries").push().set({ ...d, createdAt: TS() }), 8000);
    msg.replaceChildren("Thanks, your enquiry is sent. I will contact you soon. ", wa);
    e.target.reset();
  } catch (err) {
    console.error("Enquiry not saved:", err);
    msg.replaceChildren("Your enquiry could not be saved online. Please send it here instead: ", wa,
      h("small", { style: "display:block;margin-top:6px;opacity:.7" }, "Error: " + (err.code || err.message)));
  }
  btn.disabled = false; btn.textContent = label;
};
