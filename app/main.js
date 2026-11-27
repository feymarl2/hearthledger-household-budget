import { CATEGORIES, MEMBERS, DEFAULT_BUDGETS, DEFAULT_GOALS, seedTransactions } from "./data.js";
import { catName, catColor, esc, fmt, monthKey, monthLabel, monthTotals, drawDonut, drawBars, budgetRows, txTable } from "./views.js";

const STORE_KEY = "hearthledger-v1";
let state = load();
let currentMonth = latestMonth();
let txFilter = { q: "", category: "all", kind: "all" };

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* fresh start below */ }
  return { tx: seedTransactions(), budgets: { ...DEFAULT_BUDGETS }, goals: DEFAULT_GOALS.map((g) => ({ ...g })), currency: "$" };
}
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
function months() {
  const set = [...new Set(state.tx.map((t) => monthKey(t.date)))].sort();
  return set.length ? set : [monthKey(new Date().toISOString())];
}
function latestMonth() { const m = months(); return m[m.length - 1]; }
function monthTx(key) { return state.tx.filter((t) => monthKey(t.date) === key); }

const viewEl = document.getElementById("view");
const titleEl = document.getElementById("page-title");
const subEl = document.getElementById("page-sub");
const monthSel = document.getElementById("month-select");

function refreshMonths() {
  monthSel.innerHTML = months().map((m) => `<option value="${m}"${m === currentMonth ? " selected" : ""}>${monthLabel(m)}</option>`).join("");
  const t = monthTotals(state.tx, currentMonth);
  const budgetTotal = Object.values(state.budgets).reduce((s, v) => s + v, 0);
  const safe = Math.max(0, t.income - budgetTotal);
  document.getElementById("side-safe").textContent = fmt(safe, state.currency);
  document.getElementById("side-safe-note").textContent = `Income ${fmt(t.income, state.currency)} minus budgets ${fmt(budgetTotal, state.currency)} for ${monthLabel(currentMonth)}.`;
}
monthSel.addEventListener("change", () => { currentMonth = monthSel.value; render(); });

function setHead(title, sub) { titleEl.textContent = title; subEl.textContent = sub; }

function renderDashboard() {
  setHead("Dashboard", `Your household money for ${monthLabel(currentMonth)}.`);
  const t = monthTotals(state.tx, currentMonth);
  const keys = months().slice(-6);
  const prevKey = keys[keys.length - 2];
  const prev = prevKey ? monthTotals(state.tx, prevKey) : null;
  const delta = prev ? t.expense - prev.expense : 0;
  const entries = Object.entries(t.byCat).map(([id, value]) => ({ id, value, color: catColor(id) })).sort((a, b) => b.value - a.value);
  const recent = monthTx(currentMonth).slice(0, 6);
  const goals = state.goals.filter((g) => g.saved < g.target).slice(0, 3);
  viewEl.innerHTML = `
  <div class="grid grid-4">
    <div class="card"><p class="stat-label">Income</p><p class="stat-value">${fmt(t.income, state.currency)}</p><p class="stat-note">Two salaries + extras</p></div>
    <div class="card"><p class="stat-label">Spending</p><p class="stat-value">${fmt(t.expense, state.currency)}</p><p class="stat-note ${delta <= 0 ? "good" : "bad"}">${prev ? `${delta <= 0 ? "▼" : "▲"} ${fmt(Math.abs(delta), state.currency)} vs ${monthLabel(prevKey)}` : "First month tracked"}</p></div>
    <div class="card"><p class="stat-label">Left over</p><p class="stat-value">${fmt(t.net, state.currency)}</p><p class="stat-note ${t.net >= 0 ? "good" : "bad"}">${t.net >= 0 ? "Saving this month" : "Over income this month"}</p></div>
    <div class="card"><p class="stat-label">Savings rate</p><p class="stat-value">${t.income ? Math.round((t.net / t.income) * 100) : 0}%</p><p class="stat-note">Share of income kept</p></div>
  </div>
  <div class="grid grid-main" style="margin-top:16px">
    <div class="card">
      <div class="card-head"><h2>Income vs spending</h2><a href="#/reports">Full report →</a></div>
      <canvas class="chart" id="bars" width="640" height="260"></canvas>
      <div class="legend"><span><span class="dot" style="background:#2e7d5b"></span>Income</span><span><span class="dot" style="background:#c05621"></span>Spending</span></div>
    </div>
    <div class="card">
      <h2>Where it went</h2>
      <canvas class="chart" id="donut" width="280" height="280" style="max-width:240px;margin:0 auto"></canvas>
      <div class="legend">${entries.slice(0, 6).map((e) => `<span><span class="dot" style="background:${e.color}"></span>${esc(catName(e.id))} ${fmt(e.value, state.currency)}</span>`).join("")}</div>
    </div>
  </div>
  <div class="grid grid-2" style="margin-top:16px">
    <div class="card">
      <div class="card-head"><h2>Budgets this month</h2><a href="#/budgets">Adjust →</a></div>
      ${budgetRows(t.byCat, state.budgets)}
    </div>
    <div>
      <div class="card">
        <div class="card-head"><h2>Recent transactions</h2><a href="#/transactions">All →</a></div>
        ${txTable(recent)}
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-head"><h2>Savings goals</h2><a href="#/goals">All goals →</a></div>
        ${goals.map((g) => `<div class="budget-row"><div class="budget-top"><b>${esc(g.name)}</b><span>${fmt(g.saved, state.currency)} <span class="muted">of ${fmt(g.target, state.currency)}</span></span></div><div class="bar"><i style="width:${Math.min(100, (g.saved / g.target) * 100).toFixed(1)}%"></i></div></div>`).join("") || `<p class="muted">Every goal reached. Time to dream bigger.</p>`}
      </div>
    </div>
  </div>`;
  drawBars(document.getElementById("bars"), keys.map((k) => monthLabel(k).slice(0, 3)), keys.map((k) => monthTotals(state.tx, k).income), keys.map((k) => monthTotals(state.tx, k).expense));
  drawDonut(document.getElementById("donut"), entries);
  wireTxButtons();
}

function renderTransactions() {
  setHead("Transactions", `Every entry for ${monthLabel(currentMonth)}.`);
  let list = monthTx(currentMonth);
  if (txFilter.kind !== "all") list = list.filter((t) => t.kind === txFilter.kind);
  if (txFilter.category !== "all") list = list.filter((t) => t.category === txFilter.category);
  if (txFilter.q) list = list.filter((t) => t.desc.toLowerCase().includes(txFilter.q.toLowerCase()));
  const t = monthTotals(state.tx, currentMonth);
  viewEl.innerHTML = `
  <div class="card">
    <div class="toolbar">
      <input type="search" id="tx-search" placeholder="Search descriptions…" value="${esc(txFilter.q)}" aria-label="Search transactions">
      <select id="tx-kind-filter" aria-label="Filter by kind">
        <option value="all"${txFilter.kind === "all" ? " selected" : ""}>Income + expenses</option>
        <option value="expense"${txFilter.kind === "expense" ? " selected" : ""}>Expenses only</option>
        <option value="income"${txFilter.kind === "income" ? " selected" : ""}>Income only</option>
      </select>
      <select id="tx-cat-filter" aria-label="Filter by category">
        <option value="all">All categories</option>
        ${CATEGORIES.map((c) => `<option value="${c.id}"${txFilter.category === c.id ? " selected" : ""}>${esc(c.name)}</option>`).join("")}
      </select>
      <button class="btn" id="csv-btn" type="button">Export CSV</button>
    </div>
    <p class="small muted">${list.length} shown · income ${fmt(t.income, state.currency)} · spending ${fmt(t.expense, state.currency)} · left over ${fmt(t.net, state.currency)}</p>
    ${txTable(list)}
  </div>`;
  document.getElementById("tx-search").addEventListener("input", (e) => { txFilter.q = e.target.value; renderTransactions(); const s = document.getElementById("tx-search"); s.focus(); s.setSelectionRange(s.value.length, s.value.length); });
  document.getElementById("tx-kind-filter").addEventListener("change", (e) => { txFilter.kind = e.target.value; renderTransactions(); });
  document.getElementById("tx-cat-filter").addEventListener("change", (e) => { txFilter.category = e.target.value; renderTransactions(); });
  document.getElementById("csv-btn").addEventListener("click", exportCsv);
  wireTxButtons();
}

function exportCsv() {
  const rows = [["date", "description", "category", "kind", "member", "amount"]];
  for (const t of monthTx(currentMonth)) rows.push([t.date, t.desc, catName(t.category), t.kind, t.member, t.amount]);
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `hearthledger-${currentMonth}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function renderBudgets() {
  setHead("Budgets", "Monthly limits per category. Change a limit and the bars follow.");
  const t = monthTotals(state.tx, currentMonth);
  const totalBudget = Object.values(state.budgets).reduce((s, v) => s + v, 0);
  viewEl.innerHTML = `
  <div class="grid grid-main">
    <div class="card"><h2>${monthLabel(currentMonth)} progress</h2>${budgetRows(t.byCat, state.budgets)}</div>
    <div class="card">
      <h2>Edit monthly limits</h2>
      <form id="budget-form">
        ${Object.keys(state.budgets).map((id) => `<label>${esc(catName(id))}<input type="number" min="0" step="1" name="${id}" value="${state.budgets[id]}"></label>`).join("")}
        <button class="btn btn-primary" type="submit">Save budgets</button>
        <p class="small muted" style="margin-top:10px">Total planned: ${fmt(totalBudget, state.currency)} against income ${fmt(t.income, state.currency)}.</p>
      </form>
    </div>
  </div>`;
  document.getElementById("budget-form").addEventListener("submit", (e) => {
    e.preventDefault();
    for (const id of Object.keys(state.budgets)) state.budgets[id] = Math.max(0, Number(new FormData(e.target).get(id)) || 0);
    save(); refreshMonths(); renderBudgets();
  });
}

function renderGoals() {
  setHead("Savings goals", "What the household is putting money aside for.");
  viewEl.innerHTML = `
  <div class="grid grid-2">
    ${state.goals.map((g) => {
      const pct = Math.min(100, (g.saved / g.target) * 100);
      return `<div class="goal">
        <h3>${esc(g.name)}</h3>
        <p class="small muted" style="margin:0">${esc(g.note)}</p>
        <div class="bar"><i style="width:${pct.toFixed(1)}%"></i></div>
        <p class="small">${fmt(g.saved, state.currency)} of ${fmt(g.target, state.currency)} · ${pct.toFixed(0)}%${g.saved >= g.target ? " · <b>reached</b>" : ` · ${fmt(g.target - g.saved, state.currency)} to go`}</p>
        <form class="goal-add" data-goal="${g.id}" style="display:flex;gap:8px;margin-top:8px">
          <input type="number" min="1" step="1" placeholder="Add amount" aria-label="Add to ${esc(g.name)}" style="flex:1">
          <button class="btn btn-small" type="submit">Add</button>
        </form>
      </div>`;
    }).join("")}
    <div class="goal">
      <h3>New goal</h3>
      <form id="goal-form">
        <label>Name<input id="goal-name" required maxlength="60" placeholder="New roof fund"></label>
        <label>Target<input id="goal-target" required type="number" min="1" step="1" placeholder="1000"></label>
        <label>Note<input id="goal-note" maxlength="80" placeholder="Why it matters"></label>
        <button class="btn btn-primary" type="submit">Create goal</button>
      </form>
    </div>
  </div>`;
  document.querySelectorAll(".goal-add").forEach((f) => f.addEventListener("submit", (e) => {
    e.preventDefault();
    const g = state.goals.find((x) => x.id === f.dataset.goal);
    const amt = Number(f.querySelector("input").value) || 0;
    if (g && amt > 0) { g.saved = Math.min(g.target, g.saved + amt); save(); renderGoals(); }
  }));
  document.getElementById("goal-form").addEventListener("submit", (e) => {
    e.preventDefault();
    state.goals.push({ id: "g" + Date.now(), name: document.getElementById("goal-name").value, target: Number(document.getElementById("goal-target").value) || 0, saved: 0, note: document.getElementById("goal-note").value });
    save(); renderGoals();
  });
}

function renderReports() {
  setHead("Reports", "Six months of household money, side by side.");
  const keys = months().slice(-6);
  const rows = keys.map((k) => {
    const t = monthTotals(state.tx, k);
    const top = Object.entries(t.byCat).sort((a, b) => b[1] - a[1])[0];
    return `<tr><td>${monthLabel(k)}</td><td class="num">${fmt(t.income, state.currency)}</td><td class="num">${fmt(t.expense, state.currency)}</td><td class="num">${fmt(t.net, state.currency)}</td><td>${top ? `${esc(catName(top[0]))} (${fmt(top[1], state.currency)})` : "—"}</td></tr>`;
  }).join("");
  const t = monthTotals(state.tx, currentMonth);
  const entries = Object.entries(t.byCat).map(([id, value]) => ({ id, value })).sort((a, b) => b.value - a.value);
  viewEl.innerHTML = `
  <div class="card" style="margin-bottom:16px">
    <h2>Income vs spending, last ${keys.length} months</h2>
    <canvas class="chart" id="rep-bars" width="900" height="300"></canvas>
    <div class="legend"><span><span class="dot" style="background:#2e7d5b"></span>Income</span><span><span class="dot" style="background:#c05621"></span>Spending</span></div>
  </div>
  <div class="grid grid-main">
    <div class="card"><h2>Month by month</h2>
      <table><thead><tr><th>Month</th><th class="num">Income</th><th class="num">Spending</th><th class="num">Left over</th><th>Biggest category</th></tr></thead><tbody>${rows}</tbody></table>
    </div>
    <div class="card"><h2>${monthLabel(currentMonth)} by category</h2>
      ${entries.map((e) => `<div class="kv"><span><span class="dot" style="background:${catColor(e.id)}"></span> ${esc(catName(e.id))}</span><b>${fmt(e.value, state.currency)}</b></div>`).join("")}
      <div class="kv"><span>All spending</span><b>${fmt(t.expense, state.currency)}</b></div>
    </div>
  </div>`;
  drawBars(document.getElementById("rep-bars"), keys.map((k) => monthLabel(k).slice(0, 3)), keys.map((k) => monthTotals(state.tx, k).income), keys.map((k) => monthTotals(state.tx, k).expense));
}

function renderSettings() {
  setHead("Settings", "Household members, currency and your data.");
  viewEl.innerHTML = `
  <div class="grid grid-2">
    <div class="card">
      <h2>Household</h2>
      ${MEMBERS.map((m) => `<div class="kv"><span>${esc(m)}</span><span class="muted">${state.tx.filter((t) => t.member === m).length} transactions</span></div>`).join("")}
      <form id="cur-form" style="margin-top:14px">
        <label>Currency symbol<input id="cur-input" maxlength="3" value="${esc(state.currency)}"></label>
        <button class="btn btn-primary" type="submit">Save currency</button>
      </form>
    </div>
    <div class="card">
      <h2>Your data</h2>
      <p class="small muted">HearthLedger stores everything in this browser's local storage. Nothing is sent anywhere.</p>
      <div class="kv"><span>Transactions stored</span><b>${state.tx.length}</b></div>
      <div class="kv"><span>Months covered</span><b>${months().length}</b></div>
      <div class="kv"><span>Savings goals</span><b>${state.goals.length}</b></div>
      <p style="margin-top:14px"><button class="btn btn-danger" id="reset-btn" type="button">Reset to sample data</button></p>
    </div>
  </div>`;
  document.getElementById("cur-form").addEventListener("submit", (e) => {
    e.preventDefault();
    state.currency = document.getElementById("cur-input").value || "$";
    save(); refreshMonths(); renderSettings();
  });
  document.getElementById("reset-btn").addEventListener("click", () => {
    state = { tx: seedTransactions(), budgets: { ...DEFAULT_BUDGETS }, goals: DEFAULT_GOALS.map((g) => ({ ...g })), currency: "$" };
    currentMonth = latestMonth(); save(); refreshMonths(); render();
  });
}

// ---- transaction modal ----
const modal = document.getElementById("tx-modal");
const form = document.getElementById("tx-form");
document.getElementById("tx-category").innerHTML = CATEGORIES.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
document.getElementById("tx-member").innerHTML = MEMBERS.map((m) => `<option>${esc(m)}</option>`).join("");
function openTx(tx) {
  document.getElementById("tx-form-title").textContent = tx ? "Edit transaction" : "Add transaction";
  document.getElementById("tx-id").value = tx ? tx.id : "";
  document.getElementById("tx-kind").value = tx ? tx.kind : "expense";
  document.getElementById("tx-desc").value = tx ? tx.desc : "";
  document.getElementById("tx-amount").value = tx ? tx.amount : "";
  document.getElementById("tx-date").value = tx ? tx.date : currentMonth + "-15";
  document.getElementById("tx-category").value = tx ? tx.category : "groceries";
  document.getElementById("tx-member").value = tx ? tx.member : MEMBERS[0];
  modal.hidden = false;
}
document.getElementById("add-tx-btn").addEventListener("click", () => openTx(null));
document.getElementById("tx-cancel").addEventListener("click", () => { modal.hidden = true; });
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const id = document.getElementById("tx-id").value;
  const rec = {
    id: id || "t" + Date.now(),
    kind: document.getElementById("tx-kind").value,
    desc: document.getElementById("tx-desc").value,
    amount: Number(document.getElementById("tx-amount").value) || 0,
    date: document.getElementById("tx-date").value,
    category: document.getElementById("tx-category").value,
    member: document.getElementById("tx-member").value,
  };
  if (rec.kind === "income") rec.category = "income";
  if (id) state.tx = state.tx.map((t) => (t.id === id ? rec : t));
  else state.tx.unshift(rec);
  state.tx.sort((a, b) => (a.date < b.date ? 1 : -1));
  save(); modal.hidden = true; refreshMonths(); render();
});
function wireTxButtons() {
  document.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => openTx(state.tx.find((t) => t.id === b.dataset.edit))));
  document.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
    state.tx = state.tx.filter((t) => t.id !== b.dataset.del);
    save(); refreshMonths(); render();
  }));
}

// ---- router ----
const ROUTES = { "": renderDashboard, transactions: renderTransactions, budgets: renderBudgets, goals: renderGoals, reports: renderReports, settings: renderSettings };
function render() {
  const route = location.hash.replace(/^#\//, "").split("?")[0];
  document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("active", a.dataset.route === (route || "dashboard")));
  (ROUTES[route] || renderDashboard)();
}
window.addEventListener("hashchange", render);
refreshMonths();
render();
