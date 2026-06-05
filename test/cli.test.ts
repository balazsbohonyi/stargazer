import { createProgram, type CliHandlers } from "../src/cli.js";
import fs from "node:fs";
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
});
