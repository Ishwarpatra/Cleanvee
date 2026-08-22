// @vitest-environment jsdom
import React, { Component, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ErrorBoundary from "../client/src/components/ErrorBoundary";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class Crash extends Component {
  render(): React.ReactNode { throw new Error("icon fallback verification"); }
}

let root: Root;

describe("ErrorBoundary icon fallback", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    root = createRoot(document.querySelector("#root")!);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    document.body.innerHTML = "";
  });

  it("renders only original Cleanvee SVGs when a route-reachable error fallback is shown", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await act(async () => { root.render(<ErrorBoundary><Crash /></ErrorBoundary>); });

    expect(document.body.textContent).toContain("An unexpected error occurred.");
    expect(document.querySelector('[data-cleanvee-icon="warning"]')).not.toBeNull();
    expect(document.querySelector('[data-cleanvee-icon="retake"]')).not.toBeNull();
    expect(Array.from(document.querySelectorAll("svg")).every(icon => icon.hasAttribute("data-cleanvee-icon"))).toBe(true);
    consoleError.mockRestore();
  });
});
