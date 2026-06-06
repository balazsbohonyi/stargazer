import { createDefaultHandlers, createProgram, type CliHandlers } from "../src/cli.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function handlers(calls: string[]): CliHandlers {
  return {
    sync: (options) => {
      calls.push(`sync:${options.db ?? ""}:${options.token ?? ""}`);
    },
    search: (query, options) => {
      calls.push(`search:${query}:${options.db ?? ""}`);
    },
    show: (repo, options) => {
      calls.push(`show:${repo}:${options.db ?? ""}`);
    }
  };
}

describe("cli", () => {
  it("shows help with no command", () => {
    const program = createProgram(handlers([]));

    expect(program.helpInformation()).toContain("stargazer");
    expect(program.helpInformation()).toContain("sync");
    expect(program.helpInformation()).toContain("search");
    expect(program.helpInformation()).toContain("show");
  });

  it("exposes the packaged stargazer command", () => {
    const packageJson = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8")) as {
      name: string;
      bin: Record<string, string>;
    };
    const source = fs.readFileSync(path.resolve("src/cli.ts"), "utf8");

    expect(packageJson.name).toBe("stargazer");
    expect(packageJson.bin).toEqual({ stargazer: "./dist/src/cli.js" });
    expect(source.startsWith("#!/usr/bin/env node")).toBe(true);
  });

  it("parses sync options", async () => {
    const calls: string[] = [];
    const program = createProgram(handlers(calls));

    await program.parseAsync(["node", "cli", "--db", "stars.sqlite", "--token", "tok", "sync"]);

    expect(calls).toEqual(["sync:stars.sqlite:tok"]);
  });

  it("parses search query and database path", async () => {
    const calls: string[] = [];
    const program = createProgram(handlers(calls));

    await program.parseAsync(["node", "cli", "--db", "stars.sqlite", "search", "sqlite"]);

    expect(calls).toEqual(["search:sqlite:stars.sqlite"]);
  });

  it("parses show repository input", async () => {
    const calls: string[] = [];
    const program = createProgram(handlers(calls));

    await program.parseAsync(["node", "cli", "--db", "stars.sqlite", "show", "octo/alpha"]);

    expect(calls).toEqual(["show:octo/alpha:stars.sqlite"]);
  });

  it("search from empty default app state does not create the app directory or database", async () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "stargazer-home-"));
    const output: string[] = [];

    try {
      await withProcessEnv({ HOME: home }, async () => {
        await createDefaultHandlers(io(output)).search("sqlite", {});
      });

      expect(output.join("")).toContain("Run `stargazer sync` first");
      expect(fs.existsSync(path.join(home, ".stargazer"))).toBe(false);
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });

  it("show from empty default app state does not create the app directory or database", async () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "stargazer-home-"));
    const output: string[] = [];

    try {
      await withProcessEnv({ HOME: home }, async () => {
        await createDefaultHandlers(io(output)).show("octo/alpha", {});
      });

      expect(output.join("")).toContain("No local repository found");
      expect(fs.existsSync(path.join(home, ".stargazer"))).toBe(false);
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });

  it("sync creates the default app directory before opening SQLite", async () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "stargazer-home-"));
    const output: string[] = [];
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(mockGithubFetch([]));

    try {
      await withProcessEnv({ HOME: home, GITHUB_TOKEN: "token" }, async () => {
        await createDefaultHandlers(io(output)).sync({});
      });

      expect(output.join("")).toContain("Synced 0 repositories");
      expect(fs.existsSync(path.join(home, ".stargazer"))).toBe(true);
      expect(fs.existsSync(path.join(home, ".stargazer", "github-stars.sqlite"))).toBe(true);
      if (process.platform !== "win32") {
        expect(fs.statSync(path.join(home, ".stargazer")).mode & 0o777).toBe(0o700);
      }
    } finally {
      fetchSpy.mockRestore();
      fs.rmSync(home, { recursive: true, force: true });
    }
  });

  it("search after sync reads the same default database from another working directory", async () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "stargazer-home-"));
    const firstCwd = fs.mkdtempSync(path.join(os.tmpdir(), "stargazer-cwd-a-"));
    const secondCwd = fs.mkdtempSync(path.join(os.tmpdir(), "stargazer-cwd-b-"));
    const output: string[] = [];
    const cwdSpy = vi.spyOn(process, "cwd");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(mockGithubFetch());

    try {
      await withProcessEnv({ HOME: home, GITHUB_TOKEN: "token" }, async () => {
        cwdSpy.mockReturnValue(firstCwd);
        await createDefaultHandlers(io(output)).sync({});
        cwdSpy.mockReturnValue(secondCwd);
        await createDefaultHandlers(io(output)).search("sqlite", {});
      });

      expect(output.join("")).toContain("octo/sqlite-tool [TypeScript]");
      expect(fs.existsSync(path.join(home, ".stargazer", "github-stars.sqlite"))).toBe(true);
      expect(fs.existsSync(path.join(firstCwd, ".github-stars.sqlite"))).toBe(false);
      expect(fs.existsSync(path.join(secondCwd, ".github-stars.sqlite"))).toBe(false);
    } finally {
      cwdSpy.mockRestore();
      fetchSpy.mockRestore();
      fs.rmSync(home, { recursive: true, force: true });
      fs.rmSync(firstCwd, { recursive: true, force: true });
      fs.rmSync(secondCwd, { recursive: true, force: true });
    }
  });

  it("search with an explicit missing database path initializes that database", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "stargazer-db-"));
    const dbPath = path.join(tempDir, "explicit.sqlite");
    const output: string[] = [];

    try {
      await createDefaultHandlers(io(output)).search("sqlite", { db: dbPath });

      expect(output.join("")).toContain("Run `stargazer sync` first");
      expect(fs.existsSync(dbPath)).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

function io(output: string[]) {
  return {
    stdout: {
      write: (value: string) => {
        output.push(value);
        return true;
      }
    },
    stderr: {
      write: (value: string) => {
        output.push(value);
        return true;
      }
    }
  };
}

async function withProcessEnv(values: Record<string, string>, callback: () => Promise<void>) {
  const keys = ["HOME", "USERPROFILE", "GITHUB_TOKEN", "GH_TOKEN", "GITHUB_STARS_DB", "GITHUB_STARS_COLOR", "GITHUB_STARS_CLICKABLE_URLS", "NO_COLOR"];
  const previous = new Map(keys.map((key) => [key, process.env[key]]));

  try {
    for (const key of keys) delete process.env[key];
    Object.assign(process.env, values);
    await callback();
  } finally {
    for (const key of keys) {
      const value = previous.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function mockGithubFetch(
  repositories = [
    {
      node_id: "R_sqlite",
      id: 1,
      full_name: "octo/sqlite-tool",
      name: "sqlite-tool",
      owner: { login: "octo" },
      description: "SQLite helper",
      language: "TypeScript",
      html_url: "https://github.com/octo/sqlite-tool",
      stargazers_count: 10,
      updated_at: "2026-01-01T00:00:00Z"
    }
  ]
): typeof fetch {
  return (async (url: string | URL | Request) => {
    if (String(url).includes("/graphql")) {
      return Response.json({ data: { viewer: { lists: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } } } } });
    }

    return Response.json(repositories);
  }) as typeof fetch;
}
