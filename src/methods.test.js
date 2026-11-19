// Technical correctness checks for systematic and stratified sampling.
// They never print or assert investigation results (no bias/SD/RMSE of the real data).
import { describe, expect, it } from "vitest";
import {
  allocateProportional,
  makeRng,
  slotStratification,
  srs,
  stratifiedEstimate,
  stratifiedSample,
  systematic,
  systematicFromStart,
  systematicFromU,
} from "./sampling.js";
import { population, TARGET } from "./data.js";

const N = 10000;
const SIZES = [1, 10, 100, 300, 7, 9999, 10000, 3, 6000]; // 7, 3, 300, 6000, 9999 do not divide N

const distinctInRange = (idx, n, NN = N) => {
  expect(idx.length).toBe(n);
  expect(new Set(idx).size).toBe(n);
  expect(idx.every((i) => Number.isInteger(i) && i >= 0 && i < NN)).toBe(true);
};

describe("SRS: exactly n distinct rows (incl. n that does not divide N)", () => {
  for (const n of SIZES) it(`n = ${n}`, () => distinctInRange(srs(N, n, makeRng(1)), n));
});

describe("systematic sampling", () => {
  for (const n of SIZES) {
    it(`n = ${n}: exactly n distinct rows, correct design`, () => {
      for (const seed of [1, 2, 3, 12345]) {
        const r = systematic(N, n, makeRng(seed));
        distinctInRange(r.indices, n);
        expect(r.design).toBe(N % n === 0 ? "whole-number" : "fractional");
      }
    });
  }

  it("whole-number design: rows follow r, r+k, r+2k, ... with r in 1..k", () => {
    for (const seed of [1, 7, 99]) {
      const r = systematic(N, 100, makeRng(seed));
      expect(r.k).toBe(100);
      expect(r.start).toBeGreaterThanOrEqual(1);
      expect(r.start).toBeLessThanOrEqual(100);
      r.indices.forEach((i, j) => expect(i + 1).toBe(r.start + j * 100));
    }
  });

  it("fractional design: rows are ceil(u + j*k), never beyond N, even at u = k", () => {
    const n = 300;
    const k = N / n;
    for (const u of [1e-12, 0.5, k / 2, k - 1e-12, k]) {
      const idx = systematicFromU(N, n, u);
      distinctInRange(idx, n);
      idx.forEach((i, j) => expect(i + 1).toBe(Math.min(N, Math.ceil(u + (j * N) / n))));
    }
  });

  it("exact enumeration (whole-number): each start listed once, every row included exactly once", () => {
    const NN = 60;
    const n = 6;
    const k = NN / n;
    const counts = new Array(NN).fill(0);
    const seen = new Set();
    for (let r = 1; r <= k; r++) {
      const idx = systematicFromStart(NN, n, r);
      distinctInRange(idx, n, NN);
      seen.add(idx.join(","));
      for (const i of idx) counts[i]++;
    }
    expect(seen.size).toBe(k);
    expect(counts.every((c) => c === 1)).toBe(true); // inclusion probability 1/k = n/N
  });

  it("fractional design: every row has inclusion probability n/N (small population)", () => {
    const NN = 10;
    const n = 3;
    const reps = 60000;
    const counts = new Array(NN).fill(0);
    const rng = makeRng(5);
    for (let t = 0; t < reps; t++) for (const i of systematic(NN, n, rng).indices) counts[i]++;
    for (const c of counts) expect(Math.abs(c / reps - n / NN)).toBeLessThan(0.01);
  });

  it("same seed and settings reproduce the same sample", () => {
    for (const n of [10, 7]) {
      expect(systematic(N, n, makeRng(42))).toEqual(systematic(N, n, makeRng(42)));
    }
  });
});

describe("allocation (proportional, largest remainder, seeded ties)", () => {
  const slotSizes = new Array(20).fill(500);
  const groupSizes = new Array(4).fill(2500);

  it("slot strata: whole numbers, total n, each >= 1 and <= stratum size, for n = 20..10,000", () => {
    for (let n = 20; n <= N; n += n < 200 ? 1 : 97) {
      const a = allocateProportional(slotSizes, n, makeRng(n));
      expect(a.every((v) => Number.isInteger(v) && v >= 1 && v <= 500)).toBe(true);
      expect(a.reduce((s, v) => s + v, 0)).toBe(n);
    }
    const full = allocateProportional(slotSizes, N, makeRng(1));
    expect(full.every((v) => v === 500)).toBe(true);
  });

  it("n = 100 by slot gives exactly 5 per slot", () => {
    expect(allocateProportional(slotSizes, 100, makeRng(3))).toEqual(new Array(20).fill(5));
  });

  it("merged groups: totals n and each within bounds for n = 4..19", () => {
    for (let n = 4; n < 20; n++) {
      const a = allocateProportional(groupSizes, n, makeRng(n));
      expect(a.reduce((s, v) => s + v, 0)).toBe(n);
      expect(a.every((v) => v >= 1 && v <= 2500)).toBe(true);
      expect(Math.max(...a) - Math.min(...a)).toBeLessThanOrEqual(1); // equal strata differ by at most 1
    }
  });

  it("tie-break is reproducible with the same seed and depends on the seed", () => {
    expect(allocateProportional(slotSizes, 30, makeRng(9))).toEqual(
      allocateProportional(slotSizes, 30, makeRng(9))
    );
    const patterns = new Set();
    for (let s = 0; s < 50; s++) {
      patterns.add(allocateProportional(slotSizes, 30, makeRng(s)).join(","));
    }
    expect(patterns.size).toBeGreaterThan(1);
  });

  it("known-answer unequal case, at-least-1 rule, n below number of strata refused", () => {
    expect(allocateProportional([50, 30, 20], 10, makeRng(1))).toEqual([5, 3, 2]);
    expect(allocateProportional([97, 2, 1], 4, makeRng(1))).toEqual([2, 1, 1]);
    expect(() => allocateProportional([5, 5, 5], 2, makeRng(1))).toThrow();
  });
});

describe("stratified sampling and the weighted estimator", () => {
  it("weights sum to 1; allocation totals n; n distinct rows; n_h rows per stratum (real data parses)", () => {
    for (const n of [4, 10, 19, 20, 30, 100, 777]) {
      const s = slotStratification(n);
      const r = stratifiedSample(population, TARGET, s.strata, s.keyOf, n, makeRng(11));
      expect(r.table.reduce((t, x) => t + x.weight, 0)).toBeCloseTo(1, 12);
      expect(r.table.reduce((t, x) => t + x.nh, 0)).toBe(n);
      expect(r.table.every((x) => x.nh >= 1 && x.nh <= x.Nh)).toBe(true);
      distinctInRange(r.indices, n);
      for (const x of r.table) {
        expect(r.indices.filter((i) => s.keyOf(population[i]) === x.stratum).length).toBe(x.nh);
      }
    }
  });

  it("same seed and settings reproduce the same stratified sample", () => {
    const s = slotStratification(30);
    const a = stratifiedSample(population, TARGET, s.strata, s.keyOf, 30, makeRng(5));
    const b = stratifiedSample(population, TARGET, s.strata, s.keyOf, 30, makeRng(5));
    expect(a).toEqual(b);
  });

  it("weighted estimator gives the known answer on a synthetic population", () => {
    // Stratum A: 6 rows all = 10; stratum B: 2 rows all = 50. True mean = (60 + 100) / 8 = 20.
    const rows = [...Array(6).fill({ g: "A", y: 10 }), ...Array(2).fill({ g: "B", y: 50 })];
    const r = stratifiedSample(rows, "y", ["A", "B"], (x) => x.g, 4, makeRng(1));
    expect(r.table.map((t) => t.nh)).toEqual([3, 1]);
    expect(r.table.map((t) => t.weight)).toEqual([0.75, 0.25]);
    expect(stratifiedEstimate(r.table)).toBe(20);
  });

  it("weighted estimator differs from the plain average when allocation is not proportional", () => {
    // Strata of 8 and 2 rows (weights 0.8 / 0.2); n = 2 forces 1 + 1 (at least 1 each).
    const rows = [...Array(8).fill({ g: "A", y: 10 }), ...Array(2).fill({ g: "B", y: 60 })];
    const r = stratifiedSample(rows, "y", ["A", "B"], (x) => x.g, 2, makeRng(1));
    expect(r.table.map((t) => t.nh)).toEqual([1, 1]);
    expect(stratifiedEstimate(r.table)).toBeCloseTo(0.8 * 10 + 0.2 * 60, 12); // 20, not 35
  });

  it("strata thresholds: n >= 20 slot, 4..19 merged groups, n < 4 blocked", () => {
    expect(slotStratification(20).strata.length).toBe(20);
    expect(slotStratification(19).strata).toEqual([
      "Slots 1–5",
      "Slots 6–10",
      "Slots 11–15",
      "Slots 16–20",
    ]);
    expect(slotStratification(4).mode).toBe("merged");
    expect(slotStratification(3).blocked).toBe(true);
    expect(slotStratification(1).blocked).toBe(true);
    const key = slotStratification(10).keyOf;
    expect([1, 5, 6, 10, 11, 15, 16, 20].map((slot) => key({ slot }))).toEqual([
      "Slots 1–5",
      "Slots 1–5",
      "Slots 6–10",
      "Slots 6–10",
      "Slots 11–15",
      "Slots 11–15",
      "Slots 16–20",
      "Slots 16–20",
    ]);
  });
});
