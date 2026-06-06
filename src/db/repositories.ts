import type { DbConnection } from "./connection.js";

export interface RepositoryRecord {
  id: string;
  databaseId?: number | null;
  fullName: string;
  name: string;
  owner: string;
  description?: string | null;
  language?: string | null;
  url: string;
  stargazerCount?: number | null;
  updatedAt?: string;
}

export interface StarListRecord {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isPrivate: boolean;
  updatedAt?: string;
}

export interface StarListSummary {
  name: string;
  repositoryCount: number;
}

export interface RepoWithLists extends RepositoryRecord {
  lists: StarListRecord[];
}

interface RepoRow {
  id: string;
  database_id: number | null;
  full_name: string;
  name: string;
  owner: string;
  description: string | null;
  language: string | null;
  url: string;
  stargazer_count: number | null;
  updated_at: string;
}

interface ListRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_private: 0 | 1;
  updated_at: string;
}

interface ListSummaryRow {
  name: string;
  repository_count: number;
}

export interface RepositoryStore {
  upsertRepository(repo: RepositoryRecord): void;
  upsertList(list: StarListRecord): void;
  replaceListMembership(listId: string, repoIds: string[]): void;
  searchMetadata(query: string, limit?: number): RepositoryRecord[];
  findReposByListName(query: string, limit?: number): RepositoryRecord[];
  getRepoWithLists(repoId: string): RepoWithLists | undefined;
  findRepositoryCandidates(input: string): RepoWithLists[];
  listMemberships(repoId: string): StarListRecord[];
  transaction<T>(fn: () => T): T;
}

export interface StarListSummaryStore {
  listSummaries(): StarListSummary[];
}

export type FullRepositoryStore = RepositoryStore & StarListSummaryStore;

export function createRepositoryStore(db: DbConnection): FullRepositoryStore {
  const now = () => new Date().toISOString();

  const upsertRepositoryStatement = db.prepare(`
    INSERT INTO repositories (
      id, database_id, full_name, name, owner, description, language, url, stargazer_count, updated_at
    ) VALUES (
      @id, @databaseId, @fullName, @name, @owner, @description, @language, @url, @stargazerCount, @updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      database_id = excluded.database_id,
      full_name = excluded.full_name,
      name = excluded.name,
      owner = excluded.owner,
      description = excluded.description,
      language = excluded.language,
      url = excluded.url,
      stargazer_count = excluded.stargazer_count,
      updated_at = excluded.updated_at
  `);

  const upsertListStatement = db.prepare(`
    INSERT INTO star_lists (id, name, slug, description, is_private, updated_at)
    VALUES (@id, @name, @slug, @description, @isPrivate, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      slug = excluded.slug,
      description = excluded.description,
      is_private = excluded.is_private,
      updated_at = excluded.updated_at
  `);

  const deleteMemberships = db.prepare("DELETE FROM repo_list_memberships WHERE list_id = ?");
  const insertMembership = db.prepare("INSERT OR IGNORE INTO repo_list_memberships (repo_id, list_id) VALUES (?, ?)");
  const deleteFts = db.prepare("DELETE FROM repo_fts WHERE repo_id = ?");
  const insertFts = db.prepare("INSERT INTO repo_fts (repo_id, full_name, description) VALUES (?, ?, ?)");

  function upsertRepository(repo: RepositoryRecord) {
    const payload = {
      ...repo,
      databaseId: repo.databaseId ?? null,
      description: repo.description ?? null,
      language: repo.language ?? null,
      stargazerCount: repo.stargazerCount ?? null,
      updatedAt: repo.updatedAt ?? now()
    };
    upsertRepositoryStatement.run(payload);
    deleteFts.run(repo.id);
    insertFts.run(repo.id, repo.fullName, repo.description ?? "");
  }

  function upsertList(list: StarListRecord) {
    upsertListStatement.run({
      ...list,
      description: list.description ?? null,
      isPrivate: list.isPrivate ? 1 : 0,
      updatedAt: list.updatedAt ?? now()
    });
  }

  function replaceListMembership(listId: string, repoIds: string[]) {
    const replace = db.transaction(() => {
      deleteMemberships.run(listId);
      for (const repoId of repoIds) {
        insertMembership.run(repoId, listId);
      }
    });
    replace();
  }

  function searchMetadata(query: string, limit = 20) {
    const ftsQuery = toFtsQuery(query);
    if (!ftsQuery) return [];
    const rows = db
      .prepare(
        `
        SELECT r.*
        FROM repo_fts f
        JOIN repositories r ON r.id = f.repo_id
        WHERE repo_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `
      )
      .all(ftsQuery, limit) as RepoRow[];
    return rows.map(mapRepoRow);
  }

  function findReposByListName(query: string, limit = 20) {
    const rows = db
      .prepare(
        `
        SELECT DISTINCT r.*
        FROM repositories r
        JOIN repo_list_memberships m ON m.repo_id = r.id
        JOIN star_lists l ON l.id = m.list_id
        WHERE lower(l.name) LIKE lower(?)
        ORDER BY r.full_name
        LIMIT ?
      `
      )
      .all(`%${query}%`, limit) as RepoRow[];
    return rows.map(mapRepoRow);
  }

  function listMemberships(repoId: string) {
    const rows = db
      .prepare(
        `
        SELECT l.*
        FROM star_lists l
        JOIN repo_list_memberships m ON m.list_id = l.id
        WHERE m.repo_id = ?
        ORDER BY l.name
      `
      )
      .all(repoId) as ListRow[];
    return rows.map(mapListRow);
  }

  function listSummaries() {
    const rows = db
      .prepare(
        `
        SELECT l.name, COUNT(m.repo_id) AS repository_count
        FROM star_lists l
        LEFT JOIN repo_list_memberships m ON m.list_id = l.id
        GROUP BY l.id, l.name
        ORDER BY lower(l.name), l.name, l.id
      `
      )
      .all() as ListSummaryRow[];
    return rows.map(mapListSummaryRow);
  }

  function getRepoWithLists(repoId: string) {
    const row = db.prepare("SELECT * FROM repositories WHERE id = ?").get(repoId) as RepoRow | undefined;
    return row ? { ...mapRepoRow(row), lists: listMemberships(row.id) } : undefined;
  }

  function findRepositoryCandidates(input: string) {
    const rows = db
      .prepare(
        `
        SELECT *
        FROM repositories
        WHERE full_name = ?
          OR lower(name) = lower(?)
          OR lower(full_name) LIKE lower(?)
        ORDER BY full_name
      `
      )
      .all(input, input, `%/${input}`) as RepoRow[];
    return rows.map((row) => ({ ...mapRepoRow(row), lists: listMemberships(row.id) }));
  }

  return {
    upsertRepository,
    upsertList,
    replaceListMembership,
    searchMetadata,
    findReposByListName,
    getRepoWithLists,
    findRepositoryCandidates,
    listMemberships,
    listSummaries,
    transaction: <T>(fn: () => T) => db.transaction(fn)()
  };
}

function mapRepoRow(row: RepoRow): RepositoryRecord {
  return {
    id: row.id,
    databaseId: row.database_id,
    fullName: row.full_name,
    name: row.name,
    owner: row.owner,
    description: row.description,
    language: row.language,
    url: row.url,
    stargazerCount: row.stargazer_count,
    updatedAt: row.updated_at
  };
}

function mapListRow(row: ListRow): StarListRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    isPrivate: Boolean(row.is_private),
    updatedAt: row.updated_at
  };
}

function mapListSummaryRow(row: ListSummaryRow): StarListSummary {
  return {
    name: row.name,
    repositoryCount: row.repository_count
  };
}

function toFtsQuery(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return "";

  const phrase = trimmed.match(/^"([^"]+)"$/);
  if (phrase?.[1].trim()) {
    return `"${phrase[1].replaceAll('"', '""')}"`;
  }

  return trimmed
    .split(/\s+/)
    .map((term) => term.replaceAll('"', ""))
    .filter(Boolean)
    .map((term) => `"${term}"*`)
    .join(" OR ");
}
