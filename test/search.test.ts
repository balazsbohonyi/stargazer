import { formatSearchResults } from "../src/search/format.js";
import { searchRepositories } from "../src/search/search.js";
import { createTestStore, privateList, publicList, repoAlpha, repoBeta } from "./helpers.js";

function populatedStore() {
  const { store } = createTestStore();
  store.upsertRepository(repoAlpha);
  store.upsertRepository(repoBeta);
  store.upsertList(privateList);
  store.upsertList(publicList);
  store.replaceListMembership(privateList.id, [repoAlpha.id]);
  store.replaceListMembership(publicList.id, [repoAlpha.id, repoBeta.id]);
  return store;
}

describe("search", () => {
  it("returns description matches with reasons", () => {
    const results = searchRepositories(populatedStore(), "SQLite");

    expect(results[0]).toMatchObject({ fullName: "octo/beta" });
    expect(results[0].reasons).toContain('description matched "SQLite"');
  });

  it("requires exact phrase matching when the whole query is quoted", () => {
    const store = populatedStore();
    store.upsertRepository({
      ...repoAlpha,
      description: "Skills for Real Engineers. Straight from my directory."
    });
    store.upsertRepository({
      ...repoBeta,
      description: "Executes real exploits before production."
    });

    expect(searchRepositories(store, '"Real Engineers"').map((repo) => repo.fullName)).toEqual(["octo/alpha"]);
    expect(searchRepositories(store, "Real Engineers").map((repo) => repo.fullName)).toEqual(["octo/alpha", "octo/beta"]);
  });

  it("searches private and public list names with the same path", () => {
    expect(searchRepositories(populatedStore(), "Private Tools").map((repo) => repo.fullName)).toEqual(["octo/alpha"]);
    expect(searchRepositories(populatedStore(), "Public Research").map((repo) => repo.fullName)).toEqual(["octo/alpha", "octo/beta"]);
  });

  it("deduplicates repositories that match metadata and list name", () => {
    const results = searchRepositories(populatedStore(), "Public");

    expect(results.filter((repo) => repo.fullName === "octo/alpha")).toHaveLength(1);
    expect(results.find((repo) => repo.fullName === "octo/alpha")?.reasons).toContain('list name matched "Public"');
  });

  it("formats an empty state before sync", () => {
    const { store } = createTestStore();

    expect(formatSearchResults(searchRepositories(store, "anything"))).toContain("Run `stargazer sync` first");
  });

  it("formats results with full descriptions and list names", () => {
    const store = populatedStore();
    const longDescription = "x".repeat(200);
    store.upsertRepository({ ...repoAlpha, description: longDescription });

    const output = formatSearchResults(searchRepositories(store, "alpha"));

    expect(output.startsWith("\n")).toBe(true);
    expect(output).toContain(
      "┌────────────┐\n│ octo/alpha │ [TypeScript]\n└────────────┘\nhttps://github.com/octo/alpha\n\n"
    );
    expect(output).toContain("Lists: Private Tools, Public Research");
    expect(output).toContain(`${longDescription}\n\nLists:`);
    expect(output).not.toContain("...");
  });

  it("can colorize repository names and render clickable URL links", () => {
    const output = formatSearchResults(searchRepositories(populatedStore(), "alpha"), {
      color: true,
      clickableUrls: true
    });

    expect(output).toContain(
      "\u001B[33m┌\u001B[0m\u001B[33m────────────\u001B[0m\u001B[33m┐\u001B[0m\n" +
        "\u001B[33m│\u001B[0m \u001B[33mocto/alpha\u001B[0m \u001B[33m│\u001B[0m [TypeScript]\n" +
        "\u001B[33m└\u001B[0m\u001B[33m────────────\u001B[0m\u001B[33m┘\u001B[0m\n"
    );
    expect(output).toContain("\u001B[32mLists: Private Tools, Public Research\u001B[0m");
    expect(output).toContain("\u001B]8;;https://github.com/octo/alpha\u0007");
    expect(output).toContain("\u001B[4;34mhttps://github.com/octo/alpha\u001B[0m");
    expect(output).not.toContain("Matched:");
  });
});
