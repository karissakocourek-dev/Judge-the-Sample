import { useMemo, useState } from "react";
import { population, TARGET, TARGET_LABEL } from "./data.js";
import {
  groupCounts,
  makeRng,
  sampleMean,
  slotStratification,
  srs,
  stratifiedEstimate,
  stratifiedSample,
  systematic,
  trueMean,
} from "./sampling.js";
import MethodPanel from "./MethodPanel.jsx";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const DEFAULT_N = 100;
const DEFAULT_SEED = 12345;
const MAX_SEED = 4294967295;

const fmt = (v, d = 2) => v.toFixed(d);
const rowList = (idx, max = 6) =>
  idx.slice(0, max).map((i) => i + 1).join(", ") + (idx.length > max ? ", …" : "");

function parseWhole(text, min, max) {
  if (!/^\d+$/.test(text.trim())) return null;
  const v = Number(text);
  return Number.isSafeInteger(v) && v >= min && v <= max ? v : null;
}

export default function App() {
  const N = population.length;
  const [n, setN] = useState(DEFAULT_N);
  const [nText, setNText] = useState(String(DEFAULT_N));
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [seedText, setSeedText] = useState(String(DEFAULT_SEED));
  const nValid = parseWhole(nText, 1, N) !== null;
  const seedValid = parseWhole(seedText, 0, MAX_SEED) !== null;

  const truth = useMemo(() => trueMean(population, TARGET), []);
  const popDayCounts = useMemo(() => groupCounts(population, "weekday", WEEKDAYS), []);
  const dayCounts = (idx) => groupCounts(population, "weekday", WEEKDAYS, idx);

  // Each method gets a fresh generator from the same seed, so each panel is reproducible.
  const srsResult = useMemo(() => {
    const indices = srs(N, n, makeRng(seed));
    return { indices, estimate: sampleMean(population, indices, TARGET) };
  }, [N, n, seed]);

  const sysResult = useMemo(() => {
    const r = systematic(N, n, makeRng(seed));
    return { ...r, estimate: sampleMean(population, r.indices, TARGET) };
  }, [N, n, seed]);

  const strat = useMemo(() => slotStratification(n), [n]);
  const stratResult = useMemo(() => {
    if (strat.blocked) return null;
    const r = stratifiedSample(population, TARGET, strat.strata, strat.keyOf, n, makeRng(seed));
    return { ...r, estimate: stratifiedEstimate(r.table) };
  }, [strat, n, seed]);

  const shared = {
    population,
    target: TARGET,
    targetLabel: TARGET_LABEL,
    truth,
    weekdays: WEEKDAYS,
    popDayCounts,
    n,
  };

  return (
    <main>
      <h1>Judge the Sample: clinic waiting times</h1>

      <section className="controls" aria-label="Sampling settings">
        <label>
          Sample size n (1 to {N.toLocaleString("en-US")}){" "}
          <input
            type="number"
            min={1}
            max={N}
            step={1}
            value={nText}
            onChange={(e) => {
              setNText(e.target.value);
              const v = parseWhole(e.target.value, 1, N);
              if (v !== null) setN(v);
            }}
          />
        </label>
        <label>
          Seed{" "}
          <input
            type="number"
            min={0}
            max={MAX_SEED}
            step={1}
            value={seedText}
            onChange={(e) => {
              setSeedText(e.target.value);
              const v = parseWhole(e.target.value, 0, MAX_SEED);
              if (v !== null) setSeed(v);
            }}
          />
        </label>
        {!nValid && (
          <p className="error">
            n must be a whole number from 1 to {N.toLocaleString("en-US")}. Still showing n = {n}.
          </p>
        )}
        {!seedValid && (
          <p className="error">
            The seed must be a whole number from 0 to {MAX_SEED}. Still showing seed {seed}.
          </p>
        )}
        <p className="settings-line">
          Population: <strong>baseline</strong>, all {N.toLocaleString("en-US")} appointments in
          clinic_visits.csv · Same total n = <strong>{n}</strong> for all three methods · Seed{" "}
          <strong>{seed}</strong> · The same seed and settings always give the same samples.
        </p>
      </section>

      <section className="note">
        <h2>Row order in this file</h2>
        <p>
          The rows of clinic_visits.csv are in time order: week 1 → 100, Monday → Friday, and
          slot 1 → 20 within each day. Neighbouring rows are neighbouring appointments. Systematic
          sampling takes rows at a fixed interval in this order, so here it samples a chronological
          record. Taking every k-th row of an unordered list (where file order has no meaning) is a
          different situation from sampling a chronological record like this one.
        </p>
        <p>
          Each panel shows <strong>one sample</strong> per method. A single sample is not evidence
          about which method is better; repeated sampling comes in a later stage.
        </p>
      </section>

      <div className="legend">
        <span><i className="key pop" /> Every appointment (population)</span>
        <span><i className="key samp" /> Sampled appointment (tick below axis marks its position in time)</span>
        <span><i className="key line-true" /> True population mean</span>
        <span><i className="key line-est" /> This sample's estimate</span>
      </div>

      <MethodPanel
        {...shared}
        number={1}
        title="Simple random sampling"
        rule={
          <p>
            <strong>Selection rule:</strong> {n} different rows chosen at random without
            replacement from all {N.toLocaleString("en-US")}; every set of {n} rows is equally
            likely. Seed {seed}. <strong>Estimate:</strong> the sample mean.
          </p>
        }
        sampleIdx={srsResult.indices}
        estimate={srsResult.estimate}
        estimateName="Sample mean (single sample)"
        estimateNote={`Mean wait of these ${n} rows.`}
        sampleDayCounts={dayCounts(srsResult.indices)}
      />

      <MethodPanel
        {...shared}
        number={2}
        title="Systematic sampling (random start, file row order)"
        rule={
          <>
            <p>
              <strong>Row order used:</strong> file order = time order (visit_id 1 →{" "}
              {N.toLocaleString("en-US")}).
            </p>
            <p>
              <strong>Interval:</strong> k = N / n = {N.toLocaleString("en-US")} / {n} ={" "}
              {sysResult.design === "whole-number" ? sysResult.k : fmt(sysResult.k, 4)}.{" "}
              <strong>
                Design in use:{" "}
                {sysResult.design === "whole-number"
                  ? "whole-number interval"
                  : "fractional interval"}
              </strong>{" "}
              {sysResult.design === "whole-number"
                ? "(N / n is a whole number)."
                : "(N / n is not a whole number)."}
            </p>
            {sysResult.design === "whole-number" ? (
              <p>
                <strong>Random start:</strong> r = {sysResult.start}, chosen at random from 1 to{" "}
                {sysResult.k} (seed {seed}). Rows r, r + k, r + 2k, …: rows{" "}
                {rowList(sysResult.indices)} ({n} rows).
              </p>
            ) : (
              <p>
                <strong>Random start:</strong> u = {fmt(sysResult.start, 4)}, chosen at random
                between 0 and k (seed {seed}). Rows are u + j × k rounded up, for j = 0 to {n - 1}:
                rows {rowList(sysResult.indices)} ({n} rows).
              </p>
            )}
            <p>
              Every row has the same chance n / N of being selected.{" "}
              <strong>Estimate:</strong> the sample mean.
            </p>
          </>
        }
        sampleIdx={sysResult.indices}
        estimate={sysResult.estimate}
        estimateName="Sample mean (single sample)"
        estimateNote={`Mean wait of these ${n} rows.`}
        sampleDayCounts={dayCounts(sysResult.indices)}
      />

      <MethodPanel
        {...shared}
        number={3}
        title="Stratified sampling (by appointment slot)"
        rule={
          <>
            <p>
              <strong>Strata:</strong> {strat.label}.
            </p>
            {!strat.blocked && (
              <p>
                <strong>Selection rule:</strong> n = {n} is split across the strata in proportion to
                their size (proportional allocation, largest-remainder rounding, at least 1 row per
                stratum, never more than the stratum has). When the split leaves extra rows that
                cannot be shared evenly, the strata that receive them are chosen at random using
                the seed. Within each stratum, rows are chosen by simple random sampling without
                replacement. Seed {seed}.
              </p>
            )}
            {!strat.blocked && (
              <p>
                <strong>Estimate:</strong> population-weighted mean = Σ (N<sub>h</sub> / N) × (sample
                mean in stratum h). See the allocation table below.
              </p>
            )}
          </>
        }
        blockedMessage={strat.blocked ? strat.reason : null}
        sampleIdx={stratResult ? stratResult.indices : []}
        estimate={stratResult ? stratResult.estimate : null}
        estimateName="Weighted estimate (single sample)"
        estimateNote="Population-weighted mean of the stratum sample means."
        sampleDayCounts={stratResult ? dayCounts(stratResult.indices) : null}
      >
        {stratResult && (
          <details className="allocation" open>
            <summary>Allocation and weights ({stratResult.table.length} strata)</summary>
            <table>
              <thead>
                <tr>
                  <th scope="col">Stratum</th>
                  <th scope="col">Rows in population N<sub>h</sub></th>
                  <th scope="col">Weight N<sub>h</sub> / N</th>
                  <th scope="col">Rows sampled n<sub>h</sub></th>
                  <th scope="col">Stratum sample mean</th>
                  <th scope="col">Weight × mean</th>
                </tr>
              </thead>
              <tbody>
                {stratResult.table.map((t) => (
                  <tr key={t.stratum}>
                    <th scope="row">{t.stratum}</th>
                    <td>{t.Nh.toLocaleString("en-US")}</td>
                    <td>{fmt(t.weight, 4)}</td>
                    <td>{t.nh}</td>
                    <td>{fmt(t.mean)}</td>
                    <td>{fmt(t.weight * t.mean, 4)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total</th>
                  <td>{stratResult.table.reduce((s, t) => s + t.Nh, 0).toLocaleString("en-US")}</td>
                  <td>{fmt(stratResult.table.reduce((s, t) => s + t.weight, 0), 4)}</td>
                  <td>{stratResult.table.reduce((s, t) => s + t.nh, 0)}</td>
                  <td></td>
                  <td>
                    <strong>{fmt(stratResult.estimate, 4)}</strong> = weighted estimate
                  </td>
                </tr>
              </tfoot>
            </table>
          </details>
        )}
      </MethodPanel>
    </main>
  );
}
