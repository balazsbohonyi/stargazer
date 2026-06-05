import type { RepositoryStore } from "../db/repositories.js";
import type { StarSource } from "./client.js";

export interface SyncOptions {
  client: StarSource;
  store: RepositoryStore;
}

export interface SyncSummary {
  repositories: number;
  lists: number;
  memberships: number;
}

export async function syncStars({ client, store }: SyncOptions): Promise<SyncSummary> {
  const starredRepositories = await client.fetchStarredRepositories();
  const starLists = await client.fetchStarLists();

  return store.transaction(() => {
    let memberships = 0;
    for (const starList of starLists) {
      store.upsertList(starList.list);
      for (const repo of starList.repositories) {
        store.upsertRepository(repo);
      }
      const repoIds = starList.repositories.map((repo) => repo.id);
      store.replaceListMembership(starList.list.id, repoIds);
      memberships += repoIds.length;
    }

    for (const repo of starredRepositories) {
      store.upsertRepository(repo);
    }

    return {
      repositories: new Set([...starredRepositories.map((repo) => repo.id), ...starLists.flatMap((list) => list.repositories.map((repo) => repo.id))]).size,
      lists: starLists.length,
      memberships
    };
  });
}
