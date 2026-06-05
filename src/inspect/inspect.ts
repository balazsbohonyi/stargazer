import type { RepoWithLists, RepositoryStore } from "../db/repositories.js";

export type InspectResult =
  | { status: "found"; repo: RepoWithLists }
  | { status: "not-found"; input: string }
  | { status: "ambiguous"; input: string; candidates: RepoWithLists[] };

export function inspectRepository(store: RepositoryStore, input: string): InspectResult {
  const candidates = store.findRepositoryCandidates(input);
  if (candidates.length === 0) return { status: "not-found", input };
  if (candidates.length > 1) return { status: "ambiguous", input, candidates };
  return { status: "found", repo: candidates[0] };
}

export function formatInspection(result: InspectResult) {
  if (result.status === "not-found") {
    return `No local repository found for "${result.input}". Run search or sync first.\n`;
  }

  if (result.status === "ambiguous") {
    return `Repository name "${result.input}" is ambiguous. Use one of:\n${result.candidates
      .map((candidate) => `- ${candidate.fullName}`)
      .join("\n")}\n`;
  }

  const repo = result.repo;
  const lists = repo.lists.length ? repo.lists.map((list) => `${list.name}${list.isPrivate ? " (private)" : ""}`).join(", ") : "none";
  return [
    repo.fullName,
    `Description: ${repo.description ?? "No description"}`,
    `Language: ${repo.language ?? "unknown"}`,
    `URL: ${repo.url}`,
    `Stars: ${repo.stargazerCount ?? "unknown"}`,
    `Lists: ${lists}`
  ].join("\n") + "\n";
}
