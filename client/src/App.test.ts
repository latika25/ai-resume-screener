import { describe, expect, it } from "vitest";
import { isTableRow, isTableSeparator, recLabel, scoreColor } from "./App";

describe("scoreColor", () => {
  it("uses green for strong matches", () => {
    expect(scoreColor(75)).toBe("var(--green)");
    expect(scoreColor(100)).toBe("var(--green)");
  });

  it("uses yellow for mid-range matches", () => {
    expect(scoreColor(50)).toBe("var(--yellow)");
    expect(scoreColor(74)).toBe("var(--yellow)");
  });

  it("uses red for low matches", () => {
    expect(scoreColor(49)).toBe("var(--red)");
    expect(scoreColor(0)).toBe("var(--red)");
  });
});

describe("recLabel", () => {
  it("maps each recommendation to its display label and color", () => {
    expect(recLabel("apply")).toEqual({
      label: "Strong Apply",
      color: "var(--green)",
    });
    expect(recLabel("maybe")).toEqual({
      label: "Worth Trying",
      color: "var(--yellow)",
    });
    expect(recLabel("skip")).toEqual({
      label: "Skip This One",
      color: "var(--red)",
    });
  });

  it("treats unknown values as skip", () => {
    expect(recLabel("unknown")).toEqual({
      label: "Skip This One",
      color: "var(--red)",
    });
  });
});

describe("markdown table detection", () => {
  it("recognizes complete table rows", () => {
    expect(isTableRow("| Skill | Evidence |")).toBe(true);
    expect(isTableRow("  | Skill | Evidence |  ")).toBe(true);
  });

  it("rejects non-table lines", () => {
    expect(isTableRow("Skill: TypeScript")).toBe(false);
    expect(isTableRow("|")).toBe(false);
  });

  it("recognizes markdown separator rows", () => {
    expect(isTableSeparator("| --- | :---: |")).toBe(true);
    expect(isTableSeparator("plain text")).toBe(false);
  });
});
