#!/usr/bin/env node
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { Command, CommanderError } from "commander";
import { loadConfig, requireGithubToken, type BaseOptions } from "./config.js";
import { connect } from "./db/connection.js";
import { initializeSchema } from "./db/schema.js";
import { createRepositoryStore } from "./db/repositories.js";
import { GitHubClient } from "./github/client.js";
import { syncStars } from "./github/sync.js";
import { formatSearchResults } from "./search/format.js";
import { searchRepositories } from "./search/search.js";
import { formatInspection, inspectRepository } from "./inspect/inspect.js";

export interface CliHandlers {
  sync: (options: BaseOptions) => Promise<void> | void;
  search: (query: string, options: BaseOptions) => Promise<void> | void;
  show: (repo: string, options: BaseOptions) => Promise<void> | void;
}

export interface CliIo {
  stdout: Pick<NodeJS.WriteStream, "write">;
  stderr: Pick<NodeJS.WriteStream, "write">;
}

export function createDefaultHandlers(io: CliIo): CliHandlers {
  return {
    async sync(options) {
      const config = loadConfig(options);
      const token = requireGithubToken(config);
      const db = connect(config.databasePath);
      try {
        initializeSchema(db);
        const store = createRepositoryStore(db);
        const client = new GitHubClient({ token });
        const summary = await syncStars({ client, store });
        io.stdout.write(
          `Synced ${summary.repositories} repositories, ${summary.lists} lists, ${summary.memberships} memberships.\n`
        );
      } finally {
        db.close();
      }
    },
    async search(query, options) {
      const config = loadConfig(options);
      const db = connect(config.databasePath);
      try {
        initializeSchema(db);
        const results = searchRepositories(createRepositoryStore(db), query);
        io.stdout.write(formatSearchResults(results, { color: config.colorOutput, clickableUrls: config.clickableUrls }));
      } finally {
        db.close();
      }
    },
    async show(repo, options) {
      const config = loadConfig(options);
      const db = connect(config.databasePath);
      try {
        initializeSchema(db);
        const result = inspectRepository(createRepositoryStore(db), repo);
        io.stdout.write(formatInspection(result));
      } finally {
        db.close();
      }
    }
  };
}

export function createProgram(handlers: CliHandlers = createDefaultHandlers({ stdout: process.stdout, stderr: process.stderr })) {
  const program = new Command();

  program
    .name("stargazer")
    .description("Sync and search GitHub starred repositories and Star Lists locally.")
    .option("--db <path>", "SQLite database path")
    .option("--token <token>", "GitHub token, defaults to GITHUB_TOKEN or GH_TOKEN");

  program
    .command("sync")
    .description("Sync starred repositories and Star Lists from GitHub.")
    .action(async () => {
      await handlers.sync(program.opts<BaseOptions>());
    });

  program
    .command("search")
    .description("Search local starred repository metadata and Star List names.")
    .argument("<query>", "repository or list search query")
    .action(async (query: string) => {
      await handlers.search(query, program.opts<BaseOptions>());
    });

  program
    .command("show")
    .description("Show stored metadata for one repository.")
    .argument("<repo>", "full name or unique repository name")
    .action(async (repo: string) => {
      await handlers.show(repo, program.opts<BaseOptions>());
    });

  return program;
}

export async function runCli(argv = process.argv, io: CliIo = { stdout: process.stdout, stderr: process.stderr }) {
  const program = createProgram(createDefaultHandlers(io));
  program.exitOverride();

  if (argv.length <= 2) {
    io.stdout.write(program.helpInformation());
    return;
  }

  try {
    await program.parseAsync(argv);
  } catch (error) {
    if (error instanceof CommanderError && error.code === "commander.helpDisplayed") {
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    io.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

function isDirectRun() {
  if (!process.argv[1]) return false;
  return fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(process.argv[1]);
}

if (isDirectRun()) {
  void runCli();
}
