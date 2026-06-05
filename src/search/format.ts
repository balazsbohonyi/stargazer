import type { SearchResult } from "./search.js";

export interface FormatOptions {
  color?: boolean;
  clickableUrls?: boolean;
}

export function formatSearchResults(results: SearchResult[], options: FormatOptions = {}) {
  if (results.length === 0) {
    return "No local matches. Run `stargazer sync` first if the database is empty.\n";
  }

  return results.map((result) => formatOne(result, options)).join("\n\n") + "\n";
}

function formatOne(result: SearchResult, options: FormatOptions) {
  const description = result.description ?? "No description";
  const language = result.language ? ` [${result.language}]` : "";
  const repoName = colorize(`${result.fullName}${language}`, "cyanBold", options.color);
  const lists = result.lists.length ? `Lists: ${result.lists.map((list) => list.name).join(", ")}` : "Lists: none";
  const url = formatUrl(result.url, options);

  return `${repoName}\n${description}\n${colorize(lists, "green", options.color)}\n${url}`;
}

function formatUrl(url: string, options: FormatOptions) {
  const displayUrl = colorize(url, "blueUnderline", options.color);
  if (!options.clickableUrls) return displayUrl;
  return `\u001B]8;;${url}\u0007${displayUrl}\u001B]8;;\u0007`;
}

function colorize(value: string, style: "cyanBold" | "green" | "yellow" | "blueUnderline", enabled = false) {
  if (!enabled) return value;
  const codes = {
    cyanBold: ["\u001B[1;36m", "\u001B[0m"],
    green: ["\u001B[32m", "\u001B[0m"],
    yellow: ["\u001B[33m", "\u001B[0m"],
    blueUnderline: ["\u001B[4;34m", "\u001B[0m"]
  } satisfies Record<typeof style, [string, string]>;
  const [open, close] = codes[style];
  return `${open}${value}${close}`;
}
