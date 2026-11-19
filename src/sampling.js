// The ONE shared module for every sampling calculation in the app.
// Every display calls these functions; no chart computes its own estimates.

// Seedable pseudo-random number generator (mulberry32).
// The same seed always gives the same sequence of numbers in [0, 1).
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// True population mean: mean of the target over ALL rows.
export function trueMean(rows, key) {
  if (rows.length === 0) throw new Error("Population is empty");
  let sum = 0;
  for (const r of rows) sum += r[key];
  return sum / rows.length;
}

// Simple random sampling WITHOUT replacement: n distinct row indices (0-based)
// out of N, every set of n rows equally likely (partial Fisher–Yates shuffle).
// Returned in ascending (file / time) order.
export function srs(N, n, rng) {
  checkN(N, n);
  const idx = Array.from({ length: N }, (_, i) => i);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rng() * (N - i));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, n).sort((a, b) => a - b);
}

function checkN(N, n) {
  if (!Number.isInteger(n) || n < 1 || n > N) {
    throw new Error(`Sample size n must be a whole number from 1 to ${N}`);
  }
}

// ---------- Systematic sampling with a random start (file row order) ----------

// Whole-number design rows for start r (1..k): r, r+k, r+2k, ... (returned 0-based).
export function systematicFromStart(N, n, r) {
  const k = N / n;
  if (!Number.isInteger(k)) throw new Error("Whole-number design needs N/n to be a whole number");
  if (!Number.isInteger(r) || r < 1 || r > k) throw new Error(`Start must be 1..${k}`);
  return Array.from({ length: n }, (_, j) => r - 1 + j * k);
}

// Fractional-interval design rows for start u in (0, k]: ceil(u + j*k), j = 0..n-1
// (returned 0-based). Guarded so no row number falls outside 1..N through rounding.
export function systematicFromU(N, n, u) {
  const k = N / n;
  if (!(u > 0 && u <= k)) throw new Error(`Start u must be in (0, ${k}]`);
  const out = [];
  for (let j = 0; j < n; j++) {
    let row = Math.ceil(u + (j * N) / n);
    if (row > N) row = N;
    if (row < 1) row = 1;
    out.push(row - 1);
  }
  return out;
}

// Systematic sample of n rows from N in file order, with a random start.
// Picks the whole-number design when N/n is a whole number, else the fractional design.
export function systematic(N, n, rng) {
  checkN(N, n);
  const k = N / n;
  if (N % n === 0) {
    const start = 1 + Math.floor(rng() * k); // uniform on 1..k
    return { indices: systematicFromStart(N, n, start), design: "whole-number", k, start };
  }
  const start = (1 - rng()) * k; // uniform on (0, k]
  return { indices: systematicFromU(N, n, start), design: "fractional", k, start };
}

// ---------- Stratified sampling ----------

// Strata used for the clinic file: slot (20 strata) when n >= 20;
// 4 merged slot groups (1–5, 6–10, 11–15, 16–20) when 4 <= n < 20; blocked when n < 4.
export const SLOT_GROUPS = [
  [1, 5],
  [6, 10],
  [11, 15],
  [16, 20],
];

export function slotStratification(n) {
  if (n >= 20) {
    const strata = Array.from({ length: 20 }, (_, i) => `Slot ${i + 1}`);
    return {
      blocked: false,
      mode: "slot",
      label: "Stratified by slot: 20 strata (slot 1 to slot 20)",
      strata,
      keyOf: (row) => `Slot ${row.slot}`,
    };
  }
  if (n >= 4) {
    const strata = SLOT_GROUPS.map(([a, b]) => `Slots ${a}–${b}`);
    return {
      blocked: false,
      mode: "merged",
      label:
        "Merged slot groups because n < 20: 4 strata (slots 1–5, 6–10, 11–15, 16–20)",
      strata,
      keyOf: (row) => {
        const g = SLOT_GROUPS.findIndex(([a, b]) => row.slot >= a && row.slot <= b);
        if (g < 0) throw new Error(`Slot ${row.slot} is outside 1–20`);
        return strata[g];
      },
    };
  }
  return {
    blocked: true,
    mode: "blocked",
    label: "Stratified sampling unavailable",
    reason:
      "Stratified sampling needs at least one row per group. With n below 4 there are fewer " +
      "rows than the 4 merged slot groups, so it is not run. Simple random and systematic " +
      "sampling still run.",
  };
}

// Proportional allocation with largest-remainder rounding.
// Rules: whole numbers, total exactly n, each at least 1, none above its stratum size.
// Ties between equal remainders are broken in a random order drawn from `rng` (seeded).
export function allocateProportional(sizes, n, rng) {
  const H = sizes.length;
  const N = sizes.reduce((a, b) => a + b, 0);
  checkN(N, n);
  if (n < H) throw new Error(`n = ${n} is smaller than the number of strata (${H})`);

  const quota = sizes.map((Nh) => (n * Nh) / N);
  const alloc = sizes.map((Nh, h) => Math.min(Nh, Math.max(1, Math.floor(quota[h]))));

  // Random tie-break priority for each stratum: a seeded shuffle (Fisher–Yates),
  // so the same seed always breaks ties the same way.
  const order = Array.from({ length: H }, (_, h) => h);
  for (let i = H - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const rank = new Array(H);
  order.forEach((h, pos) => (rank[h] = pos));

  const EPS = 1e-9;
  let total = alloc.reduce((a, b) => a + b, 0);
  while (total < n) {
    // give one row to the stratum with the largest remainder (quota - alloc) that has room
    let best = -1;
    for (let h = 0; h < H; h++) {
      if (alloc[h] >= sizes[h]) continue;
      if (best < 0) { best = h; continue; }
      const d = quota[h] - alloc[h] - (quota[best] - alloc[best]);
      if (d > EPS || (Math.abs(d) <= EPS && rank[h] < rank[best])) best = h;
    }
    alloc[best]++;
    total++;
  }
  while (total > n) {
    // only possible because of the "at least 1" rule: take back from the most over-allocated
    let best = -1;
    for (let h = 0; h < H; h++) {
      if (alloc[h] <= 1) continue;
      if (best < 0) { best = h; continue; }
      const d = alloc[h] - quota[h] - (alloc[best] - quota[best]);
      if (d > EPS || (Math.abs(d) <= EPS && rank[h] < rank[best])) best = h;
    }
    alloc[best]--;
    total--;
  }
  return alloc;
}

// Stratified sample: allocate n across strata, then SRS without replacement within each.
// Returns the sampled row indices (0-based, file order) and one table row per stratum.
export function stratifiedSample(rows, key, strata, keyOf, n, rng) {
  const N = rows.length;
  const members = Object.fromEntries(strata.map((s) => [s, []]));
  rows.forEach((row, i) => {
    const s = keyOf(row);
    if (!(s in members)) throw new Error(`Unknown stratum "${s}"`);
    members[s].push(i);
  });
  const sizes = strata.map((s) => members[s].length);
  const alloc = allocateProportional(sizes, n, rng);

  const indices = [];
  const table = strata.map((s, h) => {
    const picks = srs(sizes[h], alloc[h], rng).map((p) => members[s][p]);
    indices.push(...picks);
    return {
      stratum: s,
      Nh: sizes[h],
      weight: sizes[h] / N,
      nh: alloc[h],
      mean: sampleMean(rows, picks, key),
    };
  });
  indices.sort((a, b) => a - b);
  return { indices, table };
}

// Population-weighted stratified estimate: sum over strata of (N_h / N) x stratum sample mean.
export function stratifiedEstimate(table) {
  return table.reduce((s, t) => s + t.weight * t.mean, 0);
}

// Count rows per group, in the order the groups are listed in `groups`.
// With `indices`, counts only those rows (a sample); without, counts all rows.
export function groupCounts(rows, key, groups, indices) {
  const counts = Object.fromEntries(groups.map((g) => [g, 0]));
  const list = indices ?? rows.map((_, i) => i);
  for (const i of list) {
    const g = rows[i][key];
    if (!(g in counts)) throw new Error(`Unknown ${key} value "${g}"`);
    counts[g]++;
  }
  return counts;
}

// Sample mean of the target over the selected row indices (SRS estimate).
export function sampleMean(rows, indices, key) {
  if (indices.length === 0) throw new Error("Sample is empty");
  let sum = 0;
  for (const i of indices) sum += rows[i][key];
  return sum / indices.length;
}
