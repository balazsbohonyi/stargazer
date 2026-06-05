import { formatInspection, inspectRepository } from "../src/inspect/inspect.js";
import { createTestStore, privateList, repoAlpha, repoBeta } from "./helpers.js";

describe("inspect", () => {
  it("shows known repository metadata and list membership", () => {
    const { store } = createTestStore();
    store.upsertRepository(repoAlpha);
    store.upsertList(privateList);
    store.replaceListMembership(privateList.id, [repoAlpha.id]);

    const output = formatInspection(inspectRepository(store, "octo/alpha"));

    expect(output).toContain("octo/alpha");
    expect(output).toContain("A tiny TypeScript search utility");
    expect(output).toContain("TypeScript");
    expect(output).toContain("https://github.com/octo/alpha");
    expect(output).toContain("Private Tools (private)");
  });

  it("returns ambiguous short names with possible full names", () => {
    const { store } = createTestStore();
    store.upsertRepository({ ...repoAlpha, fullName: "octo/tool", name: "tool" });
    store.upsertRepository({ ...repoBeta, fullName: "acme/tool", name: "tool" });

    const output = formatInspection(inspectRepository(store, "tool"));

    expect(output).toContain("ambiguous");
    expect(output).toContain("octo/tool");
    expect(output).toContain("acme/tool");
  });

  it("returns a clear not-found message", () => {
    const { store } = createTestStore();

    expect(formatInspection(inspectRepository(store, "missing"))).toContain("No local repository found");
  });
});
