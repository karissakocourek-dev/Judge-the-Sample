// Technical correctness checks only: they never print or assert investigation results.
import { describe, expect, it } from "vitest";
import { groupCounts, makeRng, sampleMean, srs, trueMean } from "./sampling.js";
import { parseCsv, population, TARGET } from "./data.js";

describe("data loading", () => {
  it("parses the real CSV into 10,000 rows with numeric wait_time", () => {
    expect(population.length).toBe(10000);
    expect(population.every((r) => Number.isFinite(r[TARGET]))).toBe(true);
    expect(population[0].visit_id).toBe(1);
    expect(population.at(-1).visit_id).toBe(10000);
  });

  it("keeps file (time) order", () => {
    expect(population.every((r, i) => r.visit_id === i + 1)).toBe(true);
  });

  it("rejects a non-numeric target value", () => {
    expect(() => parseCsv("visit_id,week,slot,wait_time\n1,1,1,abc")).toThrow();
  });
});

describe("simple random sampling", () => {
  for (const n of [1, 10, 100, 10000]) {
    it(`n = ${n}: exactly n distinct, in-range rows`, () => {
      const idx = srs(10000, n, makeRng(7));
      expect(idx.length).toBe(n);
      expect(new Set(idx).size).toBe(n);
      expect(idx.every((i) => Number.isInteger(i) && i >= 0 && i < 10000)).toBe(true);
    });
  }

  it("rejects n outside 1..N", () => {
    expect(() => srs(10, 0, makeRng(1))).toThrow();
    expect(() => srs(10, 11, makeRng(1))).toThrow();
    expect(() => srs(10, 2.5, makeRng(1))).toThrow();
  });

  it("same seed and settings reproduce the same sample", () => {
    expect(srs(10000, 100, makeRng(12345))).toEqual(srs(10000, 100, makeRng(12345)));
  });

  it("every row is equally likely to be included (small exhaustive-ish check)", () => {
    // N = 5, n = 2: inclusion probability should be 2/5 for each row.
    const counts = [0, 0, 0, 0, 0];
    const rng = makeRng(99);
    const reps = 50000;
    for (let r = 0; r < reps; r++) for (const i of srs(5, 2, rng)) counts[i]++;
    for (const c of counts) expect(Math.abs(c / reps - 0.4)).toBeLessThan(0.01);
  });
});

describe("weekday counts", () => {
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  it("population counts match the data dictionary (2,000 per weekday)", () => {
    const c = groupCounts(population, "weekday", DAYS);
    for (const d of DAYS) expect(c[d]).toBe(2000);
  });

  it("sample counts are whole numbers that sum to n", () => {
    const idx = srs(population.length, 100, makeRng(12345));
    const c = groupCounts(population, "weekday", DAYS, idx);
    expect(DAYS.reduce((s, d) => s + c[d], 0)).toBe(100);
  });

  it("known-answer synthetic case and unknown group rejected", () => {
    const rows = [{ g: "a" }, { g: "b" }, { g: "a" }];
    expect(groupCounts(rows, "g", ["a", "b"])).toEqual({ a: 2, b: 1 });
    expect(groupCounts(rows, "g", ["a", "b"], [1, 2])).toEqual({ a: 1, b: 1 });
    expect(() => groupCounts(rows, "g", ["a"])).toThrow();
  });
});

describe("means (known-answer synthetic population)", () => {
  const rows = [2, 4, 6, 8, 10].map((v) => ({ y: v }));

  it("true mean over all rows", () => {
    expect(trueMean(rows, "y")).toBe(6);
  });

  it("sample mean over selected rows", () => {
    expect(sampleMean(rows, [0, 4], "y")).toBe(6);
    expect(sampleMean(rows, [1], "y")).toBe(4);
  });

  it("reordering rows leaves the true mean unchanged", () => {
    expect(trueMean([...rows].reverse(), "y")).toBe(trueMean(rows, "y"));
  });
});
