import { createTestStore, privateList, publicList, repoAlpha } from "./helpers.js";
import { initializeSchema } from "../src/db/schema.js";

describe("database schema", () => {
  it("initializes twice without destroying rows", () => {
    const { db, store } = createTestStore();
    store.upsertRepository(repoAlpha);
    store.upsertList(privateList);
    store.upsertList(publicList);
    store.replaceListMembership(privateList.id, [repoAlpha.id]);

    initializeSchema(db);

    expect(store.findRepositoryCandidates("octo/alpha")[0]?.fullName).toBe("octo/alpha");
    expect(store.listMemberships(repoAlpha.id).map((list) => list.name)).toEqual(["Private Tools"]);
  });

  it("indexes list memberships by list id for summary and replacement queries", () => {
    const { db } = createTestStore();

    const indexes = db.prepare("PRAGMA index_list(repo_list_memberships)").all() as Array<{ name: string }>;
    expect(indexes.map((index) => index.name)).toContain("idx_repo_list_memberships_list_repo");

    const indexedColumns = db
      .prepare("PRAGMA index_info(idx_repo_list_memberships_list_repo)")
      .all() as Array<{ name: string }>;
    expect(indexedColumns.map((column) => column.name)).toEqual(["list_id", "repo_id"]);
  });
});
