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

  it("keeps pnpm patch and override settings in supported workspace configuration", () => {
    const packageJson = JSON.parse(readRepositoryFile("package.json"));
    const workspaceConfig = readRepositoryFile("pnpm-workspace.yaml");
    expect(packageJson.pnpm).toBeUndefined();
    expect(workspaceConfig).toContain("wouter@3.7.1: patches/wouter@3.7.1.patch");
    expect(workspaceConfig).toContain("tailwindcss>nanoid: 3.3.7");
    expect(fs.existsSync(path.join(process.cwd(), "patches", "wouter@3.7.1.patch"))).toBe(true);
  });
});
