// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CleanveeIcon, CleanveeMark, cleanveeIconNames } from "../client/src/components/CleanveeIcon";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;

describe("CleanveeIcon", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    root = createRoot(document.querySelector("#root")!);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    document.body.innerHTML = "";
  });

  it("renders each declared original glyph as a non-empty 24px SVG with a unique marker", async () => {
    await act(async () => {
      root.render(<div>{cleanveeIconNames.map(name => <CleanveeIcon key={name} name={name} />)}</div>);
    });

    const icons = Array.from(document.querySelectorAll<SVGSVGElement>("svg[data-cleanvee-icon]"));
    expect(icons).toHaveLength(cleanveeIconNames.length);
    expect(new Set(icons.map(icon => icon.dataset.cleanveeIcon)).size).toBe(cleanveeIconNames.length);

    cleanveeIconNames.forEach((name, index) => {
      const icon = icons[index];
      expect(icon.dataset.cleanveeIcon).toBe(name);
      expect(icon.getAttribute("viewBox")).toBe("0 0 24 24");
      expect(icon.getAttribute("width")).toBe("18");
      expect(icon.getAttribute("height")).toBe("18");
      expect(icon.querySelectorAll("path, circle, rect").length).toBeGreaterThan(0);
      expect(Array.from(icon.querySelectorAll("path")).every(path => Boolean(path.getAttribute("d")?.trim()))).toBe(true);
      expect(icon.getAttribute("aria-hidden")).toBe("true");
      expect(icon.getAttribute("role")).toBeNull();
      expect(icon.querySelector("title")).toBeNull();
    });
  });

  it("exposes a title only when requested and keeps the brand mark announced", async () => {
    await act(async () => {
      root.render(<div><CleanveeIcon name="proof" size={24} title="Proof recorded" /><CleanveeMark /></div>);
    });

    const proof = document.querySelector<SVGSVGElement>('[data-cleanvee-icon="proof"]')!;
    expect(proof.getAttribute("width")).toBe("24");
    expect(proof.getAttribute("height")).toBe("24");
    expect(proof.getAttribute("role")).toBe("img");
    expect(proof.getAttribute("aria-hidden")).toBeNull();
    expect(proof.querySelector("title")?.textContent).toBe("Proof recorded");

    const mark = document.querySelector<SVGSVGElement>('[data-cleanvee-icon="mark"]')!;
    expect(mark.getAttribute("role")).toBe("img");
    expect(mark.getAttribute("aria-hidden")).toBeNull();
    expect(mark.querySelector("title")?.textContent).toBe("Cleanvee");
  });
});
