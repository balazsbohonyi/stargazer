import path from "node:path";
import { config as loadDotenv } from "dotenv";

export type CommandName = "sync" | "search" | "show";

export interface BaseOptions {
  db?: string;
  token?: string;
}

export interface AppConfig {
  databasePath: string;
  githubToken?: string;
  colorOutput: boolean;
  clickableUrls: boolean;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export function loadConfig(options: BaseOptions = {}, env: NodeJS.ProcessEnv = process.env): AppConfig {
  const runtimeEnv = env === process.env ? loadRuntimeEnv(env) : env;
  const databasePath = options.db ?? runtimeEnv.GITHUB_STARS_DB ?? path.resolve(process.cwd(), ".github-stars.sqlite");
  const githubToken = options.token ?? runtimeEnv.GITHUB_TOKEN ?? runtimeEnv.GH_TOKEN;

  return {
    databasePath: path.resolve(databasePath),
    githubToken,
    colorOutput: parseBoolean(runtimeEnv.GITHUB_STARS_COLOR, true) && runtimeEnv.NO_COLOR === undefined,
    clickableUrls: parseBoolean(runtimeEnv.GITHUB_STARS_CLICKABLE_URLS, false)
  };
}

function loadRuntimeEnv(env: NodeJS.ProcessEnv) {
  loadDotenv({ path: path.resolve(process.cwd(), ".env"), quiet: true });
  return env;
}

function parseBoolean(value: string | undefined, defaultValue: boolean) {
  if (value === undefined) return defaultValue;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function requireGithubToken(config: AppConfig): string {
  if (!config.githubToken) {
    throw new ConfigError("GitHub token is required for sync. Set GITHUB_TOKEN or pass --token.");
  }

  return config.githubToken;
}
