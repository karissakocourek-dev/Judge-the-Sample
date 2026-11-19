// Technical checks for the stage-5 modified population (row order shuffled).
// They assert properties only and never print or assert investigation results for the real data.
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  monteCarlo,
  repeatedResult,
  shuffledCopy,
  systematicExact,
  trueMean,
} from "./sampling.js";
import { parseCsv, population, TARGET } from "./data.js";

const csvPath = fileURLToPath(new URL("../data/clinic_visits.csv", import.meta.url));
const manifest = JSON.parse(
  readFileSync(fileURLToPath(new URL("../data/manifest.json", import.meta.url)), "utf8")
);
const sha256 = () => createHash("sha256").update(readFileSync(csvPath)).digest("hex");
const ids = (rows) => rows.map((r) => r.visit_id);

describe("original data stays unchanged", () => {
  it("file on disk matches the manifest SHA-256 before and after building modified copies and running the challenge", () => {
    expect(sha256()).toBe(manifest.datasets.clinic.sha256);
    const before = ids(population);
    for (const s of [0, 1, 2, 12345]) {
      const m = shuffledCopy(population, s);
      repeatedResult(m, TARGET, { kind: "srs" }, 100, 100, 12345);
      repeatedResult(m, TARGET, { kind: "systematic" }, 100, 100, 12345);
    }
    expect(sha256()).toBe(manifest.datasets.clinic.sha256);
    // the in-memory baseline is still in file order and equal to a fresh parse of the file
    expect(ids(population)).toEqual(before);
    expect(population).toEqual(parseCsv(readFileSync(csvPath, "utf8")));
  });
});

describe("modified copy: row order only", () => {
  const m = shuffledCopy(population, 1);

  it("is a new array with the same N and exactly the same rows (a permutation)", () => {
    expect(m).not.toBe(population);
    expect(m.length).toBe(population.length);
    expect([...ids(m)].sort((a, b) => a - b)).toEqual(ids(population));
    expect(new Set(ids(m)).size).toBe(population.length);
    const byId = new Map(population.map((r) => [r.visit_id, r]));
    for (const r of m) expect(r).toEqual(byId.get(r.visit_id));
  });

  it("actually changes the order", () => {
    expect(ids(m)).not.toEqual(ids(population));
  });

  it("same shuffle seed gives the same order; a different seed gives a different order", () => {
    expect(ids(shuffledCopy(population, 1))).toEqual(ids(m));
    expect(ids(shuffledCopy(population, 2))).not.toEqual(ids(m));
  });

  it("modified true mean equals the mean of the modified rows, and reordering alone leaves it unchanged", () => {
    let sum = 0;
    for (const r of m) sum += r[TARGET];
    const direct = sum / m.length;
    expect(trueMean(m, TARGET)).toBeCloseTo(direct, 10);
    for (const s of [1, 2, 99]) {
      expect(trueMean(shuffledCopy(population, s), TARGET)).toBeCloseTo(trueMean(population, TARGET), 10);
    }
    expect(repeatedResult(m, TARGET, { kind: "srs" }, 100, 100, 5).truth).toBeCloseTo(direct, 10);
  });

  it("known answer on a small synthetic population", () => {
    const rows = Array.from({ length: 6 }, (_, i) => ({ id: i, y: i + 1 }));
    const c = shuffledCopy(rows, 7);
    expect(rows.map((r) => r.y)).toEqual([1, 2, 3, 4, 5, 6]); // input not mutated
    expect(c.map((r) => r.y).sort()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(trueMean(c, "y")).toBe(3.5);
  });
});

describe("systematic design re-checked on the modified copy", () => {
  const m = shuffledCopy(population, 1);

  it("N / n is recomputed from the copy: n = 100 is whole-number, exact, 100 starts, no seed", () => {
    const r = repeatedResult(m, TARGET, { kind: "systematic" }, 100, 1000, 5);
    expect(m.length % 100).toBe(0);
    expect(r.type).toBe("exact");
    expect(r.seed).toBeNull();
    expect(r.count).toBe(100);
  });

  it("each start takes rows r, r+k, ... in the COPY's order (k = 100), n distinct rows", () => {
    const starts = [];
    const est = systematicExact(m, TARGET, 100, (idx, r) => {
      starts.push(r);
      expect(idx.length).toBe(100);
      expect(new Set(idx).size).toBe(100);
      idx.forEach((p, j) => expect(p).toBe(r - 1 + j * 100));
    });
    expect(starts).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
    // estimate for start r = mean of the copy's rows at those positions
    const r1 = Array.from({ length: 100 }, (_, j) => m[j * 100][TARGET]);
    expect(est[0]).toBeCloseTo(r1.reduce((a, b) => a + b, 0) / 100, 10);
  });

  it("a non-divisor n on the copy still uses the fractional design (Monte Carlo)", () => {
    expect(repeatedResult(m, TARGET, { kind: "systematic" }, 7, 100, 5).type).toBe("Monte Carlo");
  });
});

describe("the four challenge results", () => {
  const m = shuffledCopy(population, 1);
  const n = 100;
  const four = [
    repeatedResult(population, TARGET, { kind: "srs" }, n, 100, 12345),
    repeatedResult(m, TARGET, { kind: "srs" }, n, 100, 12345),
    repeatedResult(population, TARGET, { kind: "systematic" }, n, 100, 12345),
    repeatedResult(m, TARGET, { kind: "systematic" }, n, 100, 12345),
  ];

  it("all use the same total n and the right type/count", () => {
    for (const r of four) expect(r.n).toBe(n);
    expect(four.map((r) => r.type)).toEqual(["Monte Carlo", "Monte Carlo", "exact", "exact"]);
    expect(four.map((r) => r.count)).toEqual([100, 100, 100, 100]);
  });

  it("each bias is measured against its own population's true mean; RMSE² = bias² + SD²", () => {
    expect(four[0].truth).toBe(trueMean(population, TARGET));
    expect(four[1].truth).toBe(trueMean(m, TARGET));
    for (const r of four) {
      expect(r.summary.bias).toBeCloseTo(r.summary.meanEst - r.truth, 12);
      expect(r.summary.rmse ** 2).toBeCloseTo(r.summary.bias ** 2 + r.summary.sd ** 2, 9);
    }
  });

  it("SRS on the copy: every repetition has n = 100 distinct rows, at 100 and 1,000 repetitions", () => {
    for (const reps of [100, 1000]) {
      let calls = 0;
      monteCarlo(m, TARGET, { kind: "srs" }, n, reps, 12345, (idx) => {
        calls++;
        expect(new Set(idx).size).toBe(n);
      });
      expect(calls).toBe(reps);
    }
  });

  it("same shuffle seed + experiment seed + settings reproduce the same numbers", () => {
    const again = [
      repeatedResult(population, TARGET, { kind: "srs" }, n, 100, 12345),
      repeatedResult(shuffledCopy(population, 1), TARGET, { kind: "srs" }, n, 100, 12345),
      repeatedResult(population, TARGET, { kind: "systematic" }, n, 100, 12345),
      repeatedResult(shuffledCopy(population, 1), TARGET, { kind: "systematic" }, n, 100, 12345),
    ];
    for (let i = 0; i < 4; i++) {
      expect(again[i].estimates).toEqual(four[i].estimates);
      expect(again[i].summary).toEqual(four[i].summary);
    }
  });
});
