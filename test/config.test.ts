import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ConfigError, loadConfig, requireGithubToken } from "../src/config.js";

describe("config", () => {
  it("defaults the database path under the user app directory", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "stargazer-home-"));

    try {
      const config = loadConfig({}, { HOME: home });

      expect(config.appDirectory).toBe(path.join(home, ".stargazer"));
      expect(config.databasePath).toBe(path.join(home, ".stargazer", "github-stars.sqlite"));
      expect(config.databasePathSource).toBe("default");
      expect(fs.existsSync(config.appDirectory)).toBe(false);
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });

  it("keeps default database resolution stable across working directories", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "stargazer-home-"));
    const firstCwd = fs.mkdtempSync(path.join(os.tmpdir(), "stargazer-cwd-a-"));
    const secondCwd = fs.mkdtempSync(path.join(os.tmpdir(), "stargazer-cwd-b-"));
    const cwdSpy = vi.spyOn(process, "cwd");

    try {
      cwdSpy.mockReturnValue(firstCwd);
      const first = loadConfig({}, { HOME: home }).databasePath;
      cwdSpy.mockReturnValue(secondCwd);
      const second = loadConfig({}, { HOME: home }).databasePath;

      expect(first).toBe(second);
      expect(first).not.toContain(firstCwd);
      expect(second).not.toContain(secondCwd);
    } finally {
      cwdSpy.mockRestore();
      fs.rmSync(home, { recursive: true, force: true });
      fs.rmSync(firstCwd, { recursive: true, force: true });
      fs.rmSync(secondCwd, { recursive: true, force: true });
    }
  });

  it("loads token and database path from options", () => {
    const config = loadConfig({ db: "./custom.sqlite", token: "abc" }, { HOME: os.tmpdir() });

    expect(config.databasePath).toContain("custom.sqlite");
    expect(config.databasePathSource).toBe("flag");
    expect(config.githubToken).toBe("abc");
  });

  it("falls back to environment variables", () => {
    const config = loadConfig({}, { HOME: os.tmpdir(), GITHUB_STARS_DB: "./env.sqlite", GITHUB_TOKEN: "env-token" });

    expect(config.databasePath).toContain("env.sqlite");
    expect(config.databasePathSource).toBe("env");
    expect(config.githubToken).toBe("env-token");
  });

  it("loads persistent config from the app directory", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "stargazer-home-"));
    const appDirectory = path.join(home, ".stargazer");

    try {
      fs.mkdirSync(appDirectory);
      fs.writeFileSync(
        path.join(appDirectory, "config.env"),
        "GITHUB_STARS_DB=./configured.sqlite\nGITHUB_TOKEN=app-token\nGITHUB_STARS_CLICKABLE_URLS=true\n",
        "utf8"
      );

      const config = loadConfig({}, { HOME: home });

      expect(config.databasePath).toBe(path.join(appDirectory, "configured.sqlite"));
      expect(config.databasePathSource).toBe("app-config");
      expect(config.githubToken).toBe("app-token");
      expect(config.clickableUrls).toBe(true);
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });

  it("keeps relative app-config database paths stable across working directories", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "stargazer-home-"));
    const firstCwd = fs.mkdtempSync(path.join(os.tmpdir(), "stargazer-cwd-a-"));
    const secondCwd = fs.mkdtempSync(path.join(os.tmpdir(), "stargazer-cwd-b-"));
    const appDirectory = path.join(home, ".stargazer");
    const cwdSpy = vi.spyOn(process, "cwd");

    try {
      fs.mkdirSync(appDirectory);
      fs.writeFileSync(path.join(appDirectory, "config.env"), "GITHUB_STARS_DB=./configured.sqlite\n", "utf8");

      cwdSpy.mockReturnValue(firstCwd);
      const first = loadConfig({}, { HOME: home }).databasePath;
      cwdSpy.mockReturnValue(secondCwd);
      const second = loadConfig({}, { HOME: home }).databasePath;

      expect(first).toBe(path.join(appDirectory, "configured.sqlite"));
      expect(second).toBe(first);
    } finally {
      cwdSpy.mockRestore();
      fs.rmSync(home, { recursive: true, force: true });
      fs.rmSync(firstCwd, { recursive: true, force: true });
      fs.rmSync(secondCwd, { recursive: true, force: true });
    }
  });

  it("applies flag, shell environment, app config, and default precedence", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "stargazer-home-"));
    const appDirectory = path.join(home, ".stargazer");

    try {
      fs.mkdirSync(appDirectory);
      fs.writeFileSync(
        path.join(appDirectory, "config.env"),
        "GITHUB_STARS_DB=./app.sqlite\nGITHUB_TOKEN=app-token\nGH_TOKEN=app-gh-token\n",
        "utf8"
      );

      expect(loadConfig({}, { HOME: home }).githubToken).toBe("app-token");
      expect(loadConfig({}, { HOME: home, GH_TOKEN: "shell-gh-token" }).githubToken).toBe("shell-gh-token");
      expect(loadConfig({}, { HOME: home, GITHUB_TOKEN: "shell-token" }).githubToken).toBe("shell-token");
      expect(loadConfig({ token: "flag-token" }, { HOME: home, GITHUB_TOKEN: "shell-token" }).githubToken).toBe("flag-token");

      const shellDb = loadConfig({}, { HOME: home, GITHUB_STARS_DB: "./shell.sqlite" });
      expect(shellDb.databasePath).toContain("shell.sqlite");
      expect(shellDb.databasePathSource).toBe("env");

      const flagDb = loadConfig({ db: "./flag.sqlite" }, { HOME: home, GITHUB_STARS_DB: "./shell.sqlite" });
      expect(flagDb.databasePath).toContain("flag.sqlite");
      expect(flagDb.databasePathSource).toBe("flag");
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });

  it("throws a clear error when sync has no token", () => {
    const env = { HOME: fs.mkdtempSync(path.join(os.tmpdir(), "stargazer-home-")) };

    try {
      const config = loadConfig({}, env);

      expect(() => requireGithubToken(config)).toThrow(ConfigError);
      expect(() => requireGithubToken(config)).toThrow("GitHub token is required");
    } finally {
      fs.rmSync(env.HOME, { recursive: true, force: true });
    }
  });

  it("does not load a current-directory .env file during runtime config", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "github-stars-config-"));
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tempDir);

    try {
      fs.writeFileSync(path.join(tempDir, ".env"), "GITHUB_TOKEN=dotenv-token\n", "utf8");

      expect(loadConfig({}, { HOME: os.tmpdir() }).githubToken).toBeUndefined();
    } finally {
      cwdSpy.mockRestore();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
