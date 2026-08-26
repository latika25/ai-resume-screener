// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./index.css", () => ({}));

describe("frontend entrypoint", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.resetModules();
  });

  it("mounts the application into the root element", async () => {
    document.body.innerHTML = '<div id="root"></div>';

    await import("./index");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.getElementById("root")?.textContent).toContain(
      "Know your fit",
    );
  });
});
