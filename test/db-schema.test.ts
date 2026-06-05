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
});
