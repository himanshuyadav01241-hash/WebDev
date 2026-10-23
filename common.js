/* Shared code: starter content, Firebase start-up, small DOM helper */
const DEFAULTS = {
  settings: { name: "Himanshu", whatsapp: "919034830336", email: ADMIN_EMAIL },
  plans: [
    { name: "Starter", price: "₹7,999", order: 1, highlight: false, features: ["1 to 3 pages", "Works on phone, tablet and desktop", "Contact form and WhatsApp button", "Delivered in 5 to 7 days"] },
    { name: "Business", price: "₹19,999", order: 2, highlight: true, features: ["Up to 8 pages", "Admin dashboard to edit content", "Basic Google search setup", "Domain and hosting setup", "30 days of support"] },
    { name: "Custom", price: "Let's talk", order: 3, highlight: false, features: ["Online stores and payments", "Booking and customer logins", "Priced after a short call"] }
  ],
  projects: [
    { title: "Neighbourhood bakery", desc: "Online menu with WhatsApp ordering.", colorA: "#FFD27A", colorB: "#FF9F6B", order: 1 },
    { title: "Dental clinic", desc: "Services list and appointment requests.", colorA: "#8FD3E8", colorB: "#5E8BFF", order: 2 },
    { title: "Auto parts store", desc: "Searchable catalogue with an admin dashboard.", colorA: "#B9E3B0", colorB: "#4FA37A", order: 3 }
  ]
};

let fb = null;
try {
  if (typeof firebase !== "undefined" && FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.startsWith("PASTE")) {
    firebase.initializeApp(FIREBASE_CONFIG);
    fb = { db: firebase.firestore(), auth: firebase.auth ? firebase.auth() : null };
  }
} catch (e) { console.warn("Firebase not started:", e); }

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
/* h("div",{class:"x"}, child, "text") - text is always inserted as plain text (safe) */
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el[k] = v;
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  kids.flat().filter(c => c != null && c !== false).forEach(c => el.append(c));
  return el;
};
const safeColor = (c, d) => /^#[0-9a-f]{6}$/i.test(c || "") ? c : d;
