# Stargazer CLI

Search your GitHub starred repositories and GitHub Star Lists from a local SQLite cache.

This is a local-only CLI. `sync` reads from GitHub, stores repository metadata and Star List membership on your machine, and `search` / `show` read from that local database.

## Setup

Requirements:

- Node.js 22 or newer
- A GitHub token that can read your starred repositories and your Star Lists

Install dependencies and build the CLI:

```sh
npm install
npm run build
```

Make the command available on your PATH while developing:

```sh
npm link
```

You can also install this checkout globally after building:

```sh
npm install -g .
```

Run checks:

```sh
npm test
npm run typecheck
npm run lint
```

## Quick Start

Create a `.env` file in the project root:

```env
GITHUB_TOKEN=github_pat_...
GITHUB_STARS_CLICKABLE_URLS=true
```

Sync starred repositories and Star Lists:

```sh
stargazer sync
```

Search repository names, descriptions, and Star List names:

```sh
stargazer search sqlite
stargazer search "Private Tools"
```

Inspect one stored repository:

```sh
stargazer show owner/repo
stargazer show repo
```

## Authentication

The CLI reads `.env` from the project root automatically, then falls back to the current shell environment. It accepts `GITHUB_TOKEN` or `GH_TOKEN`.

```sh
stargazer sync
```

You can also pass a token directly:

```sh
stargazer --token github_pat_... sync
```

The sync command fails before contacting GitHub when no token is configured. Keep `.env` out of git because it contains your token.

## Terminal Output

Search results use colored terminal output by default:

- Repository names are bold cyan.
- Star List lines are green.
- Match reasons are yellow.
- URLs are blue and underlined.

Make URLs clickable in terminals that support OSC 8 hyperlinks:

```env
GITHUB_STARS_CLICKABLE_URLS=true
```

Disable color output:

```env
GITHUB_STARS_COLOR=false
```

## Database Location

By default, the CLI stores data in `.github-stars.sqlite` in the current working directory.

Override the database path with `--db` or `GITHUB_STARS_DB`:

```sh
stargazer --db ./stars.sqlite sync
stargazer --db ./stars.sqlite search sqlite
stargazer --db ./stars.sqlite show octo/repo
```

## Commands

Sync starred repositories and Star Lists:

```sh
stargazer sync
```

Search repository names, descriptions, and Star List names:

```sh
stargazer search "sqlite"
stargazer search "Private Tools"
```

Inspect one stored repository:

```sh
stargazer show owner/repo
stargazer show repo
```

Short names must uniquely identify a repository. If more than one local repository has the same name, `show` prints the matching full names and asks you to use one.

## Privacy

The CLI treats public and private GitHub Star Lists the same for local search. Private list names, descriptions, and membership are stored only in the local SQLite database. The MVP does not publish, mutate, or sync list metadata back to GitHub.

## Current Boundaries

Included:

- Read-only sync for starred repositories
- Read-only sync for GitHub Star Lists visible to the authenticated user
- Local SQLite persistence
- Repository name and description search
- Star List name matching
- Compact search output and local repository inspection

Deferred:

- README text indexing
- Semantic search, embeddings, AI summaries, and auto-tagging
- Local-only notes or categories beyond GitHub Star Lists
- Web UI
- Creating or editing GitHub Star Lists

The persistence and search modules are separated so README indexing can be added later as another local search projection without changing the GitHub sync boundary.
