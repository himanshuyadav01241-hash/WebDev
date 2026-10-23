const toast = m => { const t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 3500); };
const F = (label, input) => h("label", { class: "f" }, label, input);
const inp = (v, a = {}) => { const i = h("input", a); i.value = v ?? ""; return i; };
const area = (v, rows) => { const t = h("textarea", { rows }); t.value = v ?? ""; return t; };
const guard = fn => async () => { try { await fn(); } catch (e) { toast(e.message); } };
let started = false, enq = [];

/* Sign in: only ADMIN_EMAIL (Google, verified) gets in */
if (!fb) {
  $("#login").hidden = false; $("#gbtn").disabled = true;
  $("#loginMsg").textContent = "Firebase is not set up yet. Paste your config into firebase-config.js.";
} else {
  $("#gbtn").onclick = () => fb.auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e => $("#loginMsg").textContent = e.message);
  $("#out").onclick = () => fb.auth.signOut();
  fb.auth.onAuthStateChanged(u => {
    const ok = u && u.emailVerified && u.email && u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    $("#login").hidden = !!ok; $("#app").hidden = !ok; $("#who").hidden = !ok;
    if (ok) start();
    else if (u) { $("#loginMsg").textContent = "This account is not allowed."; fb.auth.signOut(); }
  });
}
$$(".tabs button").forEach(b => b.onclick = () => {
  $$(".tabs button").forEach(x => x.setAttribute("aria-selected", x === b));
  $$(".panel").forEach(p => p.hidden = p.id !== b.dataset.t);
});

function start() {
  if (started) return; started = true;
  fb.db.collection("enquiries").orderBy("createdAt", "desc").onSnapshot(s => { enq = s.docs.map(d => ({ id: d.id, ...d.data() })); renderEnq(); }, e => toast(e.message));
  loadList("plans", "#planList", planCard); loadList("projects", "#projList", projCard); loadSettings();
}
async function loadList(col, box, maker) {
  const s = await fb.db.collection(col).orderBy("order").get();
  $(box).replaceChildren(...s.docs.map(d => maker({ id: d.id, ...d.data() })));
}

/* Enquiries */
const when = e => e.createdAt && e.createdAt.toDate ? e.createdAt.toDate().toLocaleString() : "";
function renderEnq() {
  const f = $("#fstat").value, list = enq.filter(e => !f || e.status === f);
  $("#newCount").textContent = enq.filter(e => e.status === "new").length;
  $("#enqList").replaceChildren(...(list.length ? list.map(enqCard) : [h("p", { class: "empty" }, "No enquiries here yet. They appear as soon as someone sends the form.")]));
}
function enqCard(e) {
  const c = e.contact || "", digits = c.replace(/\D/g, "");
  const st = h("select", { onchange: guard(() => fb.db.doc("enquiries/" + e.id).update({ status: st.value })) },
    ...["new", "contacted", "done"].map(s => h("option", { value: s, selected: s === e.status }, s)));
  return h("article", { class: "card enq " + e.status },
    h("h3", {}, e.name), 
    h("div", { class: "meta" }, h("span", {}, "Business: " + e.biz), h("span", {}, "Package: " + e.plan), h("span", {}, "Contact: " + c), h("span", {}, when(e))),
    e.msg ? h("p", { class: "m" }, e.msg) : null,
    h("div", { class: "row" }, st,
      digits.length >= 10 ? h("a", { class: "btn sm", target: "_blank", rel: "noopener", href: "https://wa.me/" + (digits.length === 10 ? "91" + digits : digits) }, "WhatsApp") : null,
      c.includes("@") ? h("a", { class: "btn ghost sm", href: "mailto:" + c }, "Email") : null,
      h("button", { class: "btn ghost sm danger", onclick: guard(async () => { if (confirm("Delete this enquiry?")) await fb.db.doc("enquiries/" + e.id).delete(); }) }, "Delete")));
}
$("#fstat").onchange = renderEnq;
$("#csv").onclick = () => {
  const q = v => { v = String(v ?? ""); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
  const rows = [["Date", "Name", "Business", "Package", "Contact", "Message", "Status"], ...enq.map(e => [when(e), e.name, e.biz, e.plan, e.contact, e.msg, e.status])];
  const a = h("a", { href: URL.createObjectURL(new Blob([rows.map(r => r.map(q).join(",")).join("\n")], { type: "text/csv" })), download: "enquiries.csv" });
  a.click();
};

/* Prices */
function planCard(p) {
  const n = inp(p.name), pr = inp(p.price), o = inp(p.order ?? 99, { type: "number" }), ft = area((p.features || []).join("\n"), 5);
  const hl = h("input", { type: "checkbox" }); hl.checked = !!p.highlight;
  const card = h("div", { class: "card" },
    h("div", { class: "grid2" }, F("Plan name", n), F("Price (shown as typed)", pr), F("Order", o)),
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
  const card = h("div", { class: "card" },
    h("div", { class: "grid2" }, F("Project name", t), F("Short description", d), F("Order", o), F("Colour 1", a), F("Colour 2", b)),
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

/* Settings and starter content */
async function loadSettings() {
  const s = await fb.db.doc("settings/site").get(), v = { ...DEFAULTS.settings, ...(s.exists ? s.data() : {}) };
  $("#sName").value = v.name; $("#sWa").value = v.whatsapp; $("#sMail").value = v.email;
}
$("#saveSet").onclick = guard(async () => {
  await fb.db.doc("settings/site").set({ name: $("#sName").value.trim(), whatsapp: $("#sWa").value.replace(/\D/g, ""), email: $("#sMail").value.trim() }, { merge: true });
  toast("Settings saved");
});
$("#seed").onclick = guard(async () => {
  if ($("#planList").children.length || $("#projList").children.length) return toast("You already have prices or projects. Edit them in their tabs.");
  const b = fb.db.batch();
  b.set(fb.db.doc("settings/site"), DEFAULTS.settings, { merge: true });
  DEFAULTS.plans.forEach(p => b.set(fb.db.collection("plans").doc(), p));
  DEFAULTS.projects.forEach(p => b.set(fb.db.collection("projects").doc(), p));
  await b.commit();
  await Promise.all([loadList("plans", "#planList", planCard), loadList("projects", "#projList", projCard), loadSettings()]);
  toast("Starter content added");
});
