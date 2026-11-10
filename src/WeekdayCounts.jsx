// Count of sampled rows by weekday, beside each weekday's share of the population.
// Draws only; counts come from groupCounts() in sampling.js.
export default function WeekdayCounts({ weekdays, popCounts, sampleCounts, N, n }) {
  const maxCount = Math.max(...weekdays.map((d) => sampleCounts[d]), 1);
  return (
    <section className="weekday-counts">
      <h2>Sampled appointments by weekday</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Weekday</th>
            <th scope="col">Population rows (share)</th>
            <th scope="col">Sampled rows (share of n = {n})</th>
            <th scope="col" aria-hidden="true"></th>
          </tr>
        </thead>
        <tbody>
          {weekdays.map((d) => (
            <tr key={d}>
              <th scope="row">{d}</th>
              <td>
                {popCounts[d].toLocaleString("en-US")} ({((100 * popCounts[d]) / N).toFixed(0)}%)
              </td>
              <td>
                {sampleCounts[d]} ({((100 * sampleCounts[d]) / n).toFixed(0)}%)
              </td>
              <td className="bar-cell" aria-hidden="true">
                <span className="bar" style={{ width: `${(100 * sampleCounts[d]) / maxCount}%` }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
