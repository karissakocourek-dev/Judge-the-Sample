// Histogram of repeated-sampling estimates for ONE result.
// Draws only; counts and summary values come from sampling.js.
const W = 1000;
const H = 210;
const M = { top: 44, right: 20, bottom: 44, left: 60 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;

function niceTicks(lo, hi, target = 8) {
  const raw = (hi - lo) / target;
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  const ticks = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) ticks.push(+v.toFixed(10));
  return ticks;
}

export default function EstimateHistogram({ title, labels, counts, lo, hi, truth, summary }) {
  const bins = counts.length;
  const x = (v) => M.left + ((v - lo) / (hi - lo)) * PW;
  const maxCount = Math.max(...counts, 1);
  const y = (c) => M.top + PH - (c / maxCount) * PH;
  const bw = PW / bins;

  const xTrue = x(truth);
  const xMean = x(summary.meanEst);
  const anchor = (xv) => (xv > M.left + PW * 0.7 ? "end" : "start");
  const dx = (xv) => (anchor(xv) === "end" ? -5 : 5);

  return (
    <div className="hist">
      <h4>{title}</h4>
      <p className="hist-labels">{labels}</p>
      <div className="hist-row">
        <svg viewBox={`0 0 ${W} ${H}`} className="hist-svg" role="img"
          aria-label={`Histogram of ${summary.count} estimates: ${title}`}>
          {niceTicks(lo, hi).map((v) => (
            <g key={v}>
              <line className="grid" x1={x(v)} x2={x(v)} y1={M.top} y2={M.top + PH} />
              <text className="tick" x={x(v)} y={M.top + PH + 16} textAnchor="middle">{v}</text>
            </g>
          ))}
          <line className="axis" x1={M.left} x2={M.left + PW} y1={M.top + PH} y2={M.top + PH} />
          <text className="tick" x={M.left - 8} y={M.top} textAnchor="end" dominantBaseline="middle">
            {maxCount}
          </text>
          <text className="tick" x={M.left - 8} y={M.top + PH} textAnchor="end" dominantBaseline="middle">
            0
          </text>
          <text className="axis-title" transform={`translate(18 ${M.top + PH / 2}) rotate(-90)`}
            textAnchor="middle">Count</text>
          <text className="axis-title" x={M.left + PW / 2} y={H - 6} textAnchor="middle">
            Estimate of the mean wait (minutes), one per repetition
          </text>

          <g className="bars">
            {counts.map((c, i) =>
              c > 0 ? (
                <rect key={i} x={M.left + i * bw + 0.5} width={Math.max(bw - 1, 0.5)}
                  y={y(c)} height={M.top + PH - y(c)} />
              ) : null
            )}
          </g>

          <line className="true-mean" x1={xTrue} x2={xTrue} y1={M.top - 30} y2={M.top + PH} />
          <text className="line-label true-mean-label" x={xTrue + dx(xTrue)} y={M.top - 24}
            textAnchor={anchor(xTrue)}>
            True population mean: {truth.toFixed(2)}
          </text>
          <line className="estimate" x1={xMean} x2={xMean} y1={M.top - 12} y2={M.top + PH} />
          <text className="line-label estimate-label" x={xMean + dx(xMean)} y={M.top - 6}
            textAnchor={anchor(xMean)}>
            Mean of the {summary.count} estimates: {summary.meanEst.toFixed(2)}
          </text>
        </svg>

        <dl className="hist-stats">
          <div><dt>Bias</dt><dd>{summary.bias.toFixed(3)} min</dd></div>
          <div><dt>SD</dt><dd>{summary.sd.toFixed(3)} min</dd></div>
          <div><dt>RMSE</dt><dd>{summary.rmse.toFixed(3)} min</dd></div>
          <div><dt>Estimates</dt><dd>{summary.count}</dd></div>
        </dl>
      </div>
    </div>
  );
}
