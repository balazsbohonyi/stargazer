import type { StarListRecord, StarListRepositoriesResult, StarListSummary } from "../db/repositories.js";
import { formatSearchResults, type FormatOptions } from "../search/format.js";
import type { SearchResult } from "../search/search.js";
import type { RepositoryStore } from "../db/repositories.js";

export function formatStarLists(lists: StarListSummary[]) {
  if (lists.length === 0) {
    return "No local Star Lists found. Run `stargazer sync` first if the database is empty.\n";
  }

  return `${lists.map(formatStarList).join("\n")}\n`;
}

function formatStarList(list: StarListSummary) {
  const label = list.repositoryCount === 1 ? "repository" : "repositories";
  return `${list.name} - ${list.repositoryCount} ${label}`;
}

export type StarListRepositoryListingResult =
  | { status: "found"; list: StarListRecord; repositories: SearchResult[] }
  | Exclude<StarListRepositoriesResult, { status: "found" }>;

export function listStarListRepositories(store: RepositoryStore, name: string): StarListRepositoryListingResult {
  const result = store.findRepositoriesInListByName(name);
  if (result.status !== "found") return result;

  return {
    status: "found",
    list: result.list,
    repositories: result.repositories.map((repo) => ({
      ...repo,
      lists: store.listMemberships(repo.id),
      reasons: [`list name matched "${result.list.name}"`]
    }))
  };
}

export function formatStarListRepositories(result: StarListRepositoryListingResult, options: FormatOptions = {}) {
  if (result.status === "not-found") {
    return `No local Star List found for "${result.input}". Run \`stargazer lists\` to see synced lists.\n`;
  }

  if (result.status === "ambiguous") {
    return `Star List name "${result.input}" is ambiguous. Matching local Star Lists:\n${result.lists.map((list) => `- ${list.name}`).join("\n")}\n`;
  }

  if (result.repositories.length === 0) {
    return `No repositories found in local Star List "${result.list.name}". Run \`stargazer sync\` to refresh local data.\n`;
  }

  return `Repositories in ${result.list.name}:\n${formatSearchResults(result.repositories, options)}`;
}
