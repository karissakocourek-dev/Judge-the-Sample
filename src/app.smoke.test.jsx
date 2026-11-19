// Smoke check: the page renders without errors and shows its key labels.
// Checks labels only; it does not read or report any estimate values.
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import App from "./App.jsx";

describe("app renders", () => {
  it("shows the three method panels, settings, row-order note and allocation table", () => {
    const html = renderToString(<App />);
    for (const text of [
      "Simple random sampling",
      "Systematic sampling",
      "Stratified sampling (by appointment slot)",
      "True population mean",
      "Row order in this file",
      "whole-number interval",
      "Allocation and weights",
      "Seed",
    ]) {
      expect(html).toContain(text);
    }
    expect(html).not.toContain("TEMPORARY");
  });
});
