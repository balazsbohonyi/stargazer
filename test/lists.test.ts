import { formatStarLists } from "../src/lists/lists.js";
import { createTestStore, privateList, publicList, repoAlpha, repoBeta } from "./helpers.js";

describe("Star List summaries", () => {
  it("formats list names and repository counts on scan-friendly lines", () => {
    expect(
      formatStarLists([
        { name: "AI", repositoryCount: 2 },
        { name: "Tools", repositoryCount: 1 }
      ])
    ).toBe("AI - 2 repositories\nTools - 1 repository\n");
  });

  it("formats empty local databases with a sync-first message", () => {
    expect(formatStarLists([])).toContain("Run `stargazer sync` first");
  });

  it("formats public and private lists identically without visibility markers", () => {
    const { store } = createTestStore();
    const privateNeutralList = { ...privateList, name: "Tools", slug: "tools", isPrivate: true };
    const publicNeutralList = { ...publicList, name: "Research", slug: "research", isPrivate: false };
    store.upsertRepository(repoAlpha);
    store.upsertRepository(repoBeta);
    store.upsertList(privateNeutralList);
    store.upsertList(publicNeutralList);
    store.replaceListMembership(privateNeutralList.id, [repoAlpha.id]);
    store.replaceListMembership(publicNeutralList.id, [repoBeta.id]);

    const output = formatStarLists(store.listSummaries());

    expect(output).toBe("Research - 1 repository\nTools - 1 repository\n");
    expect(output).not.toContain("private");
    expect(output).not.toContain("public");
  });

  it("keeps long list names and counts adjacent", () => {
    const output = formatStarLists([
      {
        name: "A very long Star List name that still needs a visible count",
        repositoryCount: 42
      }
    ]);

    expect(output).toContain("A very long Star List name that still needs a visible count - 42 repositories");
  });
});
