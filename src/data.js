// Loads the finite population from data/clinic_visits.csv (unchanged on disk).
// The supplied CSV has no quoted fields, so a plain split on commas is enough.
import csvText from "../data/clinic_visits.csv?raw";

export const TARGET = "wait_time";
export const TARGET_LABEL = "Wait time (minutes)";

const NUMERIC = ["visit_id", "week", "slot", "wait_time"];

export function parseCsv(text) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const cols = header.split(",");
  return lines.map((line, i) => {
    const values = line.split(",");
    const row = Object.fromEntries(cols.map((c, j) => [c, values[j]]));
    for (const c of NUMERIC) {
      const v = Number(row[c]);
      if (row[c] === undefined || row[c] === "" || !Number.isFinite(v)) {
        throw new Error(`Row ${i + 2}: column "${c}" is not a number ("${row[c]}")`);
      }
      row[c] = v;
    }
    return row;
  });
}

// Rows in file order (= time order).
export const population = parseCsv(csvText);
