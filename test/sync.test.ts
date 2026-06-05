import { createTestStore, privateList, publicList, repoAlpha, repoBeta } from "./helpers.js";
import { syncStars } from "../src/github/sync.js";
import type { StarSource } from "../src/github/client.js";

function client(overrides: Partial<StarSource> = {}): StarSource {
  return {
    fetchStarredRepositories: async () => [repoAlpha],
    fetchStarLists: async () => [
      { list: privateList, repositories: [repoAlpha] },
      { list: publicList, repositories: [repoBeta] }
    ],
    ...overrides
  };
}

describe("syncStars", () => {
  it("writes repositories, lists, memberships, and summary counts", async () => {
    const { store } = createTestStore();

    const summary = await syncStars({ client: client(), store });

    expect(summary).toEqual({ repositories: 2, lists: 2, memberships: 2 });
    expect(store.findRepositoryCandidates("octo/alpha")[0].lists[0]).toMatchObject({ name: "Private Tools", isPrivate: true });
    expect(store.findRepositoryCandidates("octo/beta")[0].lists[0]).toMatchObject({ name: "Public Research", isPrivate: false });
  });

  it("updates changed repository metadata on repeated sync", async () => {
    const { store } = createTestStore();
    await syncStars({ client: client(), store });
    await syncStars({
      client: client({ fetchStarredRepositories: async () => [{ ...repoAlpha, description: "Changed" }] }),
      store
    });

    expect(store.findRepositoryCandidates("octo/alpha")[0].description).toBe("Changed");
  });

  it("removes stale membership for a changed list", async () => {
    const { store } = createTestStore();
    await syncStars({ client: client(), store });
    await syncStars({
      client: client({
        fetchStarLists: async () => [{ list: privateList, repositories: [] }]
      }),
      store
    });

    expect(store.listMemberships(repoAlpha.id)).toEqual([]);
  });

  it("does not write partial repo data if list fetch fails", async () => {
    const { store } = createTestStore();

    await expect(
      syncStars({
        client: client({
          fetchStarLists: async () => {
            throw new Error("list sync failed");
          }
        }),
        store
      })
    ).rejects.toThrow("list sync failed");
    expect(store.findRepositoryCandidates("octo/alpha")).toEqual([]);
  });
});
