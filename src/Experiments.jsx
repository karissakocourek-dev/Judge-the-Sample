// Repeated-sampling experiments A and B on the baseline population.
// All calculations come from sampling.js; this file only arranges and labels them.
import { useMemo, useState } from "react";
import {
  binCounts,
  REPETITION_CHOICES,
  repeatedResult,
  slotStratification,
} from "./sampling.js";
import EstimateHistogram from "./EstimateHistogram.jsx";

const BINS = 30;
const MAX_SEED = 4294967295;
const POPULATION_LABEL = "baseline";

const SETTINGS = {
  srs: "without replacement",
  systematic: "random start, file (time) order, whole-number interval k = N / n",
  stratified:
    "by slot (20 strata), proportional allocation, largest-remainder rounding with seeded " +
    "ties, SRS within each slot, population-weighted estimate",
};
const METHOD_NAMES = {
  srs: "Simple random",
  systematic: "Systematic",
  stratified: "Stratified",
};

function parseWhole(text, min, max) {
  if (!/^\d+$/.test(text.trim())) return null;
  const v = Number(text);
  return Number.isSafeInteger(v) && v >= min && v <= max ? v : null;
}

function designFor(kind, n) {
  if (kind !== "stratified") return { kind };
  const s = slotStratification(n);
  return { kind, strata: s.strata, keyOf: s.keyOf };
}

// Shared x-range (and so shared bins) for all results in one experiment, including the true mean.
function sharedRange(results) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const r of results) {
    lo = Math.min(lo, r.truth, ...r.estimates);
    hi = Math.max(hi, r.truth, ...r.estimates);
  }
  const pad = (hi - lo) * 0.03 || 1;
  return { lo: lo - pad, hi: hi + pad };
}

function seedText(r) {
  return r.type === "exact" ? "exact (no seed)" : String(r.seed);
}

function labelLine(r) {
  return (
    <>
      Population: {POPULATION_LABEL} · Method: {METHOD_NAMES[r.kind]} · Settings: {SETTINGS[r.kind]}
      {" · "}n = {r.n} · {r.countLabel} · <strong>{r.type}</strong>
      {r.type === "exact" ? " (all starts listed, no seed)" : ` · seed ${r.seed}`}
    </>
  );
}

function ExperimentBlock({ id, title, description, results, note }) {
  const { lo, hi } = sharedRange(results);
  return (
    <section className="experiment">
      <h3>{title}</h3>
      <p>{description}</p>
      {note && <p className="muted">{note}</p>}
      {results.map((r) => (
        <EstimateHistogram
          key={r.key}
          title={r.title}
          labels={labelLine(r)}
          counts={binCounts(r.estimates, lo, hi, BINS)}
          lo={lo}
          hi={hi}
          truth={r.truth}
          summary={r.summary}
        />
      ))}
      <div className="table-wrap">
        <table className="results-table">
          <thead>
            <tr>
              <th>Experiment</th><th>Population</th><th>Method</th><th>Settings</th>
              <th>Seed (or exact)</th><th>n</th><th>Repetitions or starts</th><th>Type</th>
              <th>True mean</th><th>Mean of estimates</th><th>Bias</th><th>SD</th><th>RMSE</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.key}>
                <td>{id}</td>
                <td>{POPULATION_LABEL}</td>
                <td>{METHOD_NAMES[r.kind]}</td>
                <td>{SETTINGS[r.kind]}</td>
                <td>{seedText(r)}</td>
                <td>{r.n}</td>
                <td>{r.countLabel}</td>
                <td>{r.type}</td>
                <td>{r.truth.toFixed(3)}</td>
                <td>{r.summary.meanEst.toFixed(3)}</td>
                <td>{r.summary.bias.toFixed(3)}</td>
                <td>{r.summary.sd.toFixed(3)}</td>
                <td>{r.summary.rmse.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">All values in minutes. Each row is one separate result; results are never pooled.</p>
    </section>
  );
}

export default function Experiments({ population, target }) {
  const [seed, setSeed] = useState(12345);
  const [seedInput, setSeedInput] = useState("12345");
  const [reps, setReps] = useState(REPETITION_CHOICES[0]);
  const seedValid = parseWhole(seedInput, 0, MAX_SEED) !== null;

  // Recalculated automatically whenever the seed or repetition count changes.
  // Each new run replaces the current results (nothing is saved).
  const { expA, expB } = useMemo(() => {
    const run = (kind, n, title) => ({
      ...repeatedResult(population, target, designFor(kind, n), n, reps, seed),
      kind,
      key: `${kind}-${n}`,
      title,
    });
    const srs100 = run("srs", 100, "Simple random sampling, n = 100");
    const a = [
      srs100,
      run("systematic", 100, "Systematic sampling, n = 100"),
      run("stratified", 100, "Stratified sampling by slot, n = 100"),
    ];
    const b = [
      run("srs", 1, "Simple random sampling, n = 1"),
      run("srs", 10, "Simple random sampling, n = 10"),
      { ...srs100, title: "Simple random sampling, n = 100 (same result as Experiment A)" },
    ];
    return { expA: a, expB: b };
  }, [population, target, seed, reps]);

  return (
    <section className="experiments">
      <h2>Repeated-sampling experiments (baseline population)</h2>
      <p>
        The panels above show <strong>one sample</strong> per method. Here each histogram shows the
        <strong> distribution of estimates across many repetitions</strong>: each repetition draws
        one separate sample of n rows (without replacement within the sample; a row can appear
        again in a later repetition) and gives one estimate.
      </p>

      <div className="controls">
        <label>
          Experiment seed{" "}
          <input
            type="number"
            min={0}
            max={MAX_SEED}
            step={1}
            value={seedInput}
            onChange={(e) => {
              setSeedInput(e.target.value);
              const v = parseWhole(e.target.value, 0, MAX_SEED);
              if (v !== null) setSeed(v);
            }}
          />
        </label>
        <fieldset className="reps">
          <legend>Repetitions (Monte Carlo)</legend>
          {REPETITION_CHOICES.map((c) => (
            <label key={c}>
              <input type="radio" name="reps" value={c} checked={reps === c}
                onChange={() => setReps(c)} /> {c.toLocaleString("en-US")}
            </label>
          ))}
        </fieldset>
        {!seedValid && (
          <p className="error">
            The seed must be a whole number from 0 to {MAX_SEED}. Still showing seed {seed}.
          </p>
        )}
      </div>

      <div className="note">
        <p>
          <strong>Sample size and repetitions are separate.</strong> n is the number of rows in one
          sample; the repetition count is how many separate samples are drawn. Results update
          automatically when you change the seed or the repetition count, replacing the current
          results.
        </p>
        <p>
          100 repetitions usually reveal the main pattern; 1,000 give smoother distributions and
          more stable bias, SD and RMSE estimates. Neither guarantees stable results, and 100
          repetitions cannot reliably separate small differences between methods. Rerun with
          different seeds to check whether your main conclusions hold.
        </p>
        <p>
          <strong>Monte Carlo</strong> results use seeded random repetitions.{" "}
          <strong>Exact</strong> results list every possible random start once (systematic sampling
          with a whole-number interval), so they use no seed and ignore the repetition setting.
        </p>
        <p>
          <strong>Bias</strong> = mean of the estimates − true population mean.{" "}
          <strong>SD</strong> = spread of the estimates around their own mean.{" "}
          <strong>RMSE</strong> = √(mean of (estimate − true mean)²), the typical estimation error,
          combining bias and spread (RMSE² = bias² + SD²). All in minutes.
        </p>
      </div>

      <ExperimentBlock
        id="A: methods at n = 100"
        title="Experiment A: three methods at n = 100"
        description="Simple random, systematic and stratified sampling, each at n = 100, on the same baseline population. The three histograms share one x-axis and the same bins."
        results={expA}
      />
      <ExperimentBlock
        id="B: sample size"
        title="Experiment B: sample size with simple random sampling"
        description="Simple random sampling at n = 1, 10 and 100, with the population and method fixed. The three histograms share one x-axis and the same bins (a different axis from Experiment A)."
        note="The n = 100 result is the same Experiment A result (same population, method, n, seed and repetitions), reused rather than drawn again."
        results={expB}
      />
    </section>
  );
}
