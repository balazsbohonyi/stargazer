import os from "node:os";
import path from "node:path";
import { config as loadDotenv } from "dotenv";

export type CommandName = "sync" | "search" | "show";

export interface BaseOptions {
  db?: string;
  token?: string;
}

export interface AppConfig {
  appDirectory: string;
  databasePath: string;
  databasePathSource: "flag" | "env" | "app-config" | "default";
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
  const appDirectory = resolveAppDirectory(env);
  let appConfig: Record<string, string | undefined> | undefined;
  const getAppConfig = () => (appConfig ??= loadAppConfig(appDirectory));
  const databasePathResolution = resolveDatabasePath(options, env, getAppConfig, appDirectory);
  const githubToken = options.token ?? env.GITHUB_TOKEN ?? env.GH_TOKEN ?? getAppConfig().GITHUB_TOKEN ?? getAppConfig().GH_TOKEN;

  return {
    appDirectory,
    databasePath: path.resolve(databasePathResolution.path),
    databasePathSource: databasePathResolution.source,
    githubToken,
    colorOutput: parseBoolean(env.GITHUB_STARS_COLOR ?? getAppConfig().GITHUB_STARS_COLOR, true) && env.NO_COLOR === undefined,
    clickableUrls: parseBoolean(env.GITHUB_STARS_CLICKABLE_URLS ?? getAppConfig().GITHUB_STARS_CLICKABLE_URLS, false)
  };
}

function resolveAppDirectory(env: NodeJS.ProcessEnv) {
  const homeDirectory = env.HOME ?? env.USERPROFILE ?? os.homedir();
  return path.resolve(homeDirectory, ".stargazer");
}

function loadAppConfig(appDirectory: string): Record<string, string | undefined> {
  const configPath = path.join(appDirectory, "config.env");
  return loadDotenv({ path: configPath, processEnv: {}, quiet: true }).parsed ?? {};
}

function resolveDatabasePath(
  options: BaseOptions,
  env: NodeJS.ProcessEnv,
  getAppConfig: () => Record<string, string | undefined>,
  appDirectory: string
): { path: string; source: AppConfig["databasePathSource"] } {
  if (options.db !== undefined) return { path: options.db, source: "flag" };
  if (env.GITHUB_STARS_DB !== undefined) return { path: env.GITHUB_STARS_DB, source: "env" };
  const appConfig = getAppConfig();
  if (appConfig.GITHUB_STARS_DB !== undefined) {
    return {
      path: path.isAbsolute(appConfig.GITHUB_STARS_DB)
        ? appConfig.GITHUB_STARS_DB
        : path.join(appDirectory, appConfig.GITHUB_STARS_DB),
      source: "app-config"
    };
  }
  return { path: path.join(appDirectory, "github-stars.sqlite"), source: "default" };
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
