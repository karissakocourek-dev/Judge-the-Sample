// Time-order scatter: every appointment in file (time) order vs its wait time.
// Draws only; all numbers it shows are passed in from sampling.js results.
import { memo } from "react";

const W = 1000;
const H = 460;
const M = { top: 20, right: 20, bottom: 70, left: 60 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;
const ROWS_PER_WEEK = 100; // 5 weekdays x 20 slots

function niceStep(max) {
  const raw = max / 6;
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

// Population dots never change, so draw them once (memo) for speed.
const PopulationDots = memo(function PopulationDots({ rows, target, x, y }) {
  return (
    <g className="pop-dots">
      {rows.map((r, i) => (
        <circle key={i} cx={x(i)} cy={y(r[target])} r={1.3} />
      ))}
    </g>
  );
});

export default function TimelineChart({ rows, target, targetLabel, sampleIdx, truthMean, estimate, n }) {
  const N = rows.length;
  const maxVal = Math.max(...rows.map((r) => r[target]));
  const step = niceStep(maxVal);
  const yMax = Math.ceil(maxVal / step) * step;

  const x = (i) => M.left + ((i + 0.5) / N) * PW;
  const y = (v) => M.top + PH - (v / yMax) * PH;

  const yTicks = [];
  for (let v = 0; v <= yMax; v += step) yTicks.push(v);
  const weekTicks = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].filter(
    (w) => (w - 1) * ROWS_PER_WEEK < N
  );

  const yTrue = y(truthMean);
  const yEst = y(estimate);
  const rugY = M.top + PH + 4;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="timeline"
      role="img"
      aria-label={`Scatter of all ${N} appointments in time order against ${targetLabel}, with ${n} sampled appointments highlighted`}
    >
      {/* gridlines + y axis */}
      {yTicks.map((v) => (
        <g key={v}>
          <line className="grid" x1={M.left} x2={M.left + PW} y1={y(v)} y2={y(v)} />
          <text className="tick" x={M.left - 8} y={y(v)} textAnchor="end" dominantBaseline="middle">
            {v}
          </text>
        </g>
      ))}
      <text
        className="axis-title"
        transform={`translate(16 ${M.top + PH / 2}) rotate(-90)`}
        textAnchor="middle"
      >
        {targetLabel}
      </text>

      {/* x axis: week ticks */}
      <line className="axis" x1={M.left} x2={M.left + PW} y1={M.top + PH} y2={M.top + PH} />
      {weekTicks.map((w) => {
        const xi = x((w - 1) * ROWS_PER_WEEK);
        return (
          <g key={w}>
            <line className="grid week" x1={xi} x2={xi} y1={M.top} y2={M.top + PH} />
            <text className="tick" x={xi} y={M.top + PH + 30} textAnchor="middle">
              Week {w}
            </text>
          </g>
        );
      })}
      <text className="axis-title" x={M.left + PW / 2} y={H - 12} textAnchor="middle">
        Appointment position in the file (time order: week 1 → 100, Mon → Fri, slot 1 → 20)
      </text>

      {/* full population */}
      <PopulationDots rows={rows} target={target} x={x} y={y} />

      {/* sampled rows: markers + rug ticks under the axis */}
      <g className="sample-rug">
        {sampleIdx.map((i) => (
          <line key={i} x1={x(i)} x2={x(i)} y1={rugY} y2={rugY + 10} />
        ))}
      </g>
      <g className="sample-dots">
        {sampleIdx.map((i) => (
          <circle key={i} cx={x(i)} cy={y(rows[i][target])} r={4.5} />
        ))}
      </g>

      {/* labelled reference lines */}
      <line className="true-mean" x1={M.left} x2={M.left + PW} y1={yTrue} y2={yTrue} />
      <line className="estimate" x1={M.left} x2={M.left + PW} y1={yEst} y2={yEst} />
      <text
        className="line-label true-mean-label"
        x={M.left + 6}
        y={yTrue < yEst ? yTrue - 6 : yTrue + 14}
      >
        True population mean (all {N.toLocaleString("en-US")}): {truthMean.toFixed(2)}
      </text>
      <text
        className="line-label estimate-label"
        x={M.left + PW - 6}
        y={yEst <= yTrue ? yEst - 6 : yEst + 14}
        textAnchor="end"
      >
        Single-sample estimate (n = {n}): {estimate.toFixed(2)}
      </text>
    </svg>
  );
}
