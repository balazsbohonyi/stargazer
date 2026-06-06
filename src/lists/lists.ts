import type { StarListSummary } from "../db/repositories.js";

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
