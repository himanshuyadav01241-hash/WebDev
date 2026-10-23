const toast = m => { const t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 4000); };
const errText = e => e && e.code === "permission-denied"
  ? "Permission denied. Publish firestore.rules in Firebase (Firestore > Rules) and sign in with the admin email."
  : (e && e.message) || String(e);
const guard = fn => async () => { try { await fn(); } catch (e) { console.error(e); toast(errText(e)); } };
const F = (label, input) => h("label", { class: "f" }, label, input);
const inp = (v, a = {}) => { const i = h("input", a); i.value = v ?? ""; return i; };
const area = (v, rows) => { const t = h("textarea", { rows }); t.value = v ?? ""; return t; };
const ts = () => firebase.firestore.FieldValue.serverTimestamp();
let started = false, enq = [], filter = "";

/* Sign in: only ADMIN_EMAIL (verified Google account) gets in */
if (!fb) {
  $("#login").hidden = false; $("#gbtn").disabled = true;
  $("#loginMsg").textContent = "Firebase is not set up yet. Check firebase-config.js.";
} else {
  $("#gbtn").onclick = () => fb.auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e => $("#loginMsg").textContent = e.message);
  $("#out").onclick = () => fb.auth.signOut();
  fb.auth.onAuthStateChanged(u => {
    const ok = u && u.emailVerified && u.email && u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    $("#login").hidden = !!ok; $("#app").hidden = !ok;
    if (ok) start();
    else if (u) { $("#loginMsg").textContent = "This account is not allowed."; fb.auth.signOut(); }
  });
}
$$(".menu button").forEach(b => b.onclick = () => {
  $$(".menu button").forEach(x => x.setAttribute("aria-current", x === b));
  $$(".panel").forEach(p => p.hidden = p.id !== b.dataset.t);
  scrollTo(0, 0);
});

async function seed() {
  const b = fb.db.batch();
  b.set(fb.db.doc("settings/site"), { ...DEFAULTS.settings, seeded: true }, { merge: true });
  DEFAULTS.plans.forEach(p => b.set(fb.db.collection("plans").doc(), p));
  DEFAULTS.projects.forEach(p => b.set(fb.db.collection("projects").doc(), p));
  await b.commit();
}
async function start() {
  if (started) return; started = true;
  try {
    const s = await fb.db.doc("settings/site").get();
    if (!s.exists) { await seed(); toast("Your starter prices and projects were added. Edit them in the Prices tab."); }
    else if (/x/i.test(s.data().whatsapp || "x")) await fb.db.doc("settings/site").set({ whatsapp: DEFAULTS.settings.whatsapp }, { merge: true });
  } catch (e) { toast(errText(e)); }
  fb.db.collection("enquiries").orderBy("createdAt", "desc").onSnapshot(s => { enq = s.docs.map(d => ({ id: d.id, ...d.data() })); renderEnq(); }, e => toast(errText(e)));
  loadList("plans", "#planList", planCard); loadList("projects", "#projList", projCard); loadSettings();
}
async function loadList(col, box, maker) {
  try {
    const s = await fb.db.collection(col).orderBy("order").get();
    $(box).replaceChildren(...s.docs.map(d => maker({ id: d.id, ...d.data() })));
  } catch (e) { toast(errText(e)); }
}

/* Enquiries */
const when = e => e.createdAt && e.createdAt.toDate ? e.createdAt.toDate().toLocaleString() : "";
const ago = t => {
  if (!t || !t.toDate) return "just now";
  const s = (Date.now() - t.toDate()) / 1000;
  if (s < 60) return "just now"; if (s < 3600) return Math.floor(s / 60) + " min ago";
  if (s < 86400) return Math.floor(s / 3600) + " h ago"; return t.toDate().toLocaleDateString();
};
function renderEnq() {
  const n = k => enq.filter(e => (e.status || "new") === k).length;
  $("#stats").replaceChildren(...[["", "All", enq.length], ["new", "New", n("new")], ["contacted", "Contacted", n("contacted")], ["done", "Done", n("done")]]
    .map(([k, l, c]) => h("button", { class: "stat" + (filter === k ? " on" : ""), onclick: () => { filter = k; renderEnq(); } }, h("b", {}, String(c)), h("span", {}, l))));
  $("#badge").textContent = n("new"); $("#badge").hidden = !n("new");
  const list = enq.filter(e => !filter || (e.status || "new") === filter);
  $("#enqList").replaceChildren(...(list.length ? list.map(enqCard)
    : [h("p", { class: "empty card" }, "No enquiries here yet. They appear the moment someone sends the form on your website. Use Send test enquiry to check it works.")]));
}
function enqCard(e) {
  const c = e.contact || "", digits = c.replace(/\D/g, "");
  const st = h("select", { class: "st", onchange: guard(() => fb.db.doc("enquiries/" + e.id).update({ status: st.value })) },
    ...["new", "contacted", "done"].map(s => h("option", { value: s, selected: s === (e.status || "new") }, s)));
  const wa = "https://wa.me/" + (digits.length === 10 ? "91" + digits : digits) + "?text=" + encodeURIComponent(`Hi ${e.name}, thanks for your website enquiry. How can I help?`);
  return h("article", { class: "card enq " + (e.status || "new") },
    h("div", { class: "e-top" }, h("span", { class: "av" }, (e.name || "?").trim().charAt(0).toUpperCase()),
      h("div", { class: "e-who" }, h("h3", {}, e.name), h("small", { title: when(e) }, ago(e.createdAt))), st),
    h("div", { class: "chips" }, h("span", { class: "chip" }, e.plan), e.biz ? h("span", { class: "chip alt" }, e.biz) : null, h("span", { class: "chip alt" }, c)),
    e.msg ? h("p", { class: "m" }, e.msg) : null,
    h("div", { class: "row" },
      digits.length >= 10 ? h("a", { class: "btn sm", target: "_blank", rel: "noopener", href: wa }, "Reply on WhatsApp") : null,
      c.includes("@") ? h("a", { class: "btn ghost sm", href: "mailto:" + c }, "Email") : null,
      h("button", { class: "btn ghost sm danger", onclick: guard(async () => { if (confirm("Delete this enquiry?")) await fb.db.doc("enquiries/" + e.id).delete(); }) }, "Delete")));
}
$("#test").onclick = guard(async () => {
  await fb.db.collection("enquiries").add({ name: "Test customer", biz: "Test shop", plan: "Business", msg: "This is a test enquiry.", contact: "9876543210", status: "new", createdAt: ts() });
  toast("Test enquiry sent. It should appear below.");
});
$("#csv").onclick = () => {
  const q = v => { v = String(v ?? ""); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
  const rows = [["Date", "Name", "Business", "Package", "Contact", "Message", "Status"], ...enq.map(e => [when(e), e.name, e.biz, e.plan, e.contact, e.msg, e.status])];
  h("a", { href: URL.createObjectURL(new Blob([rows.map(r => r.map(q).join(",")).join("\n")], { type: "text/csv" })), download: "enquiries.csv" }).click();
};

/* Prices */
function planCard(p) {
  const n = inp(p.name), pr = inp(p.price), o = inp(p.order ?? 99, { type: "number" }), ft = area((p.features || []).join("\n"), 5);
  const hl = h("input", { type: "checkbox" }); hl.checked = !!p.highlight;
  const pn = h("b", {}, p.name || "New plan"), pp = h("span", {}, p.price || "");
  n.oninput = () => pn.textContent = n.value || "New plan"; pr.oninput = () => pp.textContent = pr.value;
  const card = h("div", { class: "card" }, h("div", { class: "dprev" }, pn, pp),
    h("div", { class: "grid2" }, F("Plan name", n), F("Price", pr), F("Order", o)),
    F("Features (one per line)", ft),
    h("label", { class: "chk" }, hl, "Mark as recommended"),
    h("div", { class: "row" },
      h("button", { class: "btn sm", onclick: guard(async () => {
        const d = { name: n.value.trim(), price: pr.value.trim(), order: +o.value || 99, highlight: hl.checked, features: ft.value.split("\n").map(s => s.trim()).filter(Boolean) };
        if (!d.name || !d.price) return toast("Name and price are required");
        if (p.id) await fb.db.doc("plans/" + p.id).set(d); else p.id = (await fb.db.collection("plans").add(d)).id;
        toast("Saved. Your website now shows this price.");
      }) }, "Save"),
      h("button", { class: "btn ghost sm danger", onclick: guard(async () => { if (!confirm("Delete this plan?")) return; if (p.id) await fb.db.doc("plans/" + p.id).delete(); card.remove(); }) }, "Delete")));
  return card;
}
$("#addPlan").onclick = () => $("#planList").append(planCard({}));

/* Projects */
function projCard(p) {
  const t = inp(p.title), d = inp(p.desc), a = inp(safeColor(p.colorA, "#FFD27A"), { type: "color" }), b = inp(safeColor(p.colorB, "#FF9F6B"), { type: "color" }), o = inp(p.order ?? 99, { type: "number" });
  const sw = h("div", { class: "sw" }), paint = () => sw.style.background = `linear-gradient(135deg,${a.value},${b.value})`;
  a.oninput = b.oninput = paint; paint();
  const card = h("div", { class: "card" }, sw,
    h("div", { class: "grid2" }, F("Project name", t), F("Short description", d), F("Colour 1", a), F("Colour 2", b), F("Order", o)),
    h("div", { class: "row" },
      h("button", { class: "btn sm", onclick: guard(async () => {
        const v = { title: t.value.trim(), desc: d.value.trim(), colorA: a.value, colorB: b.value, order: +o.value || 99 };
        if (!v.title) return toast("Project name is required");
        if (p.id) await fb.db.doc("projects/" + p.id).set(v); else p.id = (await fb.db.collection("projects").add(v)).id;
        toast("Saved");
      }) }, "Save"),
      h("button", { class: "btn ghost sm danger", onclick: guard(async () => { if (!confirm("Delete this project?")) return; if (p.id) await fb.db.doc("projects/" + p.id).delete(); card.remove(); }) }, "Delete")));
  return card;
}
$("#addProj").onclick = () => $("#projList").append(projCard({}));

/* Settings */
async function loadSettings() {
  try {
    const s = await fb.db.doc("settings/site").get(), v = { ...DEFAULTS.settings, ...(s.exists ? s.data() : {}) };
    if (/x/i.test(v.whatsapp || "x")) v.whatsapp = DEFAULTS.settings.whatsapp;
    $("#sName").value = v.name; $("#sWa").value = v.whatsapp; $("#sMail").value = v.email;
  } catch (e) { toast(errText(e)); }
}
$("#saveSet").onclick = guard(async () => {
  let wa = $("#sWa").value.replace(/\D/g, ""); if (wa.length === 10) wa = "91" + wa;
  await fb.db.doc("settings/site").set({ name: $("#sName").value.trim(), whatsapp: wa, email: $("#sMail").value.trim() }, { merge: true });
  $("#sWa").value = wa; toast("Settings saved");
});
