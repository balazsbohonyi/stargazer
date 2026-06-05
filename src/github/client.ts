import type { RepositoryRecord, StarListRecord } from "../db/repositories.js";

export interface GitHubClientOptions {
  token: string;
  fetchImpl?: typeof fetch;
  restBaseUrl?: string;
  graphqlUrl?: string;
}

export interface StarListWithRepos {
  list: StarListRecord;
  repositories: RepositoryRecord[];
}

export interface StarSource {
  fetchStarredRepositories(): Promise<RepositoryRecord[]>;
  fetchStarLists(): Promise<StarListWithRepos[]>;
}

interface RestRepo {
  node_id: string;
  id: number;
  full_name: string;
  name: string;
  owner: { login: string };
  description: string | null;
  language: string | null;
  html_url: string;
  stargazers_count: number;
  updated_at: string;
}

interface GraphqlRepo {
  id: string;
  databaseId?: number | null;
  name: string;
  nameWithOwner: string;
  description?: string | null;
  url: string;
  primaryLanguage?: { name: string } | null;
  stargazerCount?: number | null;
  updatedAt?: string;
}

interface GraphqlList {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isPrivate: boolean;
  updatedAt?: string;
  items: {
    nodes: Array<GraphqlRepo | null>;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

export class GitHubApiError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

export class GitHubClient implements StarSource {
  private readonly fetchImpl: typeof fetch;
  private readonly restBaseUrl: string;
  private readonly graphqlUrl: string;

  constructor(private readonly options: GitHubClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.restBaseUrl = options.restBaseUrl ?? "https://api.github.com";
    this.graphqlUrl = options.graphqlUrl ?? "https://api.github.com/graphql";
  }

  async fetchStarredRepositories() {
    const repos: RepositoryRecord[] = [];
    let url: string | undefined = `${this.restBaseUrl}/user/starred?per_page=100`;

    while (url) {
      const response = await this.fetchImpl(url, {
        headers: this.headers("application/vnd.github+json")
      });
      await assertOk(response, "fetch starred repositories");
      const page = (await response.json()) as RestRepo[];
      repos.push(...page.map(mapRestRepo));
      url = parseNextLink(response.headers.get("link"));
    }

    return repos;
  }

  async fetchStarLists() {
    const lists: StarListWithRepos[] = [];
    let listCursor: string | null = null;

    do {
      const payload = await this.graphql(STAR_LISTS_QUERY, { listCursor });
      const connection = payload.data?.viewer?.lists;
      if (!connection) {
        throw new GitHubApiError("GitHub GraphQL response did not include viewer.lists.");
      }

      for (const node of connection.nodes as Array<GraphqlList | null>) {
        if (!node) continue;
        const repositories = node.items.nodes.filter(Boolean).map((repo) => mapGraphqlRepo(repo as GraphqlRepo));
        if (node.items.pageInfo.hasNextPage) {
          repositories.push(...(await this.fetchRemainingListRepositories(node.id, node.items.pageInfo.endCursor)));
        }

        lists.push({
          list: {
            id: node.id,
            name: node.name,
            slug: node.slug,
            description: node.description ?? null,
            isPrivate: node.isPrivate,
            updatedAt: node.updatedAt
          },
          repositories
        });
      }

      listCursor = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
    } while (listCursor);

    return lists;
  }

  private async fetchRemainingListRepositories(listId: string, initialCursor: string | null) {
    const repositories: RepositoryRecord[] = [];
    let itemCursor = initialCursor;

    while (itemCursor) {
      const payload = await this.graphql(STAR_LIST_ITEMS_QUERY, { listId, itemCursor });
      const items = payload.data?.node?.items;
      if (!items) {
        throw new GitHubApiError(`GitHub GraphQL response did not include items for list ${listId}.`);
      }

      repositories.push(...(items.nodes as Array<GraphqlRepo | null>).filter(Boolean).map((repo) => mapGraphqlRepo(repo as GraphqlRepo)));
      itemCursor = items.pageInfo.hasNextPage ? items.pageInfo.endCursor : null;
    }

    return repositories;
  }

  private async graphql(query: string, variables: Record<string, unknown>) {
    const response = await this.fetchImpl(this.graphqlUrl, {
      method: "POST",
      headers: this.headers("application/json"),
      body: JSON.stringify({ query, variables })
    });
    await assertOk(response, "fetch Star Lists");
    const payload = (await response.json()) as any;
    if (payload.errors?.length) {
      const message = payload.errors.map((error: { message: string }) => error.message).join("; ");
      throw new GitHubApiError(`GitHub GraphQL error: ${message}`);
    }
    return payload;
  }

  private headers(accept: string) {
    return {
      accept,
      authorization: `Bearer ${this.options.token}`,
      "user-agent": "stargazer-cli"
    };
  }
}

export const STAR_LISTS_QUERY = `
  query StarLists($listCursor: String) {
    viewer {
      lists(first: 100, after: $listCursor) {
        nodes {
          id
          name
          slug
          description
          isPrivate
          updatedAt
          items(first: 100) {
            nodes {
              ... on Repository {
                id
                databaseId
                name
                nameWithOwner
                description
                url
                primaryLanguage { name }
                stargazerCount
                updatedAt
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

export const STAR_LIST_ITEMS_QUERY = `
  query StarListItems($listId: ID!, $itemCursor: String) {
    node(id: $listId) {
      ... on UserList {
        items(first: 100, after: $itemCursor) {
          nodes {
            ... on Repository {
              id
              databaseId
              name
              nameWithOwner
              description
              url
              primaryLanguage { name }
              stargazerCount
              updatedAt
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }
`;

function mapRestRepo(repo: RestRepo): RepositoryRecord {
  const [owner, name] = repo.full_name.split("/");
  return {
    id: repo.node_id,
    databaseId: repo.id,
    fullName: repo.full_name,
    name: name ?? repo.name,
    owner: owner ?? repo.owner.login,
    description: repo.description,
    language: repo.language,
    url: repo.html_url,
    stargazerCount: repo.stargazers_count,
    updatedAt: repo.updated_at
  };
}

function mapGraphqlRepo(repo: GraphqlRepo): RepositoryRecord {
  const [owner, name] = repo.nameWithOwner.split("/");
  return {
    id: repo.id,
    databaseId: repo.databaseId ?? null,
    fullName: repo.nameWithOwner,
    name: name ?? repo.name,
    owner,
    description: repo.description ?? null,
    language: repo.primaryLanguage?.name ?? null,
    url: repo.url,
    stargazerCount: repo.stargazerCount ?? null,
    updatedAt: repo.updatedAt
  };
}

async function assertOk(response: Response, action: string) {
  if (response.ok) return;
  const text = await response.text();
  const detail = response.status === 401 || response.status === 403 ? " Check token permissions or rate limits." : "";
  throw new GitHubApiError(`Failed to ${action}: HTTP ${response.status}.${detail} ${text}`.trim(), response.status);
}

function parseNextLink(link: string | null) {
  if (!link) return undefined;
  for (const part of link.split(",")) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match) return match[1];
  }
  return undefined;
}
