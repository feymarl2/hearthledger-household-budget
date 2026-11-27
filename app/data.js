// HearthLedger seed data: a realistic household ledger used on first run.
// Everything lives in the browser; edits persist in localStorage.
export const CATEGORIES = [
  { id: "groceries", name: "Groceries", color: "#2e7d5b" },
  { id: "housing", name: "Housing", color: "#7a5c2e" },
  { id: "utilities", name: "Utilities", color: "#b8862f" },
  { id: "transport", name: "Transport", color: "#3a6ea5" },
  { id: "dining", name: "Eating out", color: "#c05621" },
  { id: "health", name: "Health", color: "#8e44ad" },
  { id: "kids", name: "Kids & school", color: "#d1603d" },
  { id: "leisure", name: "Leisure", color: "#4a9e8f" },
  { id: "household", name: "Household", color: "#6b766e" },
  { id: "income", name: "Income", color: "#1f6f4a" },
];
export const MEMBERS = ["Alex", "Sam", "Joint account"];
export const DEFAULT_BUDGETS = {
  groceries: 520, housing: 1450, utilities: 260, transport: 240,
  dining: 180, health: 150, kids: 220, leisure: 160, household: 140,
};
export const DEFAULT_GOALS = [
  { id: "g1", name: "Emergency fund", target: 6000, saved: 4120, note: "Three months of essentials" },
  { id: "g2", name: "Summer trip to the coast", target: 1800, saved: 965, note: "Train + cottage, August" },
  { id: "g3", name: "New washing machine", target: 650, saved: 410, note: "Old one is on its last spin" },
  { id: "g4", name: "Kids' bike fund", target: 300, saved: 300, note: "Done — bikes bought in October" },
];

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const money = (r, lo, hi) => Math.round((lo + r() * (hi - lo)) * 100) / 100;

const SHOPS = ["Market Basket", "Corner Grocer", "FreshMart", "The Daily Store", "Farm Box Co-op"];
const CAFES = ["Blue Door Café", "Noodle House", "Pizza Roma", "Sushi Go", "The Burger Barn"];
const FUEL = ["Shell Station", "City Fuel", "Bus pass top-up", "Metro card"];
const HEALTH = ["Pharmacy", "Dentist", "Physio clinic", "Optician"];
const KIDS = ["School lunches", "Art supplies", "Football club", "Library fines", "New shoes"];
const HOME = ["Hardware store", "Cleaning supplies", "Light bulbs", "Garden centre", "Laundry"];
const FUN = ["Cinema tickets", "Streaming plan", "Bookshop", "Museum day", "Board game night"];

export function seedTransactions() {
  const r = rng(20261127);
  const tx = [];
  let n = 0;
  const add = (date, desc, amount, category, kind, member) => {
    tx.push({ id: "t" + (++n), date, desc, amount, category, kind, member: member || pick(r, MEMBERS) });
  };
  // Six months: June..November 2026
  for (let m = 5; m <= 10; m++) {
    const mm = String(m + 1).padStart(2, "0");
    const d = (day) => `2026-${mm}-${String(day).padStart(2, "0")}`;
    add(d(1), "Rent — Maple Street flat", 1450, "housing", "expense", "Joint account");
    add(d(2), "Electricity & gas", money(r, 96, 148), "utilities", "expense", "Joint account");
    add(d(3), "Water bill", money(r, 38, 52), "utilities", "expense", "Joint account");
    add(d(4), "Broadband", 45, "utilities", "expense", "Joint account");
    add(d(25), "Salary — Alex", 3150, "income", "income", "Alex");
    add(d(27), "Salary — Sam (part-time)", 1480, "income", "income", "Sam");
    if (m === 7) add(d(12), "Freelance design invoice", 420, "income", "income", "Sam");
    if (m === 9) add(d(18), "Sold the old stroller", 85, "income", "income", "Alex");
    for (let w = 0; w < 4; w++) add(d(3 + w * 7), pick(r, SHOPS), money(r, 68, 142), "groceries", "expense");
    for (let i = 0; i < 3; i++) add(d(5 + Math.floor(r() * 22)), pick(r, CAFES), money(r, 14, 58), "dining", "expense");
    for (let i = 0; i < 3; i++) add(d(4 + Math.floor(r() * 24)), pick(r, FUEL), money(r, 18, 64), "transport", "expense");
    add(d(6 + Math.floor(r() * 20)), pick(r, HEALTH), money(r, 12, 95), "health", "expense");
    add(d(7 + Math.floor(r() * 18)), pick(r, KIDS), money(r, 9, 74), "kids", "expense");
    add(d(8 + Math.floor(r() * 16)), pick(r, HOME), money(r, 11, 83), "household", "expense");
    add(d(9 + Math.floor(r() * 16)), pick(r, FUN), money(r, 12, 66), "leisure", "expense");
    if (m === 8) add(d(15), "Car service & MOT", 214, "transport", "expense", "Joint account");
    if (m === 10) add(d(20), "Winter coats for the kids", 118, "kids", "expense");
  }
  return tx.sort((a, b) => (a.date < b.date ? 1 : -1));
}
