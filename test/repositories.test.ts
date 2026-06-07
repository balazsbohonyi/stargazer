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

  it("lists public and private Star Lists with local repository counts", () => {
    const { store } = createTestStore();
    store.upsertRepository(repoAlpha);
    store.upsertRepository(repoBeta);
    store.upsertList(privateList);
    store.upsertList(publicList);
    store.replaceListMembership(privateList.id, [repoAlpha.id, repoBeta.id]);

    expect(store.listSummaries()).toEqual([
      { name: "Private Tools", repositoryCount: 2 },
      { name: "Public Research", repositoryCount: 0 }
    ]);
  });

  it("sorts Star Lists case-insensitively with deterministic tie breaks", () => {
    const { store } = createTestStore();
    store.upsertList({ ...publicList, id: "UL_zed", name: "zed", slug: "zed" });
    store.upsertList({ ...publicList, id: "UL_alpha_upper", name: "Alpha", slug: "alpha-upper" });
    store.upsertList({ ...publicList, id: "UL_alpha_lower", name: "alpha", slug: "alpha-lower" });

    expect(store.listSummaries().map((list) => list.name)).toEqual(["Alpha", "alpha", "zed"]);
  });

  it("finds repositories in a Star List by exact case-insensitive name", () => {
    const { store } = createTestStore();
    store.upsertRepository(repoBeta);
    store.upsertRepository(repoAlpha);
    store.upsertList(privateList);
    store.replaceListMembership(privateList.id, [repoBeta.id, repoAlpha.id]);

    const result = store.findRepositoriesInListByName("private tools");

    expect(result.status).toBe("found");
    if (result.status !== "found") throw new Error("Expected Star List lookup to succeed");
    expect(result.list).toMatchObject({ name: "Private Tools", isPrivate: true });
    expect(result.repositories.map((repo) => repo.fullName)).toEqual(["octo/alpha", "octo/beta"]);
  });

  it("returns an empty repository list for a matched Star List without memberships", () => {
    const { store } = createTestStore();
    store.upsertList(publicList);

    const result = store.findRepositoriesInListByName("PUBLIC RESEARCH");

    expect(result.status).toBe("found");
    if (result.status !== "found") throw new Error("Expected Star List lookup to succeed");
    expect(result.list).toMatchObject({ name: "Public Research", isPrivate: false });
    expect(result.repositories).toEqual([]);
  });

  it("reports not found for unknown Star List names", () => {
    const { store } = createTestStore();
    store.upsertList(publicList);

    expect(store.findRepositoriesInListByName("Tools")).toEqual({ status: "not-found", input: "Tools" });
  });

  it("reports ambiguous Star List names that differ only by case", () => {
    const { store } = createTestStore();
    store.upsertList({ ...publicList, id: "UL_tools_upper", name: "Tools", slug: "tools-upper" });
    store.upsertList({ ...privateList, id: "UL_tools_lower", name: "tools", slug: "tools-lower" });

    const result = store.findRepositoriesInListByName("tools");

    expect(result.status).toBe("ambiguous");
    if (result.status !== "ambiguous") throw new Error("Expected Star List lookup to be ambiguous");
    expect(result.lists.map((list) => list.name)).toEqual(["Tools", "tools"]);
  });
});
