import { formatStarListRepositories, formatStarLists, listStarListRepositories } from "../src/lists/lists.js";
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

  it("lists repositories in one Star List with search-style details", () => {
    const { store } = createTestStore();
    store.upsertRepository(repoBeta);
    store.upsertRepository(repoAlpha);
    store.upsertList(privateList);
    store.replaceListMembership(privateList.id, [repoBeta.id, repoAlpha.id]);

    const output = formatStarListRepositories(listStarListRepositories(store, "private tools"));

    expect(output).toContain("Repositories in Private Tools:");
    expect(output).toContain("octo/alpha");
    expect(output).toContain("[TypeScript]");
    expect(output).toContain("https://github.com/octo/alpha");
    expect(output).toContain("A tiny TypeScript search utility");
    expect(output).toContain("Lists: Private Tools");
    expect(output).toContain("octo/beta");
    expect(output).toContain("[JavaScript]");
    expect(output).toContain("https://github.com/octo/beta");
    expect(output).toContain("SQLite bookmark experiments");
  });

  it("formats matched Star Lists with no local repositories as empty", () => {
    const { store } = createTestStore();
    store.upsertList(publicList);

    const output = formatStarListRepositories(listStarListRepositories(store, "public research"));

    expect(output).toContain('No repositories found in local Star List "Public Research"');
  });

  it("formats unknown Star List names with a lists command hint", () => {
    const { store } = createTestStore();
    store.upsertList(publicList);

    const output = formatStarListRepositories(listStarListRepositories(store, "Tools"));

    expect(output).toBe('No local Star List found for "Tools". Run `stargazer lists` to see synced lists.\n');
  });

  it("formats ambiguous Star List names with stored names", () => {
    const { store } = createTestStore();
    store.upsertList({ ...publicList, id: "UL_tools_upper", name: "Tools", slug: "tools-upper" });
    store.upsertList({ ...privateList, id: "UL_tools_lower", name: "tools", slug: "tools-lower" });

    const output = formatStarListRepositories(listStarListRepositories(store, "tools"));

    expect(output).toBe('Star List name "tools" is ambiguous. Matching local Star Lists:\n- Tools\n- tools\n');
  });

  it("does not expose visibility markers in Star List repository output", () => {
    const { store } = createTestStore();
    store.upsertRepository(repoAlpha);
    store.upsertList(privateList);
    store.replaceListMembership(privateList.id, [repoAlpha.id]);

    const output = formatStarListRepositories(listStarListRepositories(store, "Private Tools"));

    expect(output).not.toContain("private");
    expect(output).not.toContain("public");
  });
});
