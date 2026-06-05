import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ConfigError, loadConfig, requireGithubToken } from "../src/config.js";

describe("config", () => {
  it("loads token and database path from options", () => {
    const config = loadConfig({ db: "./custom.sqlite", token: "abc" }, {});

    expect(config.databasePath).toContain("custom.sqlite");
    expect(config.githubToken).toBe("abc");
  });

  it("falls back to environment variables", () => {
    const config = loadConfig({}, { GITHUB_STARS_DB: "./env.sqlite", GITHUB_TOKEN: "env-token" });

    expect(config.databasePath).toContain("env.sqlite");
    expect(config.githubToken).toBe("env-token");
  });

  it("throws a clear error when sync has no token", () => {
    expect(() => requireGithubToken(loadConfig({}, {}))).toThrow(ConfigError);
    expect(() => requireGithubToken(loadConfig({}, {}))).toThrow("GitHub token is required");
  });

  it("loads a GitHub token from .env automatically for runtime config", () => {
    const previousGithubToken = process.env.GITHUB_TOKEN;
    const previousGhToken = process.env.GH_TOKEN;
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "github-stars-config-"));
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tempDir);

    try {
      delete process.env.GITHUB_TOKEN;
      delete process.env.GH_TOKEN;
      fs.writeFileSync(path.join(tempDir, ".env"), "GITHUB_TOKEN=dotenv-token\n", "utf8");

      expect(loadConfig({}, process.env).githubToken).toBe("dotenv-token");
    } finally {
      cwdSpy.mockRestore();
      if (previousGithubToken === undefined) {
        delete process.env.GITHUB_TOKEN;
      } else {
        process.env.GITHUB_TOKEN = previousGithubToken;
      }
      if (previousGhToken === undefined) {
        delete process.env.GH_TOKEN;
      } else {
        process.env.GH_TOKEN = previousGhToken;
      }
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
