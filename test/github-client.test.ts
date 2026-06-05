import starredFixture from "./fixtures/github-starred.json" with { type: "json" };
import listsFixture from "./fixtures/github-user-lists.json" with { type: "json" };
import { GitHubApiError, GitHubClient } from "../src/github/client.js";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    ...init
  });
}

describe("GitHubClient", () => {
  it("combines paginated starred repositories", async () => {
    const fetches: string[] = [];
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      fetches.push(String(url));
      if (fetches.length === 1) {
        return jsonResponse(starredFixture, {
          headers: { link: '<https://api.github.test/user/starred?page=2>; rel="next"' }
        });
      }
      return jsonResponse([{ ...starredFixture[0], node_id: "R_beta", id: 2, full_name: "octo/beta", name: "beta" }]);
    }) as unknown as typeof fetch;
    const client = new GitHubClient({ token: "token", fetchImpl, restBaseUrl: "https://api.github.test" });

    const repos = await client.fetchStarredRepositories();

    expect(repos.map((repo) => repo.fullName)).toEqual(["octo/alpha", "octo/beta"]);
  });

  it("normalizes private and public Star Lists with membership", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(listsFixture)) as unknown as typeof fetch;
    const client = new GitHubClient({ token: "token", fetchImpl, graphqlUrl: "https://api.github.test/graphql" });

    const lists = await client.fetchStarLists();

    expect(lists).toHaveLength(2);
    expect(lists[0].list).toMatchObject({ name: "Private Tools", isPrivate: true });
    expect(lists[0].repositories[0].fullName).toBe("octo/alpha");
    expect(lists[1].list).toMatchObject({ name: "Public Research", isPrivate: false });
    expect(lists[1].repositories[0].fullName).toBe("octo/beta");
  });

  it("paginates repositories inside one Star List", async () => {
    const firstPage = structuredClone(listsFixture) as any;
    firstPage.data.viewer.lists.nodes = [firstPage.data.viewer.lists.nodes[0]];
    firstPage.data.viewer.lists.nodes[0].items.pageInfo = { hasNextPage: true, endCursor: "item-cursor" };
    const secondItemPage = {
      data: {
        node: {
          items: {
            nodes: [
              {
                id: "R_beta",
                databaseId: 2,
                name: "beta",
                nameWithOwner: "octo/beta",
                description: "SQLite bookmark experiments",
                url: "https://github.com/octo/beta",
                primaryLanguage: { name: "JavaScript" },
                stargazerCount: 20,
                updatedAt: "2026-01-02T00:00:00Z"
              }
            ],
            pageInfo: { hasNextPage: false, endCursor: null }
          }
        }
      }
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(firstPage))
      .mockResolvedValueOnce(jsonResponse(secondItemPage)) as unknown as typeof fetch;
    const client = new GitHubClient({ token: "token", fetchImpl });

    const lists = await client.fetchStarLists();

    expect(lists[0].repositories.map((repo) => repo.fullName)).toEqual(["octo/alpha", "octo/beta"]);
  });

  it("reports authentication and rate-limit style failures clearly", async () => {
    const fetchImpl = vi.fn(async () => new Response("bad token", { status: 403 })) as unknown as typeof fetch;
    const client = new GitHubClient({ token: "token", fetchImpl });

    await expect(client.fetchStarredRepositories()).rejects.toThrow(GitHubApiError);
    await expect(client.fetchStarredRepositories()).rejects.toThrow("Check token permissions or rate limits");
  });

  it("reports GraphQL errors", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ errors: [{ message: "Field does not exist" }] })) as unknown as typeof fetch;
    const client = new GitHubClient({ token: "token", fetchImpl });

    await expect(client.fetchStarLists()).rejects.toThrow("GitHub GraphQL error");
  });
});
