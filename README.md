# Stargazer CLI

Search your GitHub starred repositories and GitHub Star Lists from a local SQLite cache.

This is a local-only CLI. `sync` reads from GitHub, stores repository metadata and Star List membership on your machine, and `lists`, `list`, `search`, and `show` read from that local database.

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

Create a persistent config file in your Stargazer app directory:

```sh
mkdir -p ~/.stargazer
chmod 700 ~/.stargazer
cat > ~/.stargazer/config.env <<'EOF'
GITHUB_TOKEN=github_pat_...
GITHUB_STARS_CLICKABLE_URLS=true
EOF
chmod 600 ~/.stargazer/config.env
```

Sync starred repositories and Star Lists:

```sh
stargazer sync
```

List synced Star Lists with local repository counts:

```sh
stargazer lists
```

List repositories in one synced Star List:

```sh
stargazer list "Private Tools"
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

The CLI reads persistent config from `~/.stargazer/config.env` and also accepts shell environment variables. It accepts `GITHUB_TOKEN` or `GH_TOKEN`.

```sh
stargazer sync
```

Shell environment variables override persistent config for the current command:

```sh
GITHUB_TOKEN=github_pat_... stargazer sync
```

You can also pass a token directly. CLI flags have the highest precedence:

```sh
stargazer --token github_pat_... sync
```

The sync command fails before contacting GitHub when no token is configured. Treat `~/.stargazer/config.env` as a sensitive local file because it may contain your token.

## Terminal Output

Search results use colored terminal output by default:

- Repository names are displayed as highlighted headings.
- Repository headings and repository names are yellow.
- Star List lines are green.
- URLs are blue and underlined.

Search output is formatted with the repository language beside the name, followed by the URL, description, and Star List membership:

```text
octo/alpha [TypeScript]
https://github.com/octo/alpha

A tiny TypeScript search utility

Lists: Private Tools, Public Research
```

Star List inventory output is compact and line-oriented:

```text
AI - 12 repositories
Private Tools - 3 repositories
Reading Later - 0 repositories
```

Star List repository output uses the same detailed repository layout as search results:

```text
Repositories in Private Tools:

octo/alpha [TypeScript]
https://github.com/octo/alpha

A tiny TypeScript search utility

Lists: Private Tools, Public Research
```

Make URLs clickable in terminals that support OSC 8 hyperlinks:

```sh
GITHUB_STARS_CLICKABLE_URLS=true stargazer search sqlite
```

Or set it persistently in `~/.stargazer/config.env`:

```env
GITHUB_STARS_CLICKABLE_URLS=true
```

Disable color output:

```env
GITHUB_STARS_COLOR=false
```

## Database Location

By default, the CLI stores data in `~/.stargazer/github-stars.sqlite`. The default path is user-global, so `sync`, `lists`, `search`, and `show` use the same local database no matter which directory you run `stargazer` from.

Override the database path with `--db` or `GITHUB_STARS_DB` when you need an isolated or advanced workflow:

```sh
stargazer --db ./stars.sqlite sync
stargazer --db ./stars.sqlite lists
stargazer --db ./stars.sqlite list "Private Tools"
stargazer --db ./stars.sqlite search sqlite
stargazer --db ./stars.sqlite show octo/repo
```

You can also set a persistent database override in `~/.stargazer/config.env`:

```env
GITHUB_STARS_DB=/path/to/stars.sqlite
```

If you used an older project checkout with `.github-stars.sqlite` in the project root, Stargazer will not move or delete that database automatically. To keep using it, pass `--db ./.github-stars.sqlite` or copy it manually to `~/.stargazer/github-stars.sqlite`.

## Commands

Sync starred repositories and Star Lists:

```sh
stargazer sync
```

List every locally synced Star List with its repository count from the last sync:

```sh
stargazer lists
```

List repositories in one locally synced Star List by exact name, matched case-insensitively:

```sh
stargazer list "Private Tools"
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

The CLI treats public and private GitHub Star Lists the same for local listing and search. Private list names, descriptions, and membership are stored only in the local SQLite database under `~/.stargazer` unless you override the path. The MVP does not publish, mutate, or sync list metadata back to GitHub.

Persistent config files are local sensitive files when they contain GitHub tokens. Keep `~/.stargazer/config.env` private and avoid copying it into shared project directories.

## Current Boundaries

Included:

- Read-only sync for starred repositories
- Read-only sync for GitHub Star Lists visible to the authenticated user
- Local SQLite persistence
- Star List inventory with repository counts
- Repository listing for one Star List by name
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
