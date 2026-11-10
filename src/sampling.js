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
  if (!Number.isInteger(n) || n < 1 || n > N) {
    throw new Error(`Sample size n must be a whole number from 1 to ${N}`);
  }
  const idx = Array.from({ length: N }, (_, i) => i);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rng() * (N - i));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, n).sort((a, b) => a - b);
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
