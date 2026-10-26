'use strict';

/* =========================================================
   Το πορτοφόλι μου — απλό εργαλείο διαχείρισης χρημάτων για νέους.
   Όλα τα δεδομένα μένουν στη συσκευή (localStorage).
   Τα κείμενα (Ελληνικά / Αγγλικά) είναι στο js/i18n.js.
   ========================================================= */

const STORE_KEY = 'ta-lefta-mou-v1';
const LANG_KEY = 'ta-lefta-mou-lang';
const INSTALL_KEY = 'ta-lefta-mou-install-hidden';
const NOTIFIED_KEY = 'ta-lefta-mou-notified';
const GOAL_NOTIFIED_KEY = 'ta-lefta-mou-goal-notified';
const TABS = ['income', 'recurring', 'pockets', 'goals', 'budget', 'expenses', 'trips'];

// Κατηγορίες εξόδων ταξιδιού (τα ονόματα είναι στο i18n.js)
const TRIP_CATS = [
  { id: 'transport', color: '#457b9d' },
  { id: 'stay', color: '#7b4cc2' },
  { id: 'food', color: '#e76f51' },
  { id: 'fun', color: '#2a9d8f' },
  { id: 'shopping', color: '#c0398f' },
  { id: 'other', color: '#8a9499' },
];

// Κατηγορίες καθημερινών εξόδων (τα ονόματα είναι στο i18n.js)
const CATS = [
  { id: 'super', color: '#2a9d8f' },
  { id: 'coffee', color: '#e9a03b' },
  { id: 'delivery', color: '#e76f51' },
  { id: 'transport', color: '#457b9d' },
  { id: 'shopping', color: '#c0398f' },
  { id: 'fun', color: '#7b4cc2' },
  { id: 'health', color: '#3aa95f' },
  { id: 'subs', color: '#3a86ff' },
  { id: 'gifts', color: '#d64545' },
  { id: 'home', color: '#8d7b68' },
  { id: 'other', color: '#8a9499' },
];
const FIXED_SLICE = { id: '__fixed', color: '#34495e' };
// Χρώματα για τις δικές τους κατηγορίες (πρώτα όσα δεν έχουν οι έτοιμες)
const CAT_COLORS = ['#0f766e', '#b45309', '#be185d', '#4d7c0f', '#1e40af', '#9333ea', '#ca8a04', '#0891b2',
  '#2a9d8f', '#e9a03b', '#e76f51', '#457b9d', '#c0398f', '#7b4cc2', '#3aa95f', '#3a86ff', '#d64545', '#8d7b68'];

const POCKET_COLORS = ['#2a9d8f', '#3a86ff', '#e9a03b', '#e76f51', '#7b4cc2', '#c0398f', '#3aa95f', '#457b9d', '#d64545', '#8d7b68'];
const POCKET_PRESETS = ['holidays', 'travel', 'health', 'emergency', 'car', 'studies', 'gifts', 'tech'];

// Επαναλαμβανόμενες πληρωμές (τα ονόματα είναι στο i18n.js)
const REC_TYPES = [
  { id: 'rent', color: '#8d7b68' },
  { id: 'power', color: '#e9a03b' },
  { id: 'water', color: '#3a86ff' },
  { id: 'sub', color: '#7b4cc2' },
  { id: 'insurance', color: '#2a9d8f' },
  { id: 'loan', color: '#d64545' },
  { id: 'other', color: '#8a9499' },
];
const REC_EVERY = [1, 2, 3, 6, 12];   // κάθε πόσους μήνες
const REC_REMIND = [0, 1, 2, 3, 5, 7]; // πόσες μέρες πριν

/* ---------- Γλώσσα ---------- */

let lang = 'el';
try { if (localStorage.getItem(LANG_KEY) === 'en') lang = 'en'; } catch (e) { /* δεν πειράζει */ }
let L = I18N[lang];
let eur = new Intl.NumberFormat(L.locale, { style: 'currency', currency: 'EUR' });

// t('key') ή t('key', ορίσματα…) για κείμενα που χρειάζονται ποσά/ονόματα
function t(key, ...args) {
  const v = L[key] ?? I18N.el[key];
  return typeof v === 'function' ? v(...args) : v;
}
function catName(id) {
  const custom = state.customCats.find((c) => c.id === id);
  return custom ? custom.name : (L.cats[id] || L.cats.other);
}

function setLang(next) {
  lang = next;
  L = I18N[lang];
  eur = new Intl.NumberFormat(L.locale, { style: 'currency', currency: 'EUR' });
  try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* δεν πειράζει */ }
  applyStaticTexts();
  render();
}

function applyStaticTexts() {
  document.documentElement.lang = lang;
  document.title = t('appName');
  const lb = $('#lang-btn');
  lb.textContent = t('otherLang');
  lb.setAttribute('aria-label', t('otherLangLabel'));
  lb.title = t('otherLangLabel');
  $('[data-action=prev-month]').setAttribute('aria-label', t('prevMonth'));
  $('[data-action=next-month]').setAttribute('aria-label', t('nextMonth'));
  $('.group-label').textContent = t('tabGroup');
  $('.tabs [data-tab=budget]').textContent = t('tabBudget');
  $('.tabs [data-tab=income]').textContent = t('tabIncome');
  $('.tabs [data-tab=recurring]').textContent = t('tabRecurring');
  $('.tabs [data-tab=pockets]').textContent = t('tabPockets');
  $('.tabs [data-tab=goals]').textContent = t('tabGoals');
  $('.tabs [data-tab=expenses]').textContent = t('tabExpenses');
  $('.tabs [data-tab=trips]').innerHTML = `<span class="tab-long">${esc(t('tabTrips'))}</span><span class="tab-short">${esc(t('tabTripsShort'))}</span>`;
  updateBadges();
}

/* ---------- Βοηθητικά ---------- */

const $ = (s) => document.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = (n) => String(n).padStart(2, '0');
const sum = (arr, f) => arr.reduce((a, x) => a + (f ? f(x) : x), 0);
const round2 = (n) => Math.round(n * 100) / 100;
const money = (n) => eur.format(n || 0);
// Ποσοστό του a στο b: «<1» για πολύ μικρά ποσά, ώστε να μη φαίνεται 0% ενώ ξόδεψες κάτι
const pctOf = (a, b) => { const p = (a / b) * 100; return p > 0 && p < 1 ? '<1' : String(Math.round(p)); };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const dot = (color) => `<span class="dot" style="background:${color}"></span>`;
const pocketColor = (p) => p.color || POCKET_COLORS[Math.max(0, state.pockets.indexOf(p)) % POCKET_COLORS.length];
const avatar = (p) => `<span class="avatar" style="background:${pocketColor(p)}">${esc((p.name || '?').charAt(0).toUpperCase())}</span>`;

// Δέχεται «12,50», «12.5», «1.200,50», «1,200.50», «1.200» (ελληνικά), «1,200» (αγγλικά), «1200»
function parseMoney(v) {
  let s = String(v ?? '').replace(/[\s€]/g, '');
  const hasComma = s.includes(','), hasDot = s.includes('.');
  if (hasComma && hasDot) {
    // ό,τι έρχεται τελευταίο είναι η υποδιαστολή
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (hasComma) {
    s = lang === 'en' && /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if (hasDot && lang === 'el' && /^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, ''); // τελεία χιλιάδων
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? round2(n) : NaN;
}
const moneyInputValue = (n) => (typeof n === 'number' ? (lang === 'el' ? String(n).replace('.', ',') : String(n)) : '');

const monthKey = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1);
const todayISO = () => { const d = new Date(); return monthKey(d) + '-' + pad(d.getDate()); };
function shiftMonth(key, n) { const [y, m] = key.split('-').map(Number); return monthKey(new Date(y, m - 1 + n, 1)); }
const monthIdx = (key) => +key.slice(5) - 1;
const monthName = (key) => L.months[monthIdx(key)] + ' ' + key.slice(0, 4);
const inMonth = (key) => L.inMonth(monthIdx(key));   // «τον Οκτώβριο» / «in October»
const ofMonth = (key) => L.ofMonth(monthIdx(key));   // «του Οκτωβρίου» / «for October»
const daysInMonth = (key) => { const [y, m] = key.split('-').map(Number); return new Date(y, m, 0).getDate(); };
function dayLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  if (iso === todayISO()) return t('today');
  const yest = new Date(); yest.setDate(yest.getDate() - 1);
  if (iso === monthKey(yest) + '-' + pad(yest.getDate())) return t('yesterday');
  const label = L.days[new Date(y, m - 1, d).getDay()] + ' ' + d + ' ' + L.monthsShort[m - 1];
  return y === new Date().getFullYear() ? label : label + ' ' + y;
}

let toastTimer;
function toast(msg, warn = false) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.toggle('warn', warn);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), warn ? 4500 : 2400);
}

/* ---------- Δεδομένα ---------- */

function emptyState() {
  return { income: { type: 'fixed', fixed: 0, monthly: {} }, fixed: [], recurring: [], pockets: [], expenses: [], customCats: [], goals: {}, trips: [], tripCustomCats: [] };
}
// Καθαρίζει δεδομένα (από τη συσκευή ή από αρχείο) ώστε να μη σπάσει η εφαρμογή
function normalize(data) {
  const s = emptyState();
  if (!data || typeof data !== 'object') return s;
  const num = (n) => (Number.isFinite(+n) ? +n : 0);
  const inc = data.income || {};
  s.income.type = inc.type === 'variable' ? 'variable' : 'fixed';
  s.income.fixed = num(inc.fixed);
  if (inc.monthly && typeof inc.monthly === 'object') {
    for (const [k, v] of Object.entries(inc.monthly)) if (/^\d{4}-\d{2}$/.test(k)) s.income.monthly[k] = num(v);
  }
  const arr = (a) => (Array.isArray(a) ? a.filter((x) => x && typeof x === 'object') : []);
  s.fixed = arr(data.fixed).map((f) => ({ id: f.id || uid(), name: String(f.name || ''), amount: num(f.amount) }));
  s.recurring = arr(data.recurring).filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.nextDue)).map((r) => ({
    id: r.id || uid(), type: REC_TYPES.some((x) => x.id === r.type) ? r.type : 'other', name: String(r.name || ''),
    amount: num(r.amount), nextDue: r.nextDue, day: num(r.day) || +r.nextDue.slice(8),
    every: REC_EVERY.includes(+r.every) ? +r.every : 1, remind: REC_REMIND.includes(+r.remind) ? +r.remind : 3,
    left: r.left === null || r.left === undefined || r.left === '' ? null : Math.max(0, Math.floor(num(r.left))),
    fixedId: r.fixedId || null,
  }));
  s.tripCustomCats = arr(data.tripCustomCats).filter((c) => c.id).map((c) => ({
    id: String(c.id), name: String(c.name || ''), color: String(c.color || CAT_COLORS[0]),
  }));
  const tripCatIds = new Set([...TRIP_CATS, ...s.tripCustomCats].map((c) => c.id));
  s.trips = arr(data.trips).map((tr) => ({
    id: tr.id || uid(), dest: String(tr.dest || ''), budget: num(tr.budget), created: num(tr.created), done: !!tr.done,
    expenses: arr(tr.expenses).filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date)).map((e) => ({
      id: e.id || uid(), date: e.date, amount: num(e.amount),
      cat: tripCatIds.has(e.cat) ? e.cat : 'other', note: String(e.note || ''), created: num(e.created),
    })),
  }));
  if (data.goals && typeof data.goals === 'object') {
    for (const [k, v] of Object.entries(data.goals)) if (num(v) > 0) s.goals[k] = num(v);
  }
  s.customCats = arr(data.customCats).filter((c) => c.id).map((c) => ({
    id: String(c.id), name: String(c.name || ''), color: String(c.color || CAT_COLORS[0]),
  }));
  s.pockets = arr(data.pockets).map((p) => ({
    id: p.id || uid(), name: String(p.name || ''), color: p.color, goal: num(p.goal), monthly: num(p.monthly),
    tx: arr(p.tx).map((x) => ({ ...x, id: x.id || uid(), amount: num(x.amount) })),
  }));
  s.expenses = arr(data.expenses).filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date)).map((e) => ({
    id: e.id || uid(), date: e.date, amount: num(e.amount), cat: String(e.cat || 'other'),
    note: String(e.note || ''), created: num(e.created),
  }));
  return s;
}
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (e) { /* χωρίς αποθήκευση — ξεκινάμε από την αρχή */ }
  return emptyState();
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { toast(t('saveFailed')); }
}

let state = load();
let cur = monthKey(new Date());
let pickedCat = null;       // κατηγορία στη γρήγορη καταχώρηση
let filterCat = null;       // φίλτρο λίστας εξόδων από το γράφημα
let showFixedInChart = false;
let editCats = false;
// Ιστορικό & αναζήτηση
let expView = 'month';      // 'month' ή 'history'
let histPeriod = 3;         // μήνες: 1, 3, 6, 12
let histQuery = '';
let histFrom = '', histTo = '';
let histLimit = 50;         // πόσα έξοδα φαίνονται στη λίστα πριν το «Δείξε περισσότερα»       // «Οι κατηγορίες μου»: πατώντας μια δική σου κατηγορία την αλλάζεις
let incomeYear = null;      // χρονιά στον πίνακα μηνών του μισθού (null = η χρονιά του μήνα που βλέπουμε)

const allCats = () => [...CATS, ...state.customCats];
const catById = (id) => id === FIXED_SLICE.id ? FIXED_SLICE : (allCats().find((c) => c.id === id) || CATS[CATS.length - 1]);

/* ---------- Υπολογισμοί ---------- */

function incomeFor(key) {
  if (state.income.type === 'fixed') return state.income.fixed > 0 ? state.income.fixed : null;
  const v = state.income.monthly[key];
  return v === undefined ? null : v;
}
const fixedTotal = () => sum(state.fixed, (f) => f.amount);
const savingsPlan = () => sum(state.pockets, (p) => p.monthly || 0);
const monthExpenses = (key) => state.expenses.filter((e) => e.date.startsWith(key));
const pocketBalance = (p) => round2(sum(p.tx, (x) => x.amount));

/* ---------- Εγκατάσταση σε κινητό / τάμπλετ ---------- */

let installPrompt = null; // Android / Chrome / Edge
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1); // iPadOS

// Άνοιξε τη σελίδα μέσα από Instagram/Facebook/TikTok κ.λπ.; Από εκεί δεν γίνεται εγκατάσταση
const isInApp = () => /Instagram|FBAN|FBAV|FB_IAB|Messenger|Line\/|TikTok|musical_ly|Snapchat|Twitter/i.test(navigator.userAgent);
const SHARE_ICON = `<svg class="share-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4M6 11H5v10h14V11h-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// Αν πατήσει «Όχι τώρα», η λωρίδα ξαναεμφανίζεται μετά από μία εβδομάδα
function installHidden() {
  try { const v = Number(localStorage.getItem(INSTALL_KEY)); return v > 0 && Date.now() - v < 7 * 864e5; } catch (e) { return false; }
}

// Λωρίδα «Κατέβασέ με!» κάτω από την πάνω μπάρα, σε όλες τις σελίδες, μέχρι να εγκατασταθεί
function renderInstallBar() {
  const bar = $('#install-bar');
  const show = !isStandalone() && /^https?:/.test(location.protocol) && !installHidden();
  bar.hidden = !show;
  if (!show) return;
  bar.innerHTML = `<div class="install-inner">
      <img src="icons/icon-192.png" alt="" class="install-icon" width="40" height="40">
      <div class="install-text"><b>${t('installTitle')}</b><small>${t('installSub')}</small></div>
      <button class="btn primary install-go" data-action="install">${t('installBtn')}</button>
      <button class="install-close" data-action="install-hide" aria-label="${t('notNow')}" title="${t('notNow')}">×</button>
    </div>`;
}

// Παράθυρο μόνο με πληροφορίες (π.χ. τα βήματα για iPhone)
function openInfo(title, html) {
  const dlg = $('#dlg');
  const form = $('#dlg-form');
  form.innerHTML = `<h2>${esc(title)}</h2>${html}
    <div class="dlg-actions"><span class="spacer"></span><button type="submit" class="btn primary">${t('ok')}</button></div>`;
  form.onclick = null;
  form.onsubmit = (e) => { e.preventDefault(); dlg.close(); };
  dlg.showModal();
}

function showInstallHelp() {
  let html;
  if (isInApp()) html = `<p>${t('inAppHelp')}</p>`;
  else if (isIOS()) {
    html = `<p>${t('iosIntro')}</p>
      <ol class="install-steps"><li>${t('iosStep1', SHARE_ICON)}</li><li>${t('iosStep2')}</li><li>${t('iosStep3')}</li></ol>`;
  } else html = `<p>${t('androidHelp')}</p>`;
  openInfo(t('installHelpTitle'), html);
}

/* ---------- Σελίδα: Ο μήνας μου ---------- */

function renderBudget() {
  const inc = incomeFor(cur);
  const fx = fixedTotal();
  const sv = savingsPlan();
  const free = (inc || 0) - fx - sv;
  const spent = sum(monthExpenses(cur), (e) => e.amount);
  const left = free - spent;

  let hero;
  if (inc === null) {
    hero = `<div class="card hero">
      <div class="hero-label">${t('startHere')}</div>
      <div class="hint">${esc(t('startHint', state.income.type === 'fixed', inMonth(cur)))}</div>
      <div class="btn-row"><button class="btn primary" data-tab="income">${t('goToIncome')}</button></div>
    </div>`;
  } else {
    const pct = free > 0 ? Math.min(100, (spent / free) * 100) : (spent > 0 ? 100 : 0);
    let msg = '', warn = false;
    if (free < 0) { msg = t('overCommitted', money(-free)); warn = true; }
    else if (left < 0) { msg = t('overBudget', money(-left)); warn = true; }
    else if (cur === monthKey(new Date())) {
      const daysLeft = daysInMonth(cur) - new Date().getDate() + 1;
      msg = t('perDay', money(left / daysLeft), daysLeft);
    }
    // Τι ποσοστό του μισθού έχει ήδη φύγει: μόνο τα μηνιαία έξοδα, και μαζί με τα πάγια
    const pctLine = inc > 0
      ? `<div class="hint-pct">${t('spentPct', pctOf(spent, inc), pctOf(spent + fx, inc))}</div>`
      : '';
    const hint = msg || pctLine ? `<div class="hint ${warn ? 'warn' : ''}">${msg ? `<div>${msg}</div>` : ''}${pctLine}</div>` : '';
    hero = `<div class="card hero">
      <div class="hero-label">${t('leftToSpend')}</div>
      <div class="hero-amount ${left < 0 ? 'neg' : ''}">${money(left)}</div>
      <div class="bar ${left < 0 ? 'over' : ''}"><i style="width:${pct}%"></i></div>
      <div class="hero-sub">${t('spentOf', money(spent), money(Math.max(free, 0)))}</div>
      ${hint}
      <div class="flow">
        <div><span>${t('flowIncome')}</span><b>${money(inc)}</b></div>
        <div><span>${t('flowFixed')}</span><b>${money(fx)}</b></div>
        <div><span>${t('flowSavings')}</span><b>${money(sv)}</b></div>
        <div class="total"><span>${t('flowFree')}</span><b>${money(free)}</b></div>
      </div>
    </div>`;
  }

  const pocketRows = state.pockets.filter((p) => p.monthly > 0).map((p) =>
    `<div class="row">${dot(pocketColor(p))}<span class="name">${esc(p.name)}</span>
      <span class="amt">${money(p.monthly)}</span></div>`).join('');

  $('#page-budget').innerHTML = `
    ${remindersCard()}
    ${goalsWarnCard()}
    ${hero}
    <div class="card">
      <div class="card-head"><h2>${t('savingsMonthly')}</h2>
        <button class="link-btn" data-tab="pockets">${t('toPockets')}</button></div>
      ${pocketRows ? `<div class="list">${pocketRows}</div>
        <div class="list-total"><span>${t('total')}</span><span>${money(sv)}</span></div>`
        : `<div class="empty">${t('noPockets')}</div>`}
    </div>
    <div class="card">
      <h2>${t('backup')}</h2>
      <p class="muted" style="margin:0 0 4px;font-size:.9rem">${t('backupText')}</p>
      <div class="btn-row">
        <button class="btn small" data-action="export">${t('exportBtn')}</button>
        <button class="btn small" data-action="import">${t('importBtn')}</button>
        <button class="btn small danger" data-action="reset">${t('resetBtn')}</button>
      </div>
    </div>`;
}

/* ---------- Σελίδα: Μισθοδοσία - Πάγια έξοδα ---------- */

function renderIncome() {
  const isFixed = state.income.type === 'fixed';
  let incomeBody;
  if (isFixed) {
    incomeBody = `<label class="field"><span>${t('earnEachMonth')}</span>
      <input type="text" inputmode="decimal" class="money-input" data-bind="income-fixed"
        placeholder="${t('egSalary')}" value="${state.income.fixed > 0 ? moneyInputValue(state.income.fixed) : ''}"></label>`;
  } else {
    // Όλοι οι μήνες της χρονιάς, ο καθένας με το δικό του ποσό
    const year = incomeYear ?? +cur.slice(0, 4);
    const keys = L.months.map((_, i) => `${year}-${pad(i + 1)}`);
    const yearTotal = sum(keys, (k) => state.income.monthly[k] || 0);
    const rows = keys.map((k, i) => `<label class="month-row ${k === cur ? 'cur' : ''}">
        <span>${L.months[i]}</span>
        <input type="text" inputmode="decimal" enterkeyhint="next" class="money-input" data-bind="income-month" data-month="${k}"
          placeholder="—" value="${moneyInputValue(state.income.monthly[k])}"></label>`).join('');
    incomeBody = `<p class="muted" style="margin:0 0 10px;font-size:.9rem">${t('variableHint')}</p>
      <div class="year-nav">
        <button class="icon-btn" data-action="income-year" data-dir="-1" aria-label="${year - 1}">‹</button>
        <b>${year}</b>
        <button class="icon-btn" data-action="income-year" data-dir="1" aria-label="${year + 1}">›</button>
      </div>
      <div class="month-grid">${rows}</div>
      <div class="list-total"><span>${t('yearTotal', year)}</span><span id="year-total">${money(yearTotal)}</span></div>`;
  }

  const fx = fixedTotal();
  const fixedRows = state.fixed.length
    ? state.fixed.map((f) => `<button class="row" data-action="edit-fixed" data-id="${f.id}">
        <span class="name">${esc(f.name)}</span>
        <span class="amt">${money(f.amount)}</span></button>`).join('')
    : `<div class="empty">${t('fixedEmpty')}</div>`;

  const inc = incomeFor(cur);
  const afterFixed = inc === null ? '' : `<div class="card hero span-2">
      <div class="hero-label">${t('afterFixed')}${isFixed ? '' : ' · ' + esc(monthName(cur))}</div>
      <div class="hero-amount ${inc - fx < 0 ? 'neg' : ''}">${money(inc - fx)}</div>
      <div class="flow">
        <div><span>${t('flowIncome')}</span><b>${money(inc)}</b></div>
        <div class="total"><span>${t('flowFixed')}</span><b>${money(fx)}</b></div>
      </div>
    </div>`;

  $('#page-income').innerHTML = `
    <div class="card ${isFixed ? '' : 'span-2'}">
      <h2>${t('salary')}</h2>
      <div class="seg">
        <button class="${isFixed ? 'active' : ''}" data-action="income-type" data-type="fixed">${t('fixedType')}</button>
        <button class="${!isFixed ? 'active' : ''}" data-action="income-type" data-type="variable">${t('variableType')}</button>
      </div>
      ${incomeBody}
    </div>
    <div class="card ${isFixed ? '' : 'span-2'}">
      <div class="card-head"><h2>${t('fixedCosts')}</h2>
        <button class="btn small primary" data-action="add-fixed">${t('add')}</button></div>
      <div class="list">${fixedRows}</div>
      ${state.fixed.length ? `<div class="list-total"><span>${t('total')}</span><span>${money(fx)}</span></div>` : ''}
    </div>
    ${afterFixed}`;
}

/* ---------- Σελίδα: Επαναλαμβανόμενες πληρωμές ---------- */

const recType = (id) => REC_TYPES.find((x) => x.id === id) || REC_TYPES[REC_TYPES.length - 1];
const recName = (r) => r.name || L.recTypes[r.type];
const recActive = (r) => r.left !== 0;   // οι δόσεις τελείωσαν → ολοκληρώθηκε

function daysUntil(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((new Date(y, m - 1, d) - today) / 86400000);
}
// +n μήνες κρατώντας την ίδια μέρα (31 → 30/28 όταν ο μήνας είναι μικρότερος)
function addMonthsKeepDay(iso, n, day) {
  const [y, m] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1 + n, 1);
  return monthKey(dt) + '-' + pad(Math.min(day, daysInMonth(monthKey(dt))));
}
const monthDiff = (a, b) => (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7));

// Πέφτει πληρωμή μέσα σε αυτόν τον μήνα;
function recHitsMonth(r, key) {
  if (!recActive(r) && monthDiff(r.nextDue, key) >= 0) return false;
  const diff = monthDiff(r.nextDue.slice(0, 7), key);
  if (Math.abs(diff) % r.every !== 0) return false;
  return diff < 0 || r.left === null || diff / r.every < r.left;
}

function recStatus(r) {
  if (!recActive(r)) return { text: t('recDone'), cls: 'done' };
  const n = daysUntil(r.nextDue);
  if (n < 0) return { text: t('overdue', -n), cls: 'over' };
  const soon = n <= r.remind;
  if (n === 0) return { text: t('dueToday'), cls: 'soon' };
  if (n === 1) return { text: t('dueTomorrow'), cls: soon ? 'soon' : '' };
  if (soon) return { text: t('dueIn', n), cls: 'soon' };
  return { text: t('dueOn', isoToText(r.nextDue)), cls: '' };
}

// Ό,τι λήγει μέσα στις μέρες υπενθύμισης ή έχει ήδη λήξει
const recDueSoon = () => state.recurring
  .filter((r) => recActive(r) && daysUntil(r.nextDue) <= r.remind)
  .sort((a, b) => a.nextDue.localeCompare(b.nextDue));

function recRow(r) {
  const st = recStatus(r);
  const c = recType(r.type);
  return `<div class="rec-item ${st.cls}">
      <div class="rec-top">
        <span class="avatar small" style="background:${c.color}">${esc(recName(r).charAt(0).toUpperCase())}</span>
        <div class="rec-info"><b>${esc(recName(r))}</b>
          <small>${esc(L.recTypes[r.type])} · ${esc(L.every[r.every])}${r.left ? ' · ' + esc(t('leftN', r.left)) : ''}</small></div>
        <b class="amt">${money(r.amount)}</b>
      </div>
      <div class="rec-bottom">
        <span class="status ${st.cls}">${esc(st.text)}</span>
        <div class="rec-actions">
          ${recActive(r) ? `<button class="btn small primary" data-action="rec-paid" data-id="${r.id}">${t('recPaid')}</button>` : ''}
          <button class="btn small" data-action="rec-cal" data-id="${r.id}">${t('recCalendar')}</button>
          <button class="link-btn" data-action="rec-edit" data-id="${r.id}">${t('edit')}</button>
        </div>
      </div>
    </div>`;
}

// Κουτί «Υπενθυμίσεις πληρωμών» για το «Ο μήνας μου»
function remindersCard() {
  const due = recDueSoon();
  if (!due.length) return '';
  return `<div class="card reminders">
      <div class="card-head"><h2>${t('remindersTitle')}</h2>
        <button class="link-btn" data-tab="recurring">${t('seeAll')}</button></div>
      ${due.map(recRow).join('')}
    </div>`;
}

function notifCard() {
  let body;
  if (!('Notification' in window)) body = `<p class="muted">${isIOS() && !isStandalone() ? t('notifIOS') : t('notifUnsupported')}</p>`;
  else if (Notification.permission === 'granted') body = `<div class="done">${t('notifEnabled')}</div>`;
  else if (Notification.permission === 'denied') body = `<p class="muted">${t('notifBlocked')}</p>`;
  else body = `<div class="btn-row"><button class="btn primary" data-action="notif-on">${t('notifOn')}</button></div>`;
  return `<div class="card">
      <h2>${t('notifTitle')}</h2>
      <p class="muted" style="margin:0 0 8px;font-size:.9rem">${t('notifText')}</p>
      ${body}
      ${state.recurring.some(recActive) ? `<div class="btn-row"><button class="btn" data-action="rec-cal-all">${t('calAll')}</button></div>` : ''}
    </div>`;
}

function renderRecurring() {
  const hits = state.recurring.filter((r) => recHitsMonth(r, cur));
  const list = [...state.recurring].sort((a, b) => (recActive(b) - recActive(a)) || a.nextDue.localeCompare(b.nextDue));
  const presets = REC_TYPES.filter((x) => x.id !== 'other').map((x) =>
    `<button class="chip" data-action="rec-add" data-type="${x.id}">+ ${esc(L.recTypes[x.id])}</button>`).join('');

  $('#page-recurring').innerHTML = `
    <div class="card hero">
      <div class="hero-label">${esc(t('recThisMonth', inMonth(cur)))}</div>
      <div class="hero-amount">${money(sum(hits, (r) => r.amount))}</div>
      <div class="hero-sub muted">${t('recCount', hits.length)}</div>
    </div>
    <div class="card span-2">
      <h2>${t('recListTitle')}</h2>
      ${list.length ? `<div class="rec-list">${list.map(recRow).join('')}</div>`
        : `<p class="muted" style="margin:0 0 4px">${t('recHint')}</p><div class="empty">${t('recEmpty')}</div>`}
    </div>
    <div class="card">
      <h2>${t('recNew')}</h2>
      <div class="chips" style="margin-bottom:12px">${presets}</div>
      <button class="btn wide" data-action="rec-add" data-type="other">${t('recCustom')}</button>
    </div>
    ${notifCard()}`;
}

function recForm(item, presetType) {
  const type = item ? item.type : (presetType || 'other');
  const sameFixed = state.fixed.some((f) => f.name.trim().toLowerCase() === (L.recTypes[type] || '').toLowerCase());
  const linked = item && state.fixed.some((f) => f.id === item.fixedId);
  openForm({
    title: item ? t('recTitle') : t('recNew'),
    fields: [
      { name: 'type', label: t('recType'), type: 'select', value: type, options: REC_TYPES.map((x) => ({ value: x.id, label: L.recTypes[x.id] })) },
      { name: 'name', label: t('name'), value: item ? item.name : (type === 'other' ? '' : L.recTypes[type]), placeholder: L.recTypes[type] },
      { name: 'amount', label: t('amount'), type: 'money', value: item?.amount },
      { name: 'nextDue', label: t('recDue'), type: 'date', value: item ? item.nextDue : todayISO() },
      { name: 'every', label: t('recEvery'), type: 'select', value: String(item ? item.every : 1), options: REC_EVERY.map((n) => ({ value: String(n), label: L.every[n] })) },
      { name: 'remind', label: t('recRemind'), type: 'select', value: String(item ? item.remind : 3), options: REC_REMIND.map((n) => ({ value: String(n), label: t('remind', n) })) },
      { name: 'left', label: t('recLeft'), type: 'int', value: item && item.left !== null ? item.left : (type === 'loan' ? '' : '') },
      { name: 'inFixed', label: t('recInFixed'), type: 'check', value: item ? linked : !sameFixed },
    ],
    onSubmit(d) {
      if (!(d.amount > 0)) return t('errAmount');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.nextDue)) return t('errDate');
      if (d.left !== null && !(d.left >= 1)) return t('errLeft');
      const r = item || { id: uid(), fixedId: null };
      Object.assign(r, {
        type: d.type, name: d.name, amount: d.amount, nextDue: d.nextDue, day: +d.nextDue.slice(8),
        every: +d.every, remind: +d.remind, left: d.left,
      });
      // Σύνδεση με τα πάγια έξοδα: ένα πάγιο με το μηνιαίο ποσό (π.χ. 120 € κάθε 3 μήνες → 40 €/μήνα)
      const fx = state.fixed.find((f) => f.id === r.fixedId);
      if (d.inFixed) {
        const monthly = round2(r.amount / r.every);
        if (fx) Object.assign(fx, { name: recName(r), amount: monthly });
        else { const f = { id: uid(), name: recName(r), amount: monthly }; state.fixed.push(f); r.fixedId = f.id; }
      } else if (fx) {
        state.fixed = state.fixed.filter((f) => f !== fx);
        r.fixedId = null;
      }
      if (!item) state.recurring.push(r);
      setTimeout(checkNotifications, 0);
    },
    deleteConfirm: linked ? t('recDeleteLinked') : null,
    onDelete: item ? () => {
      state.fixed = state.fixed.filter((f) => f.id !== item.fixedId);
      state.recurring = state.recurring.filter((x) => x !== item);
    } : null,
  });
}

function markPaid(r) {
  if (r.left !== null) r.left -= 1;
  if (r.left === 0) toast(t('paidDone', recName(r)));
  else {
    r.nextDue = addMonthsKeepDay(r.nextDue, r.every, r.day);
    toast(t('paidToast', recName(r), isoToText(r.nextDue)));
  }
  save(); render();
}

/* Ημερολόγιο κινητού (.ics): η υπενθύμιση χτυπάει ακόμα κι όταν η εφαρμογή είναι κλειστή */
const icsText = (s) => String(s).replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');
function icsEvent(r) {
  const start = r.nextDue.replace(/-/g, '');
  const [y, m, d] = r.nextDue.split('-').map(Number);
  const next = new Date(y, m - 1, d + 1);
  const end = `${next.getFullYear()}${pad(next.getMonth() + 1)}${pad(next.getDate())}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const title = `${recName(r)} – ${money(r.amount)}`;
  // ολοήμερο γεγονός: η ώρα μετράει από τα μεσάνυχτα, άρα 09:00 το πρωί της μέρας Χ μέρες πριν
  const trigger = r.remind === 0 ? 'PT9H' : `-PT${r.remind * 24 - 9}H`;
  return [
    'BEGIN:VEVENT',
    `UID:${r.id}@ta-lefta-mou`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${icsText(title)}`,
    `RRULE:FREQ=MONTHLY;INTERVAL=${r.every}${r.left ? ';COUNT=' + r.left : ''}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText(t('notifHead') + ': ' + title)}`,
    `TRIGGER:${trigger}`,
    'END:VALARM',
    'END:VEVENT',
  ].join('\r\n');
}
function downloadIcs(items, filename) {
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//To portofoli mou//EL', 'CALSCALE:GREGORIAN',
    ...items.map(icsEvent), 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* Ειδοποιήσεις στο κινητό: όταν ανοίγει η εφαρμογή (και κάθε ώρα όσο είναι ανοιχτή), μία φορά τη μέρα ανά πληρωμή */
async function checkNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const today = todayISO();
  let sent = {};
  try { sent = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '{}'); } catch (e) { /* δεν πειράζει */ }
  for (const k of Object.keys(sent)) if (!k.endsWith(today)) delete sent[k]; // κρατάμε μόνο τις σημερινές
  for (const r of recDueSoon()) {
    const key = `${r.id}:${r.nextDue}:${today}`;
    if (sent[key]) continue;
    if (await notify(t('notifHead'), `${recName(r)} · ${money(r.amount)} · ${recStatus(r).text}`, 'rec-' + r.id)) sent[key] = 1;
  }
  try { localStorage.setItem(NOTIFIED_KEY, JSON.stringify(sent)); } catch (e) { /* δεν πειράζει */ }
  checkGoalNotifications();
}

// Μία ειδοποίηση στο κινητό· επιστρέφει true αν στάλθηκε
async function notify(title, body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  const opts = { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg) await reg.showNotification(title, opts);
    else new Notification(title, opts);
    return true;
  } catch (e) { return false; } // π.χ. ο browser δεν επιτρέπει εδώ
}

// Κόκκινος αριθμός στο μενού: πληρωμές που λήγουν + στόχοι που έφτασαν το 80% (αυτόν τον μήνα)
function updateBadges() {
  const rec = recDueSoon().length;
  const goals = goalsWarn(monthKey(new Date())).length;
  const set = (el, n) => {
    if (!el) return;
    let b = el.querySelector('.badge');
    if (!b) { b = document.createElement('span'); b.className = 'badge'; el.appendChild(b); }
    b.textContent = n || '';
    b.hidden = n === 0;
  };
  set($('.group-btn .group-label'), rec + goals);
  set($('.tabs [data-tab=recurring]'), rec);
  set($('.tabs [data-tab=goals]'), goals);
}

/* ---------- Σελίδα: Στόχοι εξόδων ---------- */

const catSpent = (id, key) => sum(monthExpenses(key).filter((e) => e.cat === id), (e) => e.amount);
// 0 = εντάξει, 1 = έφτασε το 80%, 2 = ξεπέρασε τον στόχο
const goalLevel = (spent, limit) => (spent >= limit ? 2 : spent >= limit * 0.8 ? 1 : 0);
const goalCats = () => allCats().filter((c) => state.goals[c.id] > 0);
const goalsWarn = (key) => goalCats().filter((c) => goalLevel(catSpent(c.id, key), state.goals[c.id]) > 0);

function goalRow(c, key) {
  const limit = state.goals[c.id];
  const spent = catSpent(c.id, key);
  const lvl = goalLevel(spent, limit);
  const cls = ['', 'warn', 'over'][lvl];
  return `<button class="goal-row" data-action="goal-edit" data-cat="${c.id}">
      <div class="goal-top">${dot(c.color)}<span class="name">${esc(catName(c.id))}</span>
        <span class="goal-amt"><b>${money(spent)}</b> / ${money(limit)}</span></div>
      <div class="bar ${cls}"><i style="width:${Math.min(100, (spent / limit) * 100)}%"></i></div>
      <div class="goal-bottom ${cls}">
        <span>${spent > limit ? t('goalOver', money(spent - limit)) : t('goalLeft', money(limit - spent))}</span>
        <span>${pctOf(spent, limit)}%</span>
      </div>
    </button>`;
}

// Κουτί για το «Ο μήνας μου»
function goalsWarnCard() {
  const warn = goalsWarn(cur);
  if (!warn.length) return '';
  return `<div class="card reminders">
      <div class="card-head"><h2>${t('goalsWarnTitle')}</h2>
        <button class="link-btn" data-tab="goals">${t('seeAll')}</button></div>
      <div class="goal-list">${warn.map((c) => goalRow(c, cur)).join('')}</div>
    </div>`;
}

function renderGoals() {
  const cats = goalCats();
  const totalLimit = sum(cats, (c) => state.goals[c.id]);
  const totalSpent = sum(cats, (c) => catSpent(c.id, cur));
  const free = allCats().filter((c) => !(state.goals[c.id] > 0));

  $('#page-goals').innerHTML = `
    ${cats.length ? `<div class="card hero">
      <div class="hero-label">${esc(t('goalsLeftLabel', inMonth(cur)))}</div>
      <div class="hero-amount ${totalSpent > totalLimit ? 'neg' : ''}">${money(totalLimit - totalSpent)}</div>
      <div class="bar ${['', 'warn', 'over'][goalLevel(totalSpent, totalLimit)]}"><i style="width:${Math.min(100, (totalSpent / totalLimit) * 100)}%"></i></div>
      <div class="hero-sub">${t('spentOf', money(totalSpent), money(totalLimit))}</div>
    </div>` : ''}
    <div class="card span-2">
      <h2>${t('goalsList')}</h2>
      <p class="muted" style="margin:0 0 10px;font-size:.9rem">${t('goalsHint')}</p>
      ${cats.length ? `<div class="goal-list">${cats.map((c) => goalRow(c, cur)).join('')}</div>`
        : `<div class="empty">${t('goalsEmpty')}</div>`}
    </div>
    <div class="card span-2">
      <h2>${t('goalNew')}</h2>
      ${free.length ? `<div class="chips" style="margin-bottom:12px">${free.map((c) =>
        `<button class="chip" data-action="goal-edit" data-cat="${c.id}">${dot(c.color)} ${esc(catName(c.id))}</button>`).join('')}</div>`
        : `<div class="empty">${t('goalAllSet')}</div>`}
      <button class="btn wide" data-action="goal-custom">${t('goalCustomBtn')}</button>
    </div>`;
}

// Δικός τους στόχος: φτιάχνει μαζί και νέα κατηγορία εξόδων με αυτό το όνομα
function goalCustomForm() {
  const used = new Set(allCats().map((c) => c.color));
  openForm({
    title: t('goalCustomTitle'),
    intro: t('goalCustomIntro'),
    fields: [
      { name: 'name', label: t('name'), placeholder: t('egCat') },
      { name: 'color', label: t('color'), type: 'colors', options: CAT_COLORS, value: CAT_COLORS.find((c) => !used.has(c)) || CAT_COLORS[0] },
      { name: 'limit', label: t('goalAmount'), type: 'money', placeholder: t('egGoal') },
    ],
    onSubmit(d) {
      if (!d.name) return t('errName');
      if (allCats().some((c) => catName(c.id).trim().toLowerCase() === d.name.toLowerCase())) return t('errCatExists');
      if (!(d.limit > 0)) return t('errAmount');
      const c = { id: 'c_' + uid(), name: d.name, color: d.color };
      state.customCats.push(c);
      state.goals[c.id] = d.limit;
    },
  });
}

function goalForm(catId) {
  const existing = state.goals[catId];
  const last = catSpent(catId, shiftMonth(cur, -1));
  openForm({
    title: t('goalTitle', catName(catId)),
    fields: [{ name: 'limit', label: t('goalAmount'), type: 'money', value: existing || '', placeholder: last > 0 ? moneyInputValue(Math.ceil(last)) : t('egSalary').replace(/\d+/, '250') }],
    intro: last > 0 ? t('goalLastMonth', money(last)) : '',
    onSubmit(d) {
      if (!(d.limit > 0)) return t('errAmount');
      state.goals[catId] = d.limit;
    },
    onDelete: existing ? () => { delete state.goals[catId]; } : null,
  });
}

// Μετά από κάθε αλλαγή εξόδου: αν μόλις πέρασε το 80% ή το 100%, ειδοποίηση
function goalAlert(catId, key, before) {
  const limit = state.goals[catId];
  if (!(limit > 0)) return null;
  const after = catSpent(catId, key);
  const lvl = goalLevel(after, limit);
  if (lvl <= goalLevel(before, limit)) return null;
  const msg = lvl === 2 ? t('goal100', catName(catId), money(after - limit)) : t('goal80', catName(catId), money(after), money(limit));
  if (key === monthKey(new Date())) sendGoalNotification(catId, key, lvl, msg);
  return msg;
}

function sendGoalNotification(catId, key, lvl, msg) {
  let sent = {};
  try { sent = JSON.parse(localStorage.getItem(GOAL_NOTIFIED_KEY) || '{}'); } catch (e) { /* δεν πειράζει */ }
  const k = `${catId}:${key}:${lvl}`;
  if (sent[k]) return;
  notify(t('goalNotifHead'), msg, 'goal-' + catId).then((ok) => {
    if (!ok) return;
    for (const old of Object.keys(sent)) if (!old.includes(':' + key + ':')) delete sent[old]; // μόνο ο τρέχων μήνας
    sent[k] = 1;
    try { localStorage.setItem(GOAL_NOTIFIED_KEY, JSON.stringify(sent)); } catch (e) { /* δεν πειράζει */ }
  });
}

// Με το άνοιγμα της εφαρμογής: στόχοι του μήνα που έχουν ήδη φτάσει το 80%
function checkGoalNotifications() {
  const key = monthKey(new Date());
  for (const c of goalsWarn(key)) {
    const limit = state.goals[c.id];
    const spent = catSpent(c.id, key);
    const lvl = goalLevel(spent, limit);
    sendGoalNotification(c.id, key, lvl, lvl === 2 ? t('goal100', catName(c.id), money(spent - limit)) : t('goal80', catName(c.id), money(spent), money(limit)));
  }
}

/* ---------- Σελίδα: Καταχώρηση εξόδων ταξιδιού ---------- */

let openTripId = null;      // ποιο ταξίδι είναι ανοιχτό (null = λίστα ταξιδιών)
let pickedTripCat = null;   // κατηγορία στη γρήγορη καταχώρηση εξόδου ταξιδιού
let editTripCats = false;   // «Οι κατηγορίες μου» στα ταξίδια: πατώντας μια δική σου την αλλάζεις

// Έτοιμες κατηγορίες ταξιδιού + όσες έφτιαξε ο χρήστης (κοινές για όλα τα ταξίδια)
const allTripCats = () => [...TRIP_CATS, ...state.tripCustomCats];
const tripCat = (id) => allTripCats().find((c) => c.id === id) || TRIP_CATS[TRIP_CATS.length - 1];
function tripCatName(id) {
  const custom = state.tripCustomCats.find((c) => c.id === id);
  return custom ? custom.name : (L.tripCats[id] || L.tripCats.other);
}
const tripSpent = (tr) => round2(sum(tr.expenses, (e) => e.amount));

function tripCard(tr) {
  const spent = tripSpent(tr);
  const lvl = tr.budget > 0 ? goalLevel(spent, tr.budget) : 0;
  const cls = ['', 'warn', 'over'][lvl];
  return `<button class="trip-card" data-action="trip-open" data-id="${tr.id}">
      <div class="goal-top"><span class="avatar small" style="background:var(--brand-bg)">${esc((tr.dest || '?').charAt(0).toUpperCase())}</span>
        <span class="name"><b>${esc(tr.dest)}</b><small>${tr.done ? t('tripDoneLabel') + ' · ' : ''}${t('tripCount', tr.expenses.length)}</small></span>
        <span class="goal-amt"><b>${money(spent)}</b> / ${money(tr.budget)}</span></div>
      <div class="bar ${cls}"><i style="width:${tr.budget > 0 ? Math.min(100, (spent / tr.budget) * 100) : 0}%"></i></div>
      <div class="goal-bottom ${cls}">
        <span>${spent > tr.budget ? t('tripOver', money(spent - tr.budget)) : t('goalLeft', money(tr.budget - spent))}</span>
        <span>${tr.budget > 0 ? pctOf(spent, tr.budget) + '%' : ''}</span>
      </div>
    </button>`;
}

function renderTrips() {
  const tr = state.trips.find((x) => x.id === openTripId);
  if (!tr) { openTripId = null; renderTripList(); } else renderTrip(tr);
}

function renderTripList() {
  const byNew = (a, b) => b.created - a.created;
  const active = state.trips.filter((x) => !x.done).sort(byNew);
  const done = state.trips.filter((x) => x.done).sort(byNew);
  $('#page-trips').innerHTML = `
    <div class="card span-2">
      <h2>${t('tabTrips')}</h2>
      <p class="muted" style="margin:0 0 12px;font-size:.9rem">${t('tripsHint')}</p>
      <button class="btn primary wide" data-action="trip-new">${t('tripNewBtn')}</button>
    </div>
    ${active.length ? `<div class="card span-2"><h2>${t('tripsActive')}</h2><div class="goal-list">${active.map(tripCard).join('')}</div></div>` : ''}
    ${done.length ? `<div class="card span-2"><h2>${t('tripsDone')}</h2><div class="goal-list">${done.map(tripCard).join('')}</div></div>` : ''}
    ${!state.trips.length ? `<div class="card span-2"><div class="empty">${t('tripsEmpty')}</div></div>` : ''}`;
}

function renderTrip(tr) {
  const spent = tripSpent(tr);
  const left = tr.budget - spent;
  const lvl = tr.budget > 0 ? goalLevel(spent, tr.budget) : 0;
  const cls = ['', 'warn', 'over'][lvl];

  // ό,τι έχει ήδη γραφτεί στη φόρμα μένει (π.χ. όταν αλλάζεις γλώσσα στη μέση)
  const keep = { amount: $('#trip-amount')?.value || '', note: $('#trip-note')?.value || '', date: $('#trip-date')?.value || '' };

  const cats = {};
  tr.expenses.forEach((e) => { cats[e.cat] = (cats[e.cat] || 0) + e.amount; });
  const slices = Object.entries(cats).map(([id, value]) => ({ ...tripCat(id), value })).sort((a, b) => b.value - a.value);

  let rows = '', lastDay = '';
  [...tr.expenses].sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created).forEach((e) => {
    if (e.date !== lastDay) { rows += `<div class="day-head">${dayLabel(e.date)}</div>`; lastDay = e.date; }
    const c = tripCat(e.cat);
    rows += `<button class="row" data-action="trip-exp-edit" data-id="${e.id}">
      ${dot(c.color)}
      <span class="name">${esc(e.note || tripCatName(c.id))}${e.note ? `<small>${esc(tripCatName(c.id))}</small>` : ''}</span>
      <span class="amt">${money(e.amount)}</span></button>`;
  });

  $('#page-trips').innerHTML = `
    <div class="card hero span-2">
      <div class="trip-head">
        <button class="link-btn" data-action="trip-back">${t('tripBack')}</button>
        <button class="link-btn" data-action="trip-edit">${t('edit')}</button>
      </div>
      <h2 class="trip-dest">${esc(tr.dest)}${tr.done ? ` <span class="status done">${t('tripDoneLabel')}</span>` : ''}</h2>
      <div class="hero-label">${t('tripLeft')}</div>
      <div class="hero-amount ${left < 0 ? 'neg' : ''}">${money(left)}</div>
      <div class="bar ${cls}"><i style="width:${tr.budget > 0 ? Math.min(100, (spent / tr.budget) * 100) : 0}%"></i></div>
      <div class="hero-sub">${t('spentOf', money(spent), money(tr.budget))}</div>
      <div class="btn-row">
        <button class="btn" data-action="trip-finish">${tr.done ? t('tripReopen') : t('tripFinish')}</button>
      </div>
    </div>
    ${tr.done ? '' : `<div class="card">
      <h2>${t('tripAddTitle')}</h2>
      <input type="text" inputmode="decimal" id="trip-amount" class="big-money" placeholder="${t('amountPh')}" autocomplete="off">
      ${state.tripCustomCats.length ? `<div class="cats-head">
        ${editTripCats ? `<small class="muted">${t('editCatsHint')}</small>` : '<span></span>'}
        <button class="link-btn" data-action="trip-toggle-edit-cats">${editTripCats ? t('done') : t('myCats')}</button></div>` : ''}
      <div class="cats ${editTripCats ? 'editing' : ''}">${allTripCats().map((c) => {
        const custom = state.tripCustomCats.includes(c);
        return `<button class="cat ${custom ? 'custom' : ''} ${pickedTripCat === c.id ? 'active' : ''}" style="--c:${c.color}" data-action="trip-pick-cat" data-cat="${c.id}">
          ${dot(c.color)}${esc(tripCatName(c.id))}</button>`;
      }).join('')}${editTripCats ? '' : `<button class="cat add-cat" data-action="trip-add-cat">${t('newCatBtn')}</button>`}</div>
      <div class="two-col">
        <input type="text" id="trip-note" placeholder="${t('note')}" maxlength="60">
        <input type="date" id="trip-date" value="${todayISO()}">
      </div>
      <button class="btn primary wide" data-action="trip-add">${t('addExpense')}</button>
    </div>`}
    ${slices.length ? `<div class="card">
      <h2>${t('tripByCat')}</h2>
      <div class="chart-wrap">
        <div class="donut-box">${donutSVG(slices, spent)}
          <div class="donut-center"><small class="muted">${t('total')}</small><b>${money(spent)}</b></div></div>
        <div class="legend list">${slices.map((s) => `
          <div class="row">${dot(s.color)}<span class="name">${esc(tripCatName(s.id))}</span>
            <span class="amt">${money(s.value)}</span><span class="pct">${pctOf(s.value, spent)}%</span></div>`).join('')}</div>
      </div>
    </div>` : ''}
    <div class="card span-2">
      <div class="card-head"><h2>${t('tripExpenses')}</h2><small class="muted">${t('tripCount', tr.expenses.length)}</small></div>
      ${rows ? `<div class="list">${rows}</div>` : `<div class="empty">${t('nothingYet')}</div>`}
    </div>`;

  if ($('#trip-amount')) {
    $('#trip-amount').value = keep.amount;
    $('#trip-note').value = keep.note;
    if (keep.date) $('#trip-date').value = keep.date;
  }
}

// Ειδοποίηση όταν τα έξοδα του ταξιδιού περνούν το 80% ή το 100% των χρημάτων
function tripAlert(tr, before) {
  if (!(tr.budget > 0)) return null;
  const after = tripSpent(tr);
  const lvl = goalLevel(after, tr.budget);
  if (lvl <= goalLevel(before, tr.budget)) return null;
  const msg = lvl === 2 ? t('trip100', tr.dest, money(after - tr.budget)) : t('trip80', tr.dest, money(after), money(tr.budget));
  notify(t('tabTrips'), msg, 'trip-' + tr.id);
  return msg;
}

function tripForm(tr) {
  openForm({
    title: tr ? t('tripTitle') : t('tripNew'),
    fields: [
      { name: 'dest', label: t('tripDest'), value: tr?.dest, placeholder: t('egDest') },
      { name: 'budget', label: t('tripBudget'), type: 'money', value: tr?.budget, placeholder: t('egGoal') },
    ],
    onSubmit(d) {
      if (!d.dest) return t('errName');
      if (!(d.budget > 0)) return t('errAmount');
      if (tr) Object.assign(tr, { dest: d.dest, budget: d.budget });
      else {
        const n = { id: uid(), dest: d.dest, budget: d.budget, created: Date.now(), done: false, expenses: [] };
        state.trips.push(n);
        openTripId = n.id;   // ανοίγει αμέσως για να γράψει έξοδα
        pickedTripCat = null;
      }
    },
    deleteConfirm: tr ? t('tripConfirmDelete', tr.expenses.length) : null,
    onDelete: tr ? () => { state.trips = state.trips.filter((x) => x !== tr); openTripId = null; } : null,
  });
}

function addTripExpense() {
  const tr = state.trips.find((x) => x.id === openTripId);
  if (!tr) return;
  const amtEl = $('#trip-amount');
  const amount = parseMoney(amtEl.value);
  if (!(amount > 0)) { toast(t('enterSpent')); amtEl.focus(); return; }
  if (!pickedTripCat) { toast(t('pickCat')); return; }
  const before = tripSpent(tr);
  const cat = pickedTripCat;
  tr.expenses.push({ id: uid(), date: $('#trip-date').value || todayISO(), amount, cat, note: $('#trip-note').value.trim(), created: Date.now() });
  pickedTripCat = null;
  amtEl.value = ''; $('#trip-note').value = '';
  save(); renderTrips();
  const alert = tripAlert(tr, before);
  if (alert) toast(alert, true);
  else toast(t('expenseAdded', money(amount), tripCatName(cat)));
  $('#trip-amount')?.focus();
}

// Δική τους κατηγορία εξόδων ταξιδιού: νέα ή αλλαγή υπάρχουσας
function tripCatForm(item) {
  const used = new Set(allTripCats().map((c) => c.color));
  const inUse = item ? sum(state.trips, (tr) => tr.expenses.filter((e) => e.cat === item.id).length) : 0;
  openForm({
    title: item ? t('catTitle') : t('newCatTitle'),
    fields: [
      { name: 'name', label: t('name'), value: item?.name, placeholder: t('egTripCat') },
      { name: 'color', label: t('color'), type: 'colors', options: CAT_COLORS,
        value: item ? item.color : (CAT_COLORS.find((c) => !used.has(c)) || CAT_COLORS[0]) },
    ],
    onSubmit(d) {
      if (!d.name) return t('errName');
      if (allTripCats().some((c) => c !== item && tripCatName(c.id).trim().toLowerCase() === d.name.toLowerCase())) return t('errCatExists');
      if (item) Object.assign(item, { name: d.name, color: d.color });
      else {
        const c = { id: 't_' + uid(), name: d.name, color: d.color };
        state.tripCustomCats.push(c);
        pickedTripCat = c.id; // διαλέγεται αμέσως για το έξοδο που γράφεις
      }
    },
    deleteConfirm: inUse ? t('confirmDeleteCat', inUse) : null,
    onDelete: item ? () => {
      state.trips.forEach((tr) => tr.expenses.forEach((e) => { if (e.cat === item.id) e.cat = 'other'; }));
      state.tripCustomCats = state.tripCustomCats.filter((c) => c !== item);
      if (pickedTripCat === item.id) pickedTripCat = null;
      if (!state.tripCustomCats.length) editTripCats = false;
    } : null,
  });
}

function tripExpenseForm(tr, e) {
  openForm({
    title: t('expenseTitle'),
    fields: [
      { name: 'amount', label: t('amount'), type: 'money', value: e.amount },
      { name: 'cat', label: t('category'), type: 'select', value: e.cat, options: allTripCats().map((c) => ({ value: c.id, label: tripCatName(c.id) })) },
      { name: 'note', label: t('note'), value: e.note },
      { name: 'date', label: t('date'), type: 'date', value: e.date },
    ],
    onSubmit(d) {
      if (!(d.amount > 0)) return t('errAmount');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) return t('errDate');
      const before = tripSpent(tr) - e.amount;
      Object.assign(e, d);
      const alert = tripAlert(tr, before);
      if (alert) setTimeout(() => toast(alert, true), 0);
    },
    onDelete: () => { tr.expenses = tr.expenses.filter((x) => x !== e); },
  });
}

/* ---------- Σελίδα: Αποταμιεύσεις ---------- */

function renderPockets() {
  const total = sum(state.pockets, pocketBalance);
  const cards = state.pockets.map((p) => {
    const bal = pocketBalance(p);
    const pct = p.goal > 0 ? Math.min(100, (bal / p.goal) * 100) : 0;
    const remaining = p.goal > 0 ? p.goal - bal : 0;
    let info = '';
    if (p.goal > 0 && remaining <= 0) info = t('goalReached');
    else if (p.goal > 0 && p.monthly > 0) info = t('remainingMonths', money(remaining), Math.ceil(remaining / p.monthly));
    else if (p.goal > 0) info = t('remaining', money(remaining));

    const deposited = p.tx.some((x) => x.plan === cur);
    const planBtn = p.monthly > 0
      ? (deposited
        ? `<div class="done">${esc(t('depositedFor', money(p.monthly), ofMonth(cur)))}</div>`
        : `<div class="btn-row"><button class="btn primary" data-action="pocket-plan" data-id="${p.id}">${esc(t('depositFor', money(p.monthly), ofMonth(cur)))}</button></div>`)
      : '';

    return `<div class="card">
      <div class="pocket-head">
        ${avatar(p)}
        <div><h3>${esc(p.name)}</h3>
          <small>${p.goal > 0 ? t('goal', money(p.goal)) : t('noGoal')}${p.monthly > 0 ? ' · ' + money(p.monthly) + t('perMonth') : ''}</small></div>
        <button class="link-btn" data-action="edit-pocket" data-id="${p.id}">${t('edit')}</button>
      </div>
      <div class="pocket-amount">${money(bal)}${p.goal > 0 ? ` <small class="muted">/ ${money(p.goal)}</small>` : ''}</div>
      ${p.goal > 0 ? `<div class="bar"><i style="width:${pct}%"></i></div>` : ''}
      ${info ? `<small>${info}</small>` : ''}
      ${planBtn}
      <div class="btn-row">
        <button class="btn" data-action="pocket-add" data-id="${p.id}">${t('put')}</button>
        <button class="btn" data-action="pocket-take" data-id="${p.id}">${t('take')}</button>
      </div>
    </div>`;
  }).join('');

  // Έτοιμες προτάσεις που δεν υπάρχουν ήδη (σε καμία από τις δύο γλώσσες)
  const used = new Set(state.pockets.map((p) => p.name.trim().toLowerCase()));
  const presets = POCKET_PRESETS
    .filter((k) => !used.has(I18N.el.presets[k].toLowerCase()) && !used.has(I18N.en.presets[k].toLowerCase()))
    .map((k) => `<button class="chip" data-action="add-pocket" data-name="${esc(L.presets[k])}">+ ${esc(L.presets[k])}</button>`).join('');

  $('#page-pockets').innerHTML = `
    <div class="card hero">
      <div class="hero-label">${t('savedTotal')}</div>
      <div class="hero-amount">${money(total)}</div>
      <div class="hero-sub muted">${t('putAside', money(savingsPlan()))}</div>
    </div>
    ${cards}
    <div class="card">
      <h2>${t('newPocket')}</h2>
      ${presets ? `<div class="chips" style="margin-bottom:12px">${presets}</div>` : ''}
      <button class="btn wide" data-action="add-pocket">${t('customPocket')}</button>
    </div>`;
}

/* ---------- Σελίδα: Μηνιαία έξοδα ---------- */

function defaultExpenseDate() {
  return cur === monthKey(new Date()) ? todayISO() : cur + '-01';
}

function donutSVG(slices, total) {
  let acc = 0;
  const gap = slices.length > 1 ? 0.6 : 0;
  const circles = slices.map((s) => {
    const p = (s.value / total) * 100;
    const c = `<circle r="15.915" cx="21" cy="21" fill="none" stroke="${s.color}" stroke-width="6.5"
      stroke-dasharray="${Math.max(p - gap, 0.01)} ${100 - p + gap}" stroke-dashoffset="${-acc}"></circle>`;
    acc += p;
    return c;
  }).join('');
  return `<svg viewBox="0 0 42 42" class="donut" role="img" aria-label="${t('chartLabel')}">${circles}</svg>`;
}

// Δύο όψεις στα μηνιαία έξοδα: «Αυτός ο μήνας» και «Ιστορικό & αναζήτηση»
const viewSeg = () => `<div class="seg view-seg span-2">
    <button class="${expView === 'month' ? 'active' : ''}" data-action="exp-view" data-view="month">${t('viewMonth')}</button>
    <button class="${expView === 'history' ? 'active' : ''}" data-action="exp-view" data-view="history">${t('viewHistory')}</button>
  </div>`;

function renderExpenses() {
  if (expView === 'history') { renderHistory(); return; }
  const list = monthExpenses(cur);
  const byCat = {};
  list.forEach((e) => { byCat[e.cat] = (byCat[e.cat] || 0) + e.amount; });
  if (showFixedInChart && fixedTotal() > 0) byCat[FIXED_SLICE.id] = fixedTotal();
  const slices = Object.entries(byCat)
    .map(([id, value]) => ({ ...catById(id), value }))
    .sort((a, b) => b.value - a.value);
  const total = sum(slices, (s) => s.value);

  const customIds = new Set(state.customCats.map((c) => c.id));
  const catButtons = allCats().map((c) =>
    `<button class="cat ${customIds.has(c.id) ? 'custom' : ''} ${pickedCat === c.id ? 'active' : ''}" style="--c:${c.color}" data-action="pick-cat" data-cat="${c.id}">
      ${dot(c.color)}${esc(catName(c.id))}</button>`).join('') +
    (editCats ? '' : `<button class="cat add-cat" data-action="add-cat">${t('newCatBtn')}</button>`);

  // Κρατάμε ό,τι έχει ήδη γραφτεί στη φόρμα (π.χ. όταν φτιάχνεις κατηγορία στη μέση)
  const keep = {
    amount: $('#exp-amount')?.value || '',
    note: $('#exp-note')?.value || '',
    date: $('#exp-date')?.value || '',
  };

  const chart = total > 0
    ? `<div class="chart-wrap">
        <div class="donut-box">${donutSVG(slices, total)}
          <div class="donut-center"><small class="muted">${t('total')}</small><b>${money(total)}</b></div></div>
        <div class="legend list">${slices.map((s) => `
          <button class="row ${filterCat && filterCat !== s.id ? 'dim' : ''}" ${s.id === FIXED_SLICE.id ? '' : `data-action="filter-cat" data-cat="${s.id}"`}>
            ${dot(s.color)}
            <span class="name">${esc(catName(s.id))}</span>
            <span class="amt">${money(s.value)}</span>
            <span class="pct">${Math.round((s.value / total) * 100)}%</span>
          </button>`).join('')}
        </div>
      </div>`
    : `<div class="empty">${t('noExpenses', esc(inMonth(cur)))}</div>`;

  // Λίστα ανά μέρα
  const shown = list.filter((e) => !filterCat || e.cat === filterCat)
    .sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created);
  let rows = '';
  let lastDay = '';
  shown.forEach((e) => {
    if (e.date !== lastDay) { rows += `<div class="day-head">${dayLabel(e.date)}</div>`; lastDay = e.date; }
    const c = catById(e.cat);
    rows += `<button class="row" data-action="edit-expense" data-id="${e.id}">
      ${dot(c.color)}
      <span class="name">${esc(e.note || catName(c.id))}${e.note ? `<small>${esc(catName(c.id))}</small>` : ''}</span>
      <span class="amt">${money(e.amount)}</span></button>`;
  });

  $('#page-expenses').innerHTML = `
    ${viewSeg()}
    <div class="card">
      <h2>${t('newExpense')}</h2>
      <input type="text" inputmode="decimal" id="exp-amount" class="big-money" placeholder="${t('amountPh')}" autocomplete="off">
      ${state.customCats.length ? `<div class="cats-head">
        ${editCats ? `<small class="muted">${t('editCatsHint')}</small>` : '<span></span>'}
        <button class="link-btn" data-action="toggle-edit-cats">${editCats ? t('done') : t('myCats')}</button></div>` : ''}
      <div class="cats ${editCats ? 'editing' : ''}">${catButtons}</div>
      <div class="two-col">
        <input type="text" id="exp-note" placeholder="${t('note')}" maxlength="60">
        <input type="date" id="exp-date" value="${defaultExpenseDate()}" min="${cur}-01" max="${cur}-${pad(daysInMonth(cur))}">
      </div>
      <button class="btn primary wide" data-action="add-expense">${t('addExpense')}</button>
    </div>
    <div class="card">
      <h2>${t('whereMoney')}</h2>
      ${state.fixed.length ? `<label class="toggle"><input type="checkbox" data-bind="chart-fixed" ${showFixedInChart ? 'checked' : ''}> ${t('showFixed')}</label>` : ''}
      ${chart}
    </div>
    <div class="card span-2">
      <div class="card-head"><h2>${filterCat ? esc(catName(filterCat)) : t('allExpenses')}</h2>
        ${filterCat ? `<button class="link-btn" data-action="filter-cat" data-cat="">${t('showAll')}</button>` : ''}</div>
      ${rows ? `<div class="list">${rows}</div>` : `<div class="empty">${t('nothingYet')}</div>`}
    </div>`;

  $('#exp-amount').value = keep.amount;
  $('#exp-note').value = keep.note;
  if (keep.date.startsWith(cur)) $('#exp-date').value = keep.date;
}

/* ---------- Ιστορικό & αναζήτηση εξόδων ---------- */

const HIST_PERIODS = [1, 3, 6, 12];

// Για αναζήτηση χωρίς τόνους/κεφαλαία: «Καφές» = «καφες» = «ΚΑΦΕΣ»
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ς/g, 'σ');

function monthsBetween(a, b) {
  const out = [];
  for (let k = a; k <= b && out.length < 600; k = shiftMonth(k, 1)) out.push(k);
  return out;
}

// Το διάστημα που ψάχνουμε: είτε οι ημερομηνίες Από/Έως, είτε οι τελευταίοι Χ μήνες ως τον μήνα που βλέπουμε
function histRange() {
  if (histFrom || histTo) {
    const dates = state.expenses.map((e) => e.date).sort();
    let from = histFrom || dates[0] || todayISO();
    let to = histTo || dates[dates.length - 1] || todayISO();
    if (from > to) [from, to] = [to, from];
    return { from, to, months: monthsBetween(from.slice(0, 7), to.slice(0, 7)), custom: true };
  }
  const start = shiftMonth(cur, -(histPeriod - 1));
  return { from: start + '-01', to: `${cur}-${pad(daysInMonth(cur))}`, months: monthsBetween(start, cur), custom: false };
}

const shortMonth = (key) => L.monthsShort[monthIdx(key)] + ' ' + key.slice(0, 4);
function isoToText(iso) { const [y, m, d] = iso.split('-'); return `${+d} ${L.monthsShort[m - 1]} ${y}`; }

function rangeText(r) {
  if (r.custom) return t('rangeText', isoToText(r.from), isoToText(r.to));
  return r.months.length === 1 ? monthName(r.months[0]) : t('rangeText', shortMonth(r.months[0]), shortMonth(r.months[r.months.length - 1]));
}

const expenseText = (e) => norm([e.note, catName(e.cat), moneyInputValue(e.amount), money(e.amount),
  e.date, e.date.split('-').reverse().join('/')].join(' '));

function renderHistory() {
  const custom = !!(histFrom || histTo);
  $('#page-expenses').innerHTML = `
    ${viewSeg()}
    <div class="card span-2">
      <h2>${t('histTitle')}</h2>
      <div class="seg period-seg ${custom ? 'dim' : ''}">${HIST_PERIODS.map((p) =>
        `<button class="${!custom && histPeriod === p ? 'active' : ''}" data-action="hist-period" data-p="${p}">${t('period' + p)}</button>`).join('')}</div>
      <input type="search" id="hist-q" placeholder="${t('searchPh')}" value="${esc(histQuery)}" autocomplete="off" enterkeyhint="search">
      <div class="date-range">
        <label class="field"><span>${t('from')}</span><input type="date" data-bind="hist-from" value="${histFrom}"></label>
        <label class="field"><span>${t('to')}</span><input type="date" data-bind="hist-to" value="${histTo}"></label>
      </div>
      <div class="range-line">
        <span class="muted" id="hist-range"></span>
        ${custom ? `<button class="link-btn" data-action="hist-clear-dates">${t('clearDates')}</button>` : ''}
      </div>
    </div>
    <div id="hist-results" style="display:contents"></div>`;
  renderHistoryResults();
}

// Μόνο τα αποτελέσματα — για να μη χάνεται το πληκτρολόγιο όσο γράφεις στην αναζήτηση
function renderHistoryResults() {
  const r = histRange();
  const tokens = norm(histQuery.trim()).split(/\s+/).filter(Boolean);
  const found = state.expenses
    .filter((e) => e.date >= r.from && e.date <= r.to && tokens.every((tk) => expenseText(e).includes(tk)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created);
  $('#hist-range').textContent = rangeText(r);

  const total = sum(found, (e) => e.amount);
  const biggest = found.reduce((m, e) => (!m || e.amount > m.amount ? e : m), null);

  // Ποσοστό των εσόδων της περιόδου (μόνο για ολόκληρους μήνες, και μόνο
  // για τους μήνες που έχει γραφτεί μισθός — αλλιώς τα ποσοστά βγαίνουν λάθος)
  let pctHint = '';
  if (!r.custom) {
    const incMonths = r.months.filter((k) => incomeFor(k) !== null);
    const income = sum(incMonths, (k) => incomeFor(k));
    if (income > 0) {
      const spentIn = sum(found.filter((e) => incMonths.includes(e.date.slice(0, 7))), (e) => e.amount);
      pctHint = tokens.length
        ? t('periodPct', pctOf(spentIn, income))
        : t('periodPctFixed', pctOf(spentIn, income), pctOf(spentIn + fixedTotal() * incMonths.length, income));
      if (incMonths.length < r.months.length) pctHint += `<div class="hint-pct">${t('pctPartial', incMonths.length, r.months.length)}</div>`;
    }
  }

  const stats = `<div class="card span-2">
      ${histQuery.trim() ? `<h2>${esc(t('searchFor', histQuery.trim()))}</h2>` : ''}
      <div class="stats">
        <div><small>${t('statTotal')}</small><b>${money(total)}</b></div>
        <div><small>${t('statCount')}</small><b>${found.length}</b></div>
        <div><small>${t('statAvg')}</small><b>${money(total / r.months.length)}</b></div>
        <div><small>${t('statMax')}</small><b>${biggest ? money(biggest.amount) : '—'}</b>
          ${biggest ? `<small>${esc(biggest.note || catName(biggest.cat))}</small>` : ''}</div>
      </div>
      ${pctHint ? `<div class="hint">${pctHint}</div>` : ''}
    </div>`;

  let byCat = '', byMonth = '';
  if (found.length) {
    const cats = {};
    found.forEach((e) => { cats[e.cat] = (cats[e.cat] || 0) + e.amount; });
    const slices = Object.entries(cats).map(([id, value]) => ({ ...catById(id), value })).sort((a, b) => b.value - a.value);
    byCat = `<div class="card">
        <h2>${t('byCategory')}</h2>
        <div class="chart-wrap">
          <div class="donut-box">${donutSVG(slices, total)}
            <div class="donut-center"><small class="muted">${t('total')}</small><b>${money(total)}</b></div></div>
          <div class="legend list">${slices.map((s) => `
            <button class="row" data-action="hist-cat" data-cat="${s.id}">
              ${dot(s.color)}<span class="name">${esc(catName(s.id))}</span>
              <span class="amt">${money(s.value)}</span>
              <span class="pct">${Math.round((s.value / total) * 100)}%</span>
            </button>`).join('')}</div>
        </div>
      </div>`;

    if (r.months.length > 1 && r.months.length <= 24) {
      const perMonth = r.months.map((k) => ({ k, v: sum(found.filter((e) => e.date.startsWith(k)), (e) => e.amount) }));
      const max = Math.max(...perMonth.map((x) => x.v)) || 1;
      byMonth = `<div class="card">
          <h2>${t('byMonth')}</h2>
          <div class="month-bars">${perMonth.map((x) => `
            <div class="mb-row ${x.k === cur ? 'cur' : ''}">
              <span>${shortMonth(x.k)}</span>
              <div class="bar"><i style="width:${(x.v / max) * 100}%"></i></div>
              <b>${money(x.v)}</b>
            </div>`).join('')}</div>
        </div>`;
    }
  }

  let rows = '', lastDay = '';
  found.slice(0, histLimit).forEach((e) => {
    if (e.date !== lastDay) { rows += `<div class="day-head">${dayLabel(e.date)}</div>`; lastDay = e.date; }
    const c = catById(e.cat);
    rows += `<button class="row" data-action="edit-expense" data-id="${e.id}">
      ${dot(c.color)}
      <span class="name">${esc(e.note || catName(c.id))}${e.note ? `<small>${esc(catName(c.id))}</small>` : ''}</span>
      <span class="amt">${money(e.amount)}</span></button>`;
  });

  $('#hist-results').innerHTML = `
    ${stats}
    ${byCat}
    ${byMonth}
    <div class="card span-2">
      <div class="card-head"><h2>${t('resultsCount', found.length)}</h2></div>
      ${rows ? `<div class="list">${rows}</div>` : `<div class="empty">${t('noResults')}</div>`}
      ${found.length > histLimit ? `<div class="btn-row"><button class="btn" data-action="hist-more">${t('showMore')}</button></div>` : ''}
    </div>`;
}

/* ---------- Γενική απόδοση ---------- */

function render() {
  // πλήρες όνομα μήνα, και σύντομο για μικρές οθόνες κινητού (το διαλέγει το CSS)
  $('#month-label').innerHTML = `<span class="m-long">${esc(monthName(cur))}</span><span class="m-short">${esc(shortMonth(cur))}</span>`;
  renderInstallBar();
  renderBudget();
  renderIncome();
  renderRecurring();
  renderPockets();
  renderGoals();
  renderExpenses();
  renderTrips();
  updateBadges();
}

/* ---------- Ομάδα «Καταχώρηση προϋπολογισμού» στο μενού ---------- */

const GROUP_KEY = 'ta-lefta-mou-group';
const GROUP_TABS = ['income', 'recurring', 'pockets', 'goals'];
// Στο κινητό το μενού είναι κάτω και η ομάδα ανοίγει σαν μικρό αναδυόμενο μενού
const isPhone = () => matchMedia('(max-width: 819px)').matches;
let groupOpen = false;
try { groupOpen = !isPhone() && localStorage.getItem(GROUP_KEY) !== '0'; } catch (e) { groupOpen = !isPhone(); }

function setGroupOpen(open) {
  groupOpen = open;
  $('.tab-group').classList.toggle('open', open);
  $('.group-btn').setAttribute('aria-expanded', String(open));
  if (!isPhone()) { try { localStorage.setItem(GROUP_KEY, open ? '1' : '0'); } catch (e) { /* δεν πειράζει */ } }
}

function showTab(tab) {
  document.querySelectorAll('.tabs [data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $('.group-btn').classList.toggle('has-active', GROUP_TABS.includes(tab));
  if (isPhone() && groupOpen) setGroupOpen(false);
  TABS.forEach((x) => { $('#page-' + x).hidden = x !== tab; });
  window.scrollTo(0, 0);
}

/* ---------- Φόρμες σε παράθυρο ---------- */

function fieldHTML(f) {
  const v = f.value ?? '';
  switch (f.type) {
    case 'money':
      return `<label class="field"><span>${esc(f.label)}</span><input type="text" inputmode="decimal" class="money-input"
        name="${f.name}" value="${esc(moneyInputValue(v))}" placeholder="${esc(f.placeholder || '')}"></label>`;
    case 'date':
      return `<label class="field"><span>${esc(f.label)}</span><input type="date" name="${f.name}" value="${esc(v)}"></label>`;
    case 'select':
      return `<label class="field"><span>${esc(f.label)}</span><select name="${f.name}">${f.options.map((o) =>
        `<option value="${esc(o.value)}" ${o.value === v ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>`;
    case 'int':
      return `<label class="field"><span>${esc(f.label)}</span><input type="text" inputmode="numeric" name="${f.name}"
        value="${esc(v)}" placeholder="—" maxlength="4"></label>`;
    case 'check':
      return `<label class="check-field"><input type="checkbox" name="${f.name}" ${v ? 'checked' : ''}><span>${esc(f.label)}</span></label>`;
    case 'colors':
      return `<div class="field"><span>${esc(f.label)}</span><div class="color-pick">${f.options.map((c) =>
        `<button type="button" data-color="${c}" class="${c === v ? 'active' : ''}" style="background:${c}" aria-label="${t('color')}"></button>`).join('')}</div>
        <input type="hidden" name="${f.name}" value="${esc(v)}"></div>`;
    default:
      return `<label class="field"><span>${esc(f.label)}</span><input type="text" name="${f.name}" value="${esc(v)}"
        placeholder="${esc(f.placeholder || '')}" maxlength="40"></label>`;
  }
}

function openForm({ title, intro, fields, submitText, onSubmit, onDelete, deleteConfirm }) {
  const dlg = $('#dlg');
  const form = $('#dlg-form');
  form.innerHTML = `<h2>${esc(title)}</h2>${intro ? `<p class="hint" style="margin:0 0 12px">${esc(intro)}</p>` : ''}${fields.map(fieldHTML).join('')}
    <p class="form-err" hidden></p>
    <div class="dlg-actions">
      ${onDelete ? `<button type="button" class="btn danger" data-dlg="delete">${t('del')}</button>` : ''}
      <span class="spacer"></span>
      <button type="button" class="btn" data-dlg="cancel">${t('cancel')}</button>
      <button type="submit" class="btn primary">${esc(submitText || t('save'))}</button>
    </div>`;

  form.onclick = (e) => {
    const sw = e.target.closest('[data-color]');
    if (sw) {
      const box = sw.parentElement;
      box.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === sw));
      box.parentElement.querySelector('input[type=hidden]').value = sw.dataset.color;
      return;
    }
    const act = e.target.closest('[data-dlg]');
    if (!act) return;
    if (act.dataset.dlg === 'cancel') dlg.close();
    if (act.dataset.dlg === 'delete' && confirm(deleteConfirm || t('confirmDelete'))) {
      onDelete(); dlg.close(); save(); render();
    }
  };

  form.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = {};
    fields.forEach((f) => {
      const raw = fd.get(f.name);
      if (f.type === 'check') data[f.name] = raw === 'on';
      else if (f.type === 'int') data[f.name] = String(raw).trim() === '' ? null : (/^\d+$/.test(String(raw).trim()) ? +String(raw).trim() : NaN);
      else data[f.name] = f.type === 'money' ? (String(raw).trim() === '' ? 0 : parseMoney(raw)) : String(raw ?? '').trim();
    });
    const err = onSubmit(data);
    if (err) {
      const p = form.querySelector('.form-err');
      p.textContent = err; p.hidden = false;
      return;
    }
    dlg.close(); save(); render();
  };

  dlg.showModal();
  const first = form.querySelector('input:not([type=hidden]), select');
  if (first) first.focus();
}

/* ---------- Ενέργειες ---------- */

const actions = {
  'prev-month'() { cur = shiftMonth(cur, -1); filterCat = null; incomeYear = null; render(); },
  'next-month'() { cur = shiftMonth(cur, 1); filterCat = null; incomeYear = null; render(); },
  'toggle-lang'() { setLang(lang === 'el' ? 'en' : 'el'); },
  'toggle-group'() { setGroupOpen(!groupOpen); },

  'trip-new'() { tripForm(null); },
  'trip-open'(d) { openTripId = d.id; pickedTripCat = null; renderTrips(); window.scrollTo(0, 0); },
  'trip-back'() { openTripId = null; renderTrips(); window.scrollTo(0, 0); },
  'trip-edit'() { tripForm(state.trips.find((x) => x.id === openTripId)); },
  'trip-finish'() {
    const tr = state.trips.find((x) => x.id === openTripId);
    tr.done = !tr.done;
    save(); renderTrips();
  },
  'trip-add-cat'() { tripCatForm(null); },
  'trip-toggle-edit-cats'() { editTripCats = !editTripCats; renderTrips(); },
  'trip-pick-cat'(d, el) {
    if (editTripCats) {
      const custom = state.tripCustomCats.find((c) => c.id === d.cat);
      if (custom) tripCatForm(custom);
      return;
    }
    pickedTripCat = d.cat;
    el.parentElement.querySelectorAll('.cat').forEach((b) => b.classList.toggle('active', b === el));
    const amt = $('#trip-amount');
    if (!amt.value) amt.focus();
  },
  'trip-add'() { addTripExpense(); },
  'trip-exp-edit'(d) {
    const tr = state.trips.find((x) => x.id === openTripId);
    tripExpenseForm(tr, tr.expenses.find((e) => e.id === d.id));
  },
  'goal-edit'(d) { goalForm(d.cat); },
  'goal-custom'() { goalCustomForm(); },
  'rec-add'(d) { recForm(null, d.type); },
  'rec-edit'(d) { recForm(state.recurring.find((r) => r.id === d.id)); },
  'rec-paid'(d) { markPaid(state.recurring.find((r) => r.id === d.id)); },
  'rec-cal'(d) {
    const r = state.recurring.find((x) => x.id === d.id);
    downloadIcs([r], `${norm(recName(r)).replace(/[^a-z0-9α-ω]+/g, '-') || 'pliromi'}.ics`);
  },
  'rec-cal-all'() { downloadIcs(state.recurring.filter(recActive), 'pliromes.ics'); },
  async 'notif-on'() {
    try { await Notification.requestPermission(); } catch (e) { /* παλιοί browser */ }
    render();
    checkNotifications();
  },

  'income-type'(d) {
    state.income.type = d.type;
    save(); render();
  },
  'income-year'(d) {
    incomeYear = (incomeYear ?? +cur.slice(0, 4)) + Number(d.dir);
    renderIncome();
  },

  'add-fixed'() { fixedForm(); },
  'edit-fixed'(d) { fixedForm(state.fixed.find((f) => f.id === d.id)); },

  'add-pocket'(d) { pocketForm(null, d.name || ''); },
  'edit-pocket'(d) { pocketForm(state.pockets.find((p) => p.id === d.id)); },
  'pocket-plan'(d) {
    const p = state.pockets.find((x) => x.id === d.id);
    p.tx.push({ id: uid(), date: todayISO(), amount: p.monthly, plan: cur });
    save(); render();
    toast(t('addedToPocket', money(p.monthly), p.name));
  },
  'pocket-add'(d) { pocketMoveForm(state.pockets.find((p) => p.id === d.id), 1); },
  'pocket-take'(d) { pocketMoveForm(state.pockets.find((p) => p.id === d.id), -1); },

  'exp-view'(d) { expView = d.view; renderExpenses(); },
  'hist-period'(d) { histPeriod = Number(d.p); histFrom = histTo = ''; histLimit = 50; renderExpenses(); },
  'hist-clear-dates'() { histFrom = histTo = ''; histLimit = 50; renderExpenses(); },
  'hist-cat'(d) { histQuery = catName(d.cat); histLimit = 50; renderExpenses(); },
  'hist-more'() { histLimit += 50; renderHistoryResults(); },
  'add-cat'() { catForm(); },
  'toggle-edit-cats'() { editCats = !editCats; renderExpenses(); },
  'pick-cat'(d, el) {
    const custom = state.customCats.find((c) => c.id === d.cat);
    if (editCats) { if (custom) catForm(custom); return; }
    pickedCat = d.cat;
    el.parentElement.querySelectorAll('.cat').forEach((b) => b.classList.toggle('active', b === el));
    const amt = $('#exp-amount');
    if (!amt.value) amt.focus();
  },
  'add-expense'() { addExpense(); },
  'edit-expense'(d) { expenseForm(state.expenses.find((e) => e.id === d.id)); },
  'filter-cat'(d) {
    filterCat = d.cat && d.cat !== filterCat ? d.cat : null;
    renderExpenses();
  },

  'export'() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `to-portofoli-mou-${todayISO()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(t('backupSaved'));
  },
  'import'() { $('#import-file').click(); },
  // «Κατέβασέ με!»: στο Android βγάζει κατευθείαν την εγκατάσταση· στο iPhone δείχνει τα βήματα
  async 'install'() {
    if (!installPrompt) { showInstallHelp(); return; }
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    installPrompt = null;
    if (choice && choice.outcome === 'accepted') toast(t('installDone'));
    renderInstallBar();
  },
  'install-hide'() {
    try { localStorage.setItem(INSTALL_KEY, String(Date.now())); } catch (e) { /* δεν πειράζει */ }
    renderInstallBar();
  },
  'reset'() {
    if (!confirm(t('confirmReset'))) return;
    state = emptyState(); save(); render();
    toast(t('resetDone'));
  },
};

function addExpense() {
  const amtEl = $('#exp-amount');
  const amount = parseMoney(amtEl.value);
  if (!(amount > 0)) { toast(t('enterSpent')); amtEl.focus(); return; }
  if (!pickedCat) { toast(t('pickCat')); return; }
  const date = $('#exp-date').value || defaultExpenseDate();
  const cat = pickedCat;
  const before = catSpent(cat, date.slice(0, 7));
  state.expenses.push({ id: uid(), date, amount, cat, note: $('#exp-note').value.trim(), created: Date.now() });
  pickedCat = null;
  amtEl.value = ''; $('#exp-note').value = '';
  save(); render();
  const alert = goalAlert(cat, date.slice(0, 7), before);
  if (alert) toast(alert, true);
  else toast(t('expenseAdded', money(amount), catName(cat)));
  $('#exp-amount').focus();
}

// Δική τους κατηγορία εξόδων: νέα ή αλλαγή υπάρχουσας
function catForm(item) {
  const used = new Set(allCats().map((c) => c.color));
  const inUse = item ? state.expenses.filter((e) => e.cat === item.id).length : 0;
  openForm({
    title: item ? t('catTitle') : t('newCatTitle'),
    fields: [
      { name: 'name', label: t('name'), value: item?.name, placeholder: t('egCat') },
      { name: 'color', label: t('color'), type: 'colors', options: CAT_COLORS,
        value: item ? item.color : (CAT_COLORS.find((c) => !used.has(c)) || CAT_COLORS[0]) },
    ],
    onSubmit(d) {
      if (!d.name) return t('errName');
      const clash = allCats().find((c) => c !== item && catName(c.id).trim().toLowerCase() === d.name.toLowerCase());
      if (clash) return t('errCatExists');
      if (item) Object.assign(item, { name: d.name, color: d.color });
      else {
        const c = { id: 'c_' + uid(), name: d.name, color: d.color };
        state.customCats.push(c);
        pickedCat = c.id; // διαλέγεται αμέσως για το έξοδο που γράφεις
      }
    },
    deleteConfirm: inUse ? t('confirmDeleteCat', inUse) : null,
    onDelete: item ? () => {
      state.expenses.forEach((e) => { if (e.cat === item.id) e.cat = 'other'; });
      state.customCats = state.customCats.filter((c) => c !== item);
      delete state.goals[item.id];
      if (pickedCat === item.id) pickedCat = null;
      if (filterCat === item.id) filterCat = null;
      if (!state.customCats.length) editCats = false;
    } : null,
  });
}

function fixedForm(item) {
  openForm({
    title: item ? t('fixedTitle') : t('newFixedTitle'),
    fields: [
      { name: 'name', label: t('whatIsIt'), value: item?.name, placeholder: t('egRent') },
      { name: 'amount', label: t('costPerMonth'), type: 'money', value: item?.amount },
    ],
    onSubmit(d) {
      if (!d.name) return t('errName');
      if (!(d.amount > 0)) return t('errAmount');
      if (item) Object.assign(item, d);
      else state.fixed.push({ id: uid(), ...d });
    },
    onDelete: item ? () => { state.fixed = state.fixed.filter((f) => f !== item); } : null,
  });
}

// Νέα αποταμίευση ή αλλαγή υπάρχουσας — όλα τα στοιχεία αλλάζουν, και το ποσό που έχει μέσα
function pocketForm(item, presetName) {
  openForm({
    title: item ? t('pocketTitle') : t('newPocket'),
    fields: [
      { name: 'name', label: t('name'), value: item ? item.name : presetName, placeholder: t('egHoliday') },
      { name: 'color', label: t('color'), type: 'colors', options: POCKET_COLORS,
        value: item ? pocketColor(item) : POCKET_COLORS[state.pockets.length % POCKET_COLORS.length] },
      { name: 'goal', label: t('goalOpt'), type: 'money', value: item?.goal || '', placeholder: t('egGoal') },
      { name: 'monthly', label: t('monthlyAmt'), type: 'money', value: item?.monthly || '', placeholder: t('egMonthly') },
      item
        ? { name: 'balance', label: t('balanceNow'), type: 'money', value: pocketBalance(item), placeholder: '0' }
        : { name: 'balance', label: t('startAmt'), type: 'money', value: '', placeholder: '0' },
    ],
    onSubmit(d) {
      if (!d.name) return t('errName');
      if ([d.goal, d.monthly, d.balance].some((n) => Number.isNaN(n) || n < 0)) return t('errAmounts');
      if (item) {
        Object.assign(item, { name: d.name, color: d.color, goal: d.goal, monthly: d.monthly });
        // Η διαφορά στο ποσό καταγράφεται ως διόρθωση, ώστε να μένει το ιστορικό
        const diff = round2(d.balance - pocketBalance(item));
        if (diff !== 0) item.tx.push({ id: uid(), date: todayISO(), amount: diff, adjust: true });
      } else {
        const p = { id: uid(), name: d.name, color: d.color, goal: d.goal, monthly: d.monthly, tx: [] };
        if (d.balance > 0) p.tx.push({ id: uid(), date: todayISO(), amount: d.balance });
        state.pockets.push(p);
      }
    },
    onDelete: item ? () => { state.pockets = state.pockets.filter((p) => p !== item); } : null,
  });
}

function pocketMoveForm(p, sign) {
  const bal = pocketBalance(p);
  openForm({
    title: t('moveTitle', p.name, sign > 0),
    fields: [{ name: 'amount', label: sign > 0 ? t('howMuchPut') : t('howMuchTake', money(bal)), type: 'money' }],
    submitText: sign > 0 ? t('putBtn') : t('takeBtn'),
    onSubmit(d) {
      if (!(d.amount > 0)) return t('errAmount');
      if (sign < 0 && d.amount > bal + 0.001) return t('onlyHave', money(bal));
      p.tx.push({ id: uid(), date: todayISO(), amount: sign * d.amount });
      setTimeout(() => toast(`${p.name}: ${sign > 0 ? '+' : '−'}${money(d.amount)}`), 0);
    },
  });
}

function expenseForm(e) {
  openForm({
    title: t('expenseTitle'),
    fields: [
      { name: 'amount', label: t('amount'), type: 'money', value: e.amount },
      { name: 'cat', label: t('category'), type: 'select', value: e.cat, options: allCats().map((c) => ({ value: c.id, label: catName(c.id) })) },
      { name: 'note', label: t('note'), value: e.note },
      { name: 'date', label: t('date'), type: 'date', value: e.date },
    ],
    onSubmit(d) {
      if (!(d.amount > 0)) return t('errAmount');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) return t('errDate');
      // υπολογίζουμε το «πριν» σαν να μην υπήρχε αυτό το έξοδο στη νέα του κατηγορία/μήνα
      const sameSlot = e.cat === d.cat && e.date.slice(0, 7) === d.date.slice(0, 7);
      const before = catSpent(d.cat, d.date.slice(0, 7)) - (sameSlot ? e.amount : 0);
      Object.assign(e, d);
      const alert = goalAlert(d.cat, d.date.slice(0, 7), before);
      if (alert) setTimeout(() => toast(alert, true), 0);
    },
    onDelete: () => { state.expenses = state.expenses.filter((x) => x !== e); },
  });
}

/* ---------- Πεδία που αποθηκεύονται μόλις αλλάξουν ---------- */

const binds = {
  'income-fixed'(el) {
    const n = el.value.trim() === '' ? 0 : parseMoney(el.value);
    if (Number.isNaN(n) || n < 0) { toast(t('errValidAmount')); return; }
    state.income.fixed = n;
    save(); render();
  },
  'income-month'(el) {
    const key = el.dataset.month;
    if (el.value.trim() === '') delete state.income.monthly[key];
    else {
      const n = parseMoney(el.value);
      if (Number.isNaN(n) || n < 0) { toast(t('errValidAmount')); return; }
      state.income.monthly[key] = n;
    }
    save();
    renderKeepingMonthFocus();
  },
  'chart-fixed'(el) { showFixedInChart = el.checked; renderExpenses(); },
  'hist-from'(el) { histFrom = el.value; histLimit = 50; renderExpenses(); },
  'hist-to'(el) { histTo = el.value; histLimit = 50; renderExpenses(); },
};

// Όταν συμπληρώνεις τους μήνες έναν-έναν, η σελίδα ξαναζωγραφίζεται χωρίς να χάνεται
// ο μήνας που πήγες μετά (ο κέρσορας μένει εκεί)
function renderKeepingMonthFocus() {
  setTimeout(() => {
    const next = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.month : null;
    render();
    if (next) {
      const el = document.querySelector(`[data-month="${next}"]`);
      if (el) { el.focus(); el.select(); }
    }
  }, 0);
}

/* ---------- Σύνδεση γεγονότων ---------- */

document.addEventListener('click', (e) => {
  if (e.target.closest('dialog')) return;
  // στο κινητό, πάτημα έξω από το αναδυόμενο μενού το κλείνει
  if (groupOpen && isPhone() && !e.target.closest('.tab-group')) setGroupOpen(false);
  const el = e.target.closest('[data-action], [data-tab]');
  if (!el) return;
  if (el.dataset.tab) { showTab(el.dataset.tab); return; }
  const fn = actions[el.dataset.action];
  if (fn) fn(el.dataset, el);
});

document.addEventListener('change', (e) => {
  const b = e.target.dataset && e.target.dataset.bind;
  if (b && binds[b]) binds[b](e.target);
});

// Αναζήτηση όσο γράφεις
document.addEventListener('input', (e) => {
  if (e.target.id !== 'hist-q') return;
  histQuery = e.target.value;
  histLimit = 50;
  renderHistoryResults();
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  if (e.target.id === 'exp-amount' || e.target.id === 'exp-note') { e.preventDefault(); addExpense(); }
  else if (e.target.id === 'trip-amount' || e.target.id === 'trip-note') { e.preventDefault(); addTripExpense(); }
  else if (e.target.dataset && e.target.dataset.month) {
    // Enter σε έναν μήνα → πάει στον επόμενο
    e.preventDefault();
    const all = [...document.querySelectorAll('[data-month]')];
    const next = all[all.indexOf(e.target) + 1];
    if (next) next.focus(); else e.target.blur();
  }
  else if (e.target.dataset && e.target.dataset.bind) e.target.blur();
});

$('#import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data || !data.income || !Array.isArray(data.expenses)) throw new Error('bad');
    if (!confirm(t('confirmImport'))) return;
    state = normalize(data);
    save(); render();
    toast(t('importDone'));
  } catch (err) {
    toast(t('importBad'));
  }
});

/* ---------- Έναρξη ---------- */

applyStaticTexts();
setGroupOpen(groupOpen);
render();
// Ανοίγει πάντα στο «Ο μήνας μου» — εκτός αν είναι νέος χρήστης χωρίς μισθό, που ξεκινά από τη Μισθοδοσία
const isNewUser = !(state.income.fixed > 0) && !Object.keys(state.income.monthly).length;
showTab(isNewUser ? 'income' : 'budget');

// Λειτουργία χωρίς internet & εγκατάσταση (μόνο όταν η σελίδα ανοίγει από διεύθυνση web)
if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
  // Όταν έρθει νέα έκδοση ενώ η εφαρμογή είναι ανοιχτή, ξαναφορτώνει μία φορά για να φανεί αμέσως
  // (όχι την πρώτη φορά που εγκαθίσταται, όταν δεν υπήρχε προηγούμενη έκδοση)
  const hadVersion = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadVersion && !reloaded && !$('#dlg').open) { reloaded = true; location.reload(); }
  });
  navigator.serviceWorker.register('sw.js').catch(() => { /* συνεχίζει και χωρίς */ });
}
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();   // κρατάμε το παράθυρο εγκατάστασης για όταν πατηθεί το «Κατέβασέ με!»
  installPrompt = e;
  renderInstallBar();
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  try { localStorage.setItem(INSTALL_KEY, String(Date.now() + 3650 * 864e5)); } catch (e) { /* δεν πειράζει */ }
  renderInstallBar();
});
// Υπενθυμίσεις πληρωμών: με το άνοιγμα, όταν ξαναγυρνάς στην εφαρμογή, και κάθε ώρα όσο είναι ανοιχτή
checkNotifications();
setInterval(() => { checkNotifications(); updateBadges(); }, 60 * 60 * 1000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { render(); checkNotifications(); }
});
// Ζητάμε από τον browser να μη σβήσει τα δεδομένα όταν γεμίσει η συσκευή
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
