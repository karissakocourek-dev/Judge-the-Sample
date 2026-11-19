// Repeated-sampling experiments: A and B on the baseline population, and the stage-5
// challenge (C) comparing the baseline with a labelled modified copy (rows shuffled).
// All calculations come from sampling.js; this file only arranges and labels them.
import { useMemo, useState } from "react";
import {
  binCounts,
  REPETITION_CHOICES,
  repeatedResult,
  shuffledCopy,
  slotStratification,
} from "./sampling.js";
import EstimateHistogram from "./EstimateHistogram.jsx";

const BINS = 30;
const MAX_SEED = 4294967295;
const DEFAULT_SHUFFLE_SEED = 1;
const CHALLENGE_N = 100;

const BASELINE = {
  label: "baseline",
  order: "file (time) order",
};
const modifiedPop = (shuffleSeed) => ({
  label: `modified: rows shuffled (shuffle seed ${shuffleSeed})`,
  order: "modified copy's row order (shuffled, not time order)",
});

const METHOD_NAMES = {
  srs: "Simple random",
  systematic: "Systematic",
  stratified: "Stratified",
};

// Settings text for one result. The systematic design (whole-number or fractional) is read
// from the result itself, so it is re-checked for each population's own N.
function settingsText(r) {
  if (r.kind === "srs") return "without replacement";
  if (r.kind === "systematic") {
    const k = r.N / r.n;
    const interval =
      r.type === "exact"
        ? `whole-number interval k = N / n = ${k}`
        : `fractional interval k = N / n = ${k.toFixed(4)}`;
    return `random start, ${r.pop.order}, ${interval}`;
  }
  return (
    "by slot (20 strata), proportional allocation, largest-remainder rounding with seeded " +
    "ties, SRS within each slot, population-weighted estimate"
  );
}

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

// Shared x-range (and so shared bins) for all results in one experiment, including the true means.
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
      Population: <strong>{r.pop.label}</strong> (N = {r.N.toLocaleString("en-US")}) · Method:{" "}
      {METHOD_NAMES[r.kind]} · Settings: {settingsText(r)}
      {" · "}n = {r.n} · {r.countLabel} · <strong>{r.type}</strong>
      {r.type === "exact" ? " (all starts listed, no seed)" : ` · seed ${r.seed}`}
    </>
  );
}

function ExperimentBlock({ id, title, description, results, note, children }) {
  const { lo, hi } = sharedRange(results);
  return (
    <section className="experiment">
      <h3>{title}</h3>
      <p>{description}</p>
      {note && <p className="muted">{note}</p>}
      {children}
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
              <th>Experiment</th><th>Population</th><th>N</th><th>Method</th><th>Settings</th>
              <th>Seed (or exact)</th><th>n</th><th>Repetitions or starts</th><th>Type</th>
              <th>True mean (this population)</th><th>Mean of estimates</th><th>Bias</th>
              <th>SD</th><th>RMSE</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.key}>
                <td>{id}</td>
                <td>{r.pop.label}</td>
                <td>{r.N.toLocaleString("en-US")}</td>
                <td>{METHOD_NAMES[r.kind]}</td>
                <td>{settingsText(r)}</td>
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
      <p className="muted">
        All values in minutes. Each row is one separate result, and its bias is measured against the
        true mean of its own population. Results are never pooled.
      </p>
    </section>
  );
}

function SeedInput({ label, text, setText, setValue }) {
  return (
    <label>
      {label}{" "}
      <input
        type="number"
        min={0}
        max={MAX_SEED}
        step={1}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const v = parseWhole(e.target.value, 0, MAX_SEED);
          if (v !== null) setValue(v);
        }}
      />
    </label>
  );
}

export default function Experiments({ population, target }) {
  const [seed, setSeed] = useState(12345);
  const [seedInput, setSeedInput] = useState("12345");
  const [reps, setReps] = useState(REPETITION_CHOICES[0]);
  const [shuffleSeed, setShuffleSeed] = useState(DEFAULT_SHUFFLE_SEED);
  const [shuffleInput, setShuffleInput] = useState(String(DEFAULT_SHUFFLE_SEED));
  const seedValid = parseWhole(seedInput, 0, MAX_SEED) !== null;
  const shuffleValid = parseWhole(shuffleInput, 0, MAX_SEED) !== null;

  const run = (rows, pop, kind, n, title) => ({
    ...repeatedResult(rows, target, designFor(kind, n), n, reps, seed),
    kind,
    pop,
    N: rows.length,
    key: `${pop.label}-${kind}-${n}`,
    title,
  });

  // Baseline experiments. Recalculated automatically when the seed or repetition count changes;
  // each new run replaces the current results (nothing is saved).
  const { expA, expB } = useMemo(() => {
    const srs100 = run(population, BASELINE, "srs", 100, "Simple random sampling, n = 100");
    const a = [
      srs100,
      run(population, BASELINE, "systematic", 100, "Systematic sampling, n = 100"),
      run(population, BASELINE, "stratified", 100, "Stratified sampling by slot, n = 100"),
    ];
    const b = [
      run(population, BASELINE, "srs", 1, "Simple random sampling, n = 1"),
      run(population, BASELINE, "srs", 10, "Simple random sampling, n = 10"),
      { ...srs100, title: "Simple random sampling, n = 100 (same result as Experiment A)" },
    ];
    return { expA: a, expB: b };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [population, target, seed, reps]);

  // Modified copy: same rows, shuffled order. The baseline array and the file are untouched.
  const modified = useMemo(() => shuffledCopy(population, shuffleSeed), [population, shuffleSeed]);

  // Experiment C: the two baseline results are the matching Experiment A results (same
  // population, method, n, seed, repetitions); the two modified results are drawn from the copy.
  const expC = useMemo(() => {
    const pop = modifiedPop(shuffleSeed);
    return [
      { ...expA[0], key: "c-base-srs", title: `Simple random, baseline, n = ${CHALLENGE_N} (same result as Experiment A)` },
      run(modified, pop, "srs", CHALLENGE_N, `Simple random, modified (rows shuffled), n = ${CHALLENGE_N}`),
      { ...expA[1], key: "c-base-sys", title: `Systematic, baseline, n = ${CHALLENGE_N} (same result as Experiment A)` },
      run(modified, pop, "systematic", CHALLENGE_N, `Systematic, modified (rows shuffled), n = ${CHALLENGE_N}`),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expA, modified, shuffleSeed, target, seed, reps]);

  return (
    <section className="experiments">
      <h2>Repeated-sampling experiments</h2>
      <p>
        The panels above show <strong>one sample</strong> per method. Here each histogram shows the
        <strong> distribution of estimates across many repetitions</strong>: each repetition draws
        one separate sample of n rows (without replacement within the sample; a row can appear
        again in a later repetition) and gives one estimate. Experiments A and B use the baseline
        population; Experiment C also uses a labelled modified copy.
      </p>

      <div className="controls">
        <SeedInput label="Experiment seed" text={seedInput} setText={setSeedInput} setValue={setSeed} />
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
      <ExperimentBlock
        id="C: challenge (row order)"
        title="Experiment C: challenge, baseline vs modified population (rows shuffled)"
        description={`Simple random sampling (the method being challenged) and systematic sampling (the alternative), each at the same total n = ${CHALLENGE_N}, on the baseline population and on a modified copy. The four histograms share one x-axis and the same bins (a different axis from Experiments A and B).`}
        note="The two baseline results are the matching Experiment A results (same population, method, n, seed and repetitions), reused rather than drawn again."
        results={expC}
      >
        <div className="controls">
          <SeedInput
            label="Shuffle seed (modified copy)"
            text={shuffleInput}
            setText={setShuffleInput}
            setValue={setShuffleSeed}
          />
          <button
            type="button"
            onClick={() => {
              setShuffleSeed(DEFAULT_SHUFFLE_SEED);
              setShuffleInput(String(DEFAULT_SHUFFLE_SEED));
            }}
          >
            Reset shuffle seed to {DEFAULT_SHUFFLE_SEED}
          </button>
          {!shuffleValid && (
            <p className="error">
              The shuffle seed must be a whole number from 0 to {MAX_SEED}. Still showing shuffle
              seed {shuffleSeed}.
            </p>
          )}
        </div>
        <div className="note">
          <p>
            <strong>Modified population:</strong> a copy of all {modified.length.toLocaleString("en-US")}{" "}
            appointments with only the <strong>row order</strong> changed (a random shuffle set by
            the shuffle seed). Wait times and the number of appointments are unchanged. In the copy,
            row position is no longer time order; systematic sampling on the copy takes every k-th
            row in the copy's order.
          </p>
          <p>
            <strong>Baseline:</strong> clinic_visits.csv in its original file (time) order. The file
            on disk is never changed, and everything above Experiment C (the single-sample panels and
            Experiments A and B) always uses the baseline. The shuffle seed changes only the modified
            results; the experiment seed and repetition setting apply to all Monte Carlo results.
          </p>
          <p>
            <strong>True mean, recalculated from each population's own rows:</strong> baseline (N ={" "}
            {population.length.toLocaleString("en-US")}) = {expC[0].truth.toFixed(3)} min; modified
            (N = {modified.length.toLocaleString("en-US")}) = {expC[1].truth.toFixed(3)} min.
          </p>
        </div>
      </ExperimentBlock>
    </section>
  );
}
