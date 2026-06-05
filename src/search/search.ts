import type { RepositoryRecord, RepositoryStore, StarListRecord } from "../db/repositories.js";

export interface SearchResult extends RepositoryRecord {
  lists: StarListRecord[];
  reasons: string[];
}

export function searchRepositories(store: RepositoryStore, query: string, limit = 20): SearchResult[] {
  const byRepo = new Map<string, SearchResult>();

  for (const repo of store.searchMetadata(query, limit)) {
    byRepo.set(repo.id, {
      ...repo,
      lists: store.listMemberships(repo.id),
      reasons: [metadataReason(repo, query)]
    });
  }

  for (const repo of store.findReposByListName(query, limit)) {
    const existing = byRepo.get(repo.id);
    if (existing) {
      existing.reasons.push(`list name matched "${query}"`);
    } else {
      byRepo.set(repo.id, {
        ...repo,
        lists: store.listMemberships(repo.id),
        reasons: [`list name matched "${query}"`]
      });
    }
  }

  return [...byRepo.values()].slice(0, limit);
}

function metadataReason(repo: RepositoryRecord, query: string) {
  const normalized = query.toLowerCase();
  if (repo.fullName.toLowerCase().includes(normalized) || repo.name.toLowerCase().includes(normalized)) {
    return `name matched "${query}"`;
  }
  return `description matched "${query}"`;
}
