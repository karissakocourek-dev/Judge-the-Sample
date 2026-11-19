// Technical checks for repeated sampling. They assert properties (counts, reproducibility,
// identities, synthetic known answers) and never print or assert results for the real data.
import { describe, expect, it } from "vitest";
import {
  binCounts,
  monteCarlo,
  repeatedResult,
  slotStratification,
  summarizeEstimates,
  systematicExact,
} from "./sampling.js";
import { population, TARGET } from "./data.js";

const stratDesign = (n) => {
  const s = slotStratification(n);
  return { kind: "stratified", strata: s.strata, keyOf: s.keyOf };
};
const DESIGNS = {
  srs: { kind: "srs" },
  systematic: { kind: "systematic" },
  stratified: stratDesign(100),
};

describe("Monte Carlo repetitions", () => {
  for (const [name, design] of Object.entries(DESIGNS)) {
    for (const reps of [100, 1000]) {
      it(`${name}: ${reps} estimates, each repetition has n = 100 distinct rows`, () => {
        let calls = 0;
        const est = monteCarlo(population, TARGET, design, 100, reps, 12345, (idx) => {
          calls++;
          expect(idx.length).toBe(100);
          expect(new Set(idx).size).toBe(100);
        });
        expect(est.length).toBe(reps);
        expect(calls).toBe(reps);
      });
    }
  }

  it("SRS at n = 1 and n = 10: each repetition has n distinct rows; count = repetitions", () => {
    for (const n of [1, 10]) {
      const est = monteCarlo(population, TARGET, DESIGNS.srs, n, 100, 7, (idx) => {
        expect(new Set(idx).size).toBe(n);
        expect(idx.length).toBe(n);
      });
      expect(est.length).toBe(100);
    }
  });

  it("same seed and settings reproduce the same estimates (all designs)", () => {
    for (const design of Object.values(DESIGNS)) {
      const a = monteCarlo(population, TARGET, design, 100, 100, 42);
      const b = monteCarlo(population, TARGET, design, 100, 100, 42);
      expect(a).toEqual(b);
    }
  });

  it("refuses fewer than 100 repetitions", () => {
    expect(() => monteCarlo(population, TARGET, DESIGNS.srs, 10, 99, 1)).toThrow();
  });
});

describe("exact enumeration (systematic, whole-number interval)", () => {
  it("lists each of the k starts exactly once (real data, n = 100, k = 100)", () => {
    const starts = [];
    const samples = new Set();
    const est = systematicExact(population, TARGET, 100, (idx, r) => {
      starts.push(r);
      samples.add(idx.join(","));
      expect(new Set(idx).size).toBe(100);
    });
    expect(est.length).toBe(100);
    expect(starts).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
    expect(samples.size).toBe(100);
  });

  it("refuses a fractional interval", () => {
    expect(() => systematicExact(population, TARGET, 7)).toThrow();
  });
});

describe("bias, SD and RMSE", () => {
  it("match a hand calculation", () => {
    // estimates 1, 2, 3, 6 with true mean 2:
    // mean 3, bias 1, SD = √((4+1+0+9)/4) = √3.5, RMSE = √((1+0+1+16)/4) = √4.5
    const s = summarizeEstimates([1, 2, 3, 6], 2);
    expect(s.count).toBe(4);
    expect(s.meanEst).toBe(3);
    expect(s.bias).toBe(1);
    expect(s.sd).toBeCloseTo(Math.sqrt(3.5), 12);
    expect(s.rmse).toBeCloseTo(Math.sqrt(4.5), 12);
  });

  it("known answer on a small synthetic population (exact enumeration)", () => {
    // y = 1..10, n = 2, k = 5: start r gives rows r and r+5, mean r + 2.5 -> 3.5 .. 7.5.
    // True mean 5.5; mean of estimates 5.5 -> bias 0; SD = RMSE = √((4+1+0+1+4)/5) = √2.
    const rows = Array.from({ length: 10 }, (_, i) => ({ y: i + 1 }));
    const r = repeatedResult(rows, "y", { kind: "systematic" }, 2, 100, 1);
    expect(r.type).toBe("exact");
    expect(r.estimates).toEqual([3.5, 4.5, 5.5, 6.5, 7.5]);
    expect(r.truth).toBe(5.5);
    expect(r.summary.bias).toBeCloseTo(0, 12);
    expect(r.summary.sd).toBeCloseTo(Math.SQRT2, 12);
    expect(r.summary.rmse).toBeCloseTo(Math.SQRT2, 12);
  });

  it("RMSE² = bias² + SD² (synthetic values and every real-data result type)", () => {
    const check = (s) => expect(s.rmse ** 2).toBeCloseTo(s.bias ** 2 + s.sd ** 2, 9);
    check(summarizeEstimates([10, 12, 15, 9, 30], 11));
    for (const [kind, design] of Object.entries(DESIGNS)) {
      const r = repeatedResult(population, TARGET, design, 100, 100, 3);
      check(r.summary);
      expect(kind).toBeTruthy();
    }
    check(repeatedResult(population, TARGET, DESIGNS.srs, 1, 100, 3).summary);
  });
});

describe("result labels", () => {
  it("systematic n = 100 is exact with 100 starts and no seed; reps setting ignored", () => {
    for (const reps of [100, 1000]) {
      const r = repeatedResult(population, TARGET, DESIGNS.systematic, 100, reps, 5);
      expect(r.type).toBe("exact");
      expect(r.seed).toBeNull();
      expect(r.count).toBe(100);
      expect(r.countLabel).toBe("100 starts");
    }
  });

  it("SRS and stratified are Monte Carlo with their seed and repetition count", () => {
    for (const design of [DESIGNS.srs, DESIGNS.stratified]) {
      const r = repeatedResult(population, TARGET, design, 100, 1000, 5);
      expect(r.type).toBe("Monte Carlo");
      expect(r.seed).toBe(5);
      expect(r.count).toBe(1000);
      expect(r.countLabel).toBe("1000 repetitions");
    }
  });

  it("systematic with a fractional interval uses Monte Carlo", () => {
    expect(repeatedResult(population, TARGET, DESIGNS.systematic, 7, 100, 5).type).toBe("Monte Carlo");
  });

  it("Experiment B's SRS n = 100 equals Experiment A's when settings match", () => {
    const a = repeatedResult(population, TARGET, DESIGNS.srs, 100, 100, 12345);
    const b = repeatedResult(population, TARGET, DESIGNS.srs, 100, 100, 12345);
    expect(b.estimates).toEqual(a.estimates);
  });
});

describe("histogram bins", () => {
  it("counts every value once; edges handled", () => {
    const c = binCounts([0, 0.5, 1, 9.99, 10], 0, 10, 10);
    expect(c.reduce((s, v) => s + v, 0)).toBe(5);
    expect(c[0]).toBe(2);
    expect(c[1]).toBe(1);
    expect(c[9]).toBe(2);
    expect(() => binCounts([11], 0, 10, 10)).toThrow();
  });
});
