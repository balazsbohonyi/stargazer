import { connect } from "../src/db/connection.js";
import { createRepositoryStore, type RepositoryRecord, type StarListRecord } from "../src/db/repositories.js";
import { initializeSchema } from "../src/db/schema.js";

export function createTestStore() {
  const db = connect(":memory:");
  initializeSchema(db);
  return {
    db,
    store: createRepositoryStore(db)
  };
}

export const repoAlpha: RepositoryRecord = {
  id: "R_alpha",
  databaseId: 1,
  fullName: "octo/alpha",
  name: "alpha",
  owner: "octo",
  description: "A tiny TypeScript search utility",
  language: "TypeScript",
  url: "https://github.com/octo/alpha",
  stargazerCount: 10,
  updatedAt: "2026-01-01T00:00:00Z"
};

export const repoBeta: RepositoryRecord = {
  id: "R_beta",
  databaseId: 2,
  fullName: "octo/beta",
  name: "beta",
  owner: "octo",
  description: "SQLite bookmark experiments",
  language: "JavaScript",
  url: "https://github.com/octo/beta",
  stargazerCount: 20,
  updatedAt: "2026-01-02T00:00:00Z"
};

export const privateList: StarListRecord = {
  id: "UL_private",
  name: "Private Tools",
  slug: "private-tools",
  description: "Personal shortlist",
  isPrivate: true,
  updatedAt: "2026-01-03T00:00:00Z"
};

export const publicList: StarListRecord = {
  id: "UL_public",
  name: "Public Research",
  slug: "public-research",
  description: "Public shortlist",
  isPrivate: false,
  updatedAt: "2026-01-04T00:00:00Z"
};
