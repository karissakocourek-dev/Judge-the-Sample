// One method's view: selection rule, timeline, true mean vs estimate, weekday counts.
// Draws only; the sample and estimate are computed in sampling.js and passed in.
import TimelineChart from "./TimelineChart.jsx";
import WeekdayCounts from "./WeekdayCounts.jsx";

export default function MethodPanel({
  number,
  title,
  rule,
  population,
  target,
  targetLabel,
  truth,
  sampleIdx,
  estimate,
  estimateName,
  estimateNote,
  weekdays,
  popDayCounts,
  sampleDayCounts,
  n,
  blockedMessage,
  children,
}) {
  const blocked = Boolean(blockedMessage);
  return (
    <section className="method-panel">
      <h2>
        {number}. {title}
      </h2>
      <div className="rule">{rule}</div>
      {blocked && <p className="blocked">{blockedMessage}</p>}

      <TimelineChart
        rows={population}
        target={target}
        targetLabel={targetLabel}
        sampleIdx={blocked ? [] : sampleIdx}
        truthMean={truth}
        estimate={blocked ? null : estimate}
        estimateLabel={`${estimateName} (n = ${n})`}
        height={340}
      />

      <div className="results">
        <div>
          <h3>True population mean</h3>
          <p className="big">{truth.toFixed(2)} min</p>
          <p>Mean wait over all {population.length.toLocaleString("en-US")} appointments.</p>
        </div>
        <div>
          <h3>{estimateName}</h3>
          <p className="big">{blocked ? "not run" : `${estimate.toFixed(2)} min`}</p>
          <p>{blocked ? "See the message above." : estimateNote}</p>
        </div>
      </div>

      {children}

      {!blocked && (
        <WeekdayCounts
          weekdays={weekdays}
          popCounts={popDayCounts}
          sampleCounts={sampleDayCounts}
          N={population.length}
          n={n}
        />
      )}
    </section>
  );
}
