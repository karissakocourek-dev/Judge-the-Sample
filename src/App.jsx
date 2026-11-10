import { useMemo } from "react";
import { population, TARGET, TARGET_LABEL } from "./data.js";
import { makeRng, srs, sampleMean, trueMean } from "./sampling.js";
import TimelineChart from "./TimelineChart.jsx";

// TEMPORARY (stage 2): one fixed-seed simple random sample to test the display.
const TEMP_SEED = 12345;
const TEMP_N = 100;

export default function App() {
  const N = population.length;
  const truth = useMemo(() => trueMean(population, TARGET), []);
  const sampleIdx = useMemo(() => srs(N, TEMP_N, makeRng(TEMP_SEED)), [N]);
  const estimate = useMemo(() => sampleMean(population, sampleIdx, TARGET), [sampleIdx]);

  return (
    <main>
      <h1>Judge the Sample: clinic waiting times</h1>
      <p className="banner">
        <strong>TEMPORARY:</strong> simple random sample of {TEMP_N} rows for testing the display.
        The sampling methods and controls are added in a later stage.
      </p>

      <dl className="settings">
        <div><dt>Population</dt><dd>baseline: all {N.toLocaleString("en-US")} appointments in clinic_visits.csv</dd></div>
        <div><dt>Method</dt><dd>Simple random sampling (without replacement)</dd></div>
        <div><dt>Sample size n</dt><dd>{TEMP_N}</dd></div>
        <div><dt>Seed</dt><dd>{TEMP_SEED}</dd></div>
      </dl>

      <div className="legend">
        <span><i className="key pop" /> Every appointment (population)</span>
        <span><i className="key samp" /> Sampled appointment (tick below axis marks its position in time)</span>
        <span><i className="key line-true" /> True population mean</span>
        <span><i className="key line-est" /> Single-sample estimate</span>
      </div>

      <TimelineChart
        rows={population}
        target={TARGET}
        targetLabel={TARGET_LABEL}
        sampleIdx={sampleIdx}
        truthMean={truth}
        estimate={estimate}
        n={TEMP_N}
      />
      <p className="caption">
        Rows are in time order: week 1 → 100, Monday → Friday, slot 1 → 20 within each day.
        Neighbouring dots are neighbouring appointments.
      </p>

      <section className="results">
        <div>
          <h2>True population mean</h2>
          <p className="big">{truth.toFixed(2)} min</p>
          <p>Mean wait over all {N.toLocaleString("en-US")} appointments.</p>
        </div>
        <div>
          <h2>Single-sample estimate</h2>
          <p className="big">{estimate.toFixed(2)} min</p>
          <p>Mean wait of this one sample of n = {TEMP_N} (seed {TEMP_SEED}).</p>
        </div>
      </section>
    </main>
  );
}
