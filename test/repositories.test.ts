import { createTestStore, privateList, publicList, repoAlpha, repoBeta } from "./helpers.js";

describe("repository store", () => {
  it("upserts repositories and updates metadata without duplicates", () => {
    const { store } = createTestStore();
    store.upsertRepository(repoAlpha);
    store.upsertRepository({ ...repoAlpha, description: "Updated metadata" });

    const result = store.findRepositoryCandidates("octo/alpha");

    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("Updated metadata");
  });

  it("preserves list identity and privacy flag on upsert", () => {
    const { store } = createTestStore();
    store.upsertList(privateList);
    store.upsertRepository(repoAlpha);
    store.replaceListMembership(privateList.id, [repoAlpha.id]);
    store.upsertList({ ...privateList, name: "Renamed Private Tools", isPrivate: true });

    expect(store.listMemberships(repoAlpha.id)[0]).toMatchObject({
      id: privateList.id,
      name: "Renamed Private Tools",
      isPrivate: true
    });
  });

  it("replaces stale memberships for one synced list", () => {
    const { store } = createTestStore();
    store.upsertRepository(repoAlpha);
    store.upsertRepository(repoBeta);
    store.upsertList(publicList);
    store.replaceListMembership(publicList.id, [repoAlpha.id, repoBeta.id]);
    store.replaceListMembership(publicList.id, [repoBeta.id]);

    expect(store.listMemberships(repoAlpha.id)).toEqual([]);
    expect(store.listMemberships(repoBeta.id).map((list) => list.name)).toEqual(["Public Research"]);
  });

  it("indexes repository full name and description for local lookup", () => {
    const { store } = createTestStore();
    store.upsertRepository(repoAlpha);

    expect(store.searchMetadata("TypeScript")[0]?.fullName).toBe("octo/alpha");
    expect(store.searchMetadata("alpha")[0]?.fullName).toBe("octo/alpha");
  });

  it("represents one repository in private and public lists", () => {
    const { store } = createTestStore();
    store.upsertRepository(repoAlpha);
    store.upsertList(privateList);
    store.upsertList(publicList);
    store.replaceListMembership(privateList.id, [repoAlpha.id]);
    store.replaceListMembership(publicList.id, [repoAlpha.id]);

    expect(store.listMemberships(repoAlpha.id).map((list) => list.name)).toEqual(["Private Tools", "Public Research"]);
  });
});
