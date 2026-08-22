import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import axe from "axe-core";

const outputDir = path.resolve("ui-qa");
fs.mkdirSync(outputDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle0", timeout: 60_000 });
await new Promise(resolve => setTimeout(resolve, 600));

await page.evaluate(axe.source);
const accessibility = await page.evaluate(async () => {
  return await window.axe.run(document, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
  });
});

const screenChecks = [];
for (const viewport of [
  { label: "desktop", width: 1440, height: 900 },
  { label: "tablet", width: 768, height: 1024 },
  { label: "mobile-portrait", width: 375, height: 812 },
  { label: "mobile-landscape", width: 812, height: 375 },
]) {
  await page.setViewport({ ...viewport, deviceScaleFactor: 1 });
  await new Promise(resolve => setTimeout(resolve, 200));
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    clientHeight: document.documentElement.clientHeight,
    scrollHeight: document.documentElement.scrollHeight,
    visibleText: document.body.innerText.trim().length,
  }));
  screenChecks.push({ label: viewport.label, width: viewport.width, height: viewport.height, horizontalOverflow: metrics.scrollWidth > metrics.clientWidth + 1, ...metrics });
}

await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.evaluate(() => window.scrollTo(0, 0));
const keyboardSequence = [];
for (let index = 0; index < 18; index += 1) {
  await page.keyboard.press("Tab");
  keyboardSequence.push(await page.evaluate(() => {
    const element = document.activeElement;
    return {
      tag: element?.tagName ?? null,
      text: element?.textContent?.trim().slice(0, 90) ?? null,
      ariaLabel: element?.getAttribute("aria-label") ?? null,
      outline: element ? getComputedStyle(element).outlineStyle : null,
    };
  }));
}

const semantics = await page.evaluate(() => ({
  missingImageAlt: [...document.images].filter(image => !image.hasAttribute("alt")).length,
  unlabeledInputs: [...document.querySelectorAll("input, textarea, select")].filter(control => {
    const id = control.getAttribute("id");
    const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
    return !label && !control.getAttribute("aria-label") && !control.getAttribute("aria-labelledby") && !control.getAttribute("placeholder");
  }).length,
  landmarks: {
    main: document.querySelectorAll("main").length,
    nav: document.querySelectorAll("nav").length,
    header: document.querySelectorAll("header").length,
  },
  placeholderCopy: /lorem ipsum|placeholder text|todo/i.test(document.body.innerText),
}));

await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
const reducedMotion = await page.evaluate(() => {
  const durationMs = (value) => Math.max(...value.split(",").map(part => {
    const unit = part.trim();
    return unit.endsWith("ms") ? Number.parseFloat(unit) : Number.parseFloat(unit) * 1000;
  }));
  const offenders = [...document.querySelectorAll("*")].flatMap(element => {
    const style = getComputedStyle(element);
    const animationMs = durationMs(style.animationDuration);
    const transitionMs = durationMs(style.transitionDuration);
    return animationMs > 10 || transitionMs > 10 ? [{ tag: element.tagName, className: element.className, animationMs, transitionMs }] : [];
  });
  return {
    mediaQueryMatches: matchMedia("(prefers-reduced-motion: reduce)").matches,
    elementsExceedingTenMs: offenders.length,
    examples: offenders.slice(0, 5),
  };
});

const performance = await page.evaluate(() => {
  const navigation = performance.getEntriesByType("navigation")[0];
  const paint = performance.getEntriesByType("paint");
  const resources = performance.getEntriesByType("resource");
  return {
    domContentLoadedMs: Math.round(navigation?.domContentLoadedEventEnd ?? 0),
    loadEventMs: Math.round(navigation?.loadEventEnd ?? 0),
    firstContentfulPaintMs: Math.round(paint.find(entry => entry.name === "first-contentful-paint")?.startTime ?? 0),
    resourceCount: resources.length,
    transferBytes: Math.round(resources.reduce((total, resource) => total + (resource.transferSize ?? 0), 0)),
  };
});

await page.screenshot({ path: path.join(outputDir, "chromium-desktop.png"), fullPage: true });
const outcome = {
  auditedUrl: page.url(),
  generatedAt: new Date().toISOString(),
  accessibility: {
    violations: accessibility.violations.map(violation => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.length,
      targets: violation.nodes.map(node => ({ target: node.target, html: node.html, summary: node.failureSummary })),
    })),
    passes: accessibility.passes.length,
    incomplete: accessibility.incomplete.length,
    inapplicable: accessibility.inapplicable.length,
  },
  screenChecks,
  keyboardSequence,
  semantics,
  reducedMotion,
  performance,
};
fs.writeFileSync(path.join(outputDir, "audit.json"), JSON.stringify(outcome, null, 2));
console.log(JSON.stringify(outcome, null, 2));
await browser.close();
