import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const readRepositoryFile = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("repository connectivity contracts", () => {
  it("only injects the development collector when its public asset is present", () => {
    const viteConfig = readRepositoryFile("vite.config.ts");
    expect(viteConfig).toContain("const DEBUG_COLLECTOR_PATH");
    expect(viteConfig).toContain("fs.existsSync(DEBUG_COLLECTOR_PATH)");
    expect(viteConfig).not.toContain("@builder.io/vite-plugin-jsx-loc");
  });

  it("allows the rendered UI audit to target the actual server address", () => {
    const auditScript = readRepositoryFile("scripts/ui-qa-audit.mjs");
    expect(auditScript).toContain("process.env.UI_QA_BASE_URL");
    expect(auditScript).toContain("await page.goto(baseUrl");
  });

  it("keeps pnpm patch and override settings in the root package configuration used by the pinned pnpm version", () => {
    const packageJson = JSON.parse(readRepositoryFile("package.json"));
    expect(packageJson.pnpm.patchedDependencies["wouter@3.7.1"]).toBe("patches/wouter@3.7.1.patch");
    expect(packageJson.pnpm.overrides["tailwindcss>nanoid"]).toBe("3.3.7");
    expect(fs.existsSync(path.join(process.cwd(), "patches", "wouter@3.7.1.patch"))).toBe(true);
  });
});
