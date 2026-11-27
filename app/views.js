import { CATEGORIES } from "./data.js";

export const catName = (id) => (CATEGORIES.find((c) => c.id === id) || {}).name || id;
export const catColor = (id) => (CATEGORIES.find((c) => c.id === id) || {}).color || "#999";
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const fmt = (n, cur = "$") => cur + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const monthKey = (date) => date.slice(0, 7);
export const monthLabel = (key) => new Date(key + "-02T00:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" });

export function monthTotals(tx, key) {
  let income = 0, expense = 0;
  const byCat = {};
  for (const t of tx) {
    if (monthKey(t.date) !== key) continue;
    if (t.kind === "income") income += t.amount;
    else { expense += t.amount; byCat[t.category] = (byCat[t.category] || 0) + t.amount; }
  }
  return { income, expense, net: income - expense, byCat };
}

export function drawDonut(canvas, entries) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) / 2 - 8, r0 = R * 0.62;
  const total = entries.reduce((s, e) => s + e.value, 0) || 1;
  let a = -Math.PI / 2;
  ctx.clearRect(0, 0, W, H);
  for (const e of entries) {
    const sweep = (e.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, a, a + sweep);
    ctx.closePath();
    ctx.fillStyle = e.color;
    ctx.fill();
    a += sweep;
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r0, 0, Math.PI * 2);
  ctx.fillStyle = "#fffdf8";
  ctx.fill();
  ctx.fillStyle = "#26302a";
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(fmt(total), cx, cy + 2);
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#6b766e";
  ctx.fillText("spent", cx, cy + 20);
}

export function drawBars(canvas, labels, income, expense) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const padL = 8, padB = 26, padT = 14;
  const max = Math.max(...income, ...expense, 1) * 1.12;
  const plotH = H - padB - padT;
  const groupW = (W - padL * 2) / labels.length;
  const bw = Math.min(22, groupW / 3);
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = "#e3dccf";
  ctx.beginPath(); ctx.moveTo(padL, padT + plotH); ctx.lineTo(W - padL, padT + plotH); ctx.stroke();
  labels.forEach((lab, i) => {
    const gx = padL + i * groupW + groupW / 2;
    const ih = (income[i] / max) * plotH, eh = (expense[i] / max) * plotH;
    ctx.fillStyle = "#2e7d5b";
    ctx.fillRect(gx - bw - 2, padT + plotH - ih, bw, ih);
    ctx.fillStyle = "#c05621";
    ctx.fillRect(gx + 2, padT + plotH - eh, bw, eh);
    ctx.fillStyle = "#6b766e";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(lab, gx, H - 8);
  });
}

export function budgetRows(byCat, budgets) {
  return Object.keys(budgets).map((id) => {
    const spent = byCat[id] || 0, limit = budgets[id];
    const pct = limit ? Math.min(100, (spent / limit) * 100) : 0;
    const cls = spent > limit ? "over" : pct > 85 ? "near" : "";
    return `<div class="budget-row">
      <div class="budget-top"><b>${esc(catName(id))}</b><span>${fmt(spent)} <span class="muted">of ${fmt(limit)}</span></span></div>
      <div class="bar ${cls}"><i style="width:${pct.toFixed(1)}%"></i></div>
      <div class="small muted" style="margin-top:4px">${spent > limit ? `<span style="color:var(--danger)">${fmt(spent - limit)} over budget</span>` : `${fmt(limit - spent)} left`}</div>
    </div>`;
  }).join("");
}

export function txTable(list, limit) {
  const rows = list.slice(0, limit || list.length).map((t) => `<tr>
    <td>${esc(t.date)}</td>
    <td>${esc(t.desc)}<div class="small muted">${esc(t.member)}</div></td>
    <td class="hide-phone"><span class="chip"><span class="dot" style="background:${catColor(t.category)}"></span> ${esc(catName(t.category))}</span></td>
    <td class="num ${t.kind === "income" ? "amt-in" : "amt-out"}">${t.kind === "income" ? "+" : "−"}${fmt(t.amount)}</td>
    <td class="num"><button class="btn btn-small" data-edit="${t.id}" type="button">Edit</button> <button class="btn btn-small btn-danger" data-del="${t.id}" type="button">Delete</button></td>
  </tr>`).join("");
  return `<table><thead><tr><th>Date</th><th>Description</th><th class="hide-phone">Category</th><th class="num">Amount</th><th class="num">Actions</th></tr></thead><tbody>${rows || `<tr><td colspan="5"><div class="empty">No transactions match.</div></td></tr>`}</tbody></table>`;
}
