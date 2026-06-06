---
date: 2026-06-05
topic: user-global-storage
---

# User-Global Storage Requirements

## Summary

Move Stargazer's default persistence from the current working directory to a user-global app directory. The CLI and future browser UI should resolve the same SQLite database and simple config by default, with `~/.stargazer` as the visible developer-friendly home.

---

## Problem Frame

Stargazer is becoming an installable npm package instead of a development-only script. A default database in the current working directory works while developing the tool, but it becomes surprising after global installation because `stargazer sync`, `stargazer search`, and `stargazer show` can point at different databases depending on where the command is run.

The product is a personal local repo index. That shape needs one predictable local source of truth that the CLI can reach from any shell location and that a later browser UI can read through a CLI-started local server.

---

## Key Decisions

- **Use a user-global default store.** Stargazer should behave like one personal app by default, so all commands see the same local index without requiring `--db`.
- **Use `~/.stargazer` as the app directory.** A home dotdir is easy for developer users to inspect, back up, delete, and document. This is preferred over OS-native app data paths for the first packaged version.
- **Keep explicit database overrides.** `--db` and environment-based overrides remain useful escape hatches for tests, experiments, and advanced workflows, but they are not the normal path.
- **Use config file plus environment variables.** Stargazer should support simple local config in the app directory while continuing to honor flags and shell environment variables.
- **Launch the web UI through the CLI.** A future web command should start a local server that reads the same app directory and database as the CLI. The browser should not access SQLite directly.

---

## Requirements

**Default storage**

- R1. Stargazer stores its default SQLite database under a user-global app directory, not under the current working directory.
- R2. The default app directory is `~/.stargazer`.
- R3. The default database path is stable across `sync`, `search`, `show`, and future CLI commands.
- R4. Running Stargazer from different working directories uses the same default database unless the user provides an override.
- R5. Stargazer creates the app directory when a command needs to write app data and the directory does not exist.

**Overrides and compatibility**

- R6. A user-provided database path continues to override the default database location.
- R7. Environment-based database configuration continues to override the default database location.
- R8. Development and test workflows can still use isolated database paths without touching the user's default app data.
- R9. Existing project-root databases are not silently deleted or moved without an explicit migration decision.

**Config and secrets**

- R10. Stargazer supports a simple config file in the app directory for settings that should persist across shell sessions.
- R11. The GitHub token can be supplied through the config file, shell environment, or CLI flag.
- R12. CLI flags take precedence over persistent config for the same setting.
- R13. Shell environment variables remain supported for users who prefer not to store token-bearing config files.
- R14. Documentation makes the privacy tradeoff of a token-bearing config file clear.

**CLI-launched web UI**

- R15. A future web command starts a local HTTP server from the CLI.
- R16. The local web server reads the same default app directory and SQLite database as normal CLI commands.
- R17. The browser UI accesses repository data through local server routes, not by opening the SQLite database directly.
- R18. The web command reports the local URL or opens it for the user when the server starts.
- R19. Stopping the CLI-launched web server ends the browser UI backend for that session.

---

## Key Flows

- F1. Sync from any directory
  - **Trigger:** The user runs `stargazer sync` after global installation.
  - **Actor:** A developer using Stargazer as a personal local app.
  - **Steps:** Stargazer resolves the app directory, loads config and environment values, opens the default database, syncs GitHub star data, and stores it in the user-global database.
  - **Outcome:** The user's local index is refreshed in one predictable location.
  - **Covers:** R1, R2, R3, R4, R5, R10, R11, R12, R13

- F2. Search from another directory
  - **Trigger:** The user runs `stargazer search` from a different working directory.
  - **Actor:** A developer trying to refind a starred repository.
  - **Steps:** Stargazer resolves the same default app directory, opens the same default database, and searches the local index.
  - **Outcome:** Search results come from the user's personal index, not a new empty database in the current directory.
  - **Covers:** R1, R3, R4

- F3. Launch the browser UI
  - **Trigger:** The user runs a future web command.
  - **Actor:** A developer who wants a visual search interface.
  - **Steps:** Stargazer starts a local server, the server resolves the same app directory and database as the CLI, and the browser loads the UI from a local URL.
  - **Outcome:** The browser UI shows the same synced repositories that the CLI commands use.
  - **Covers:** R15, R16, R17, R18, R19

---

## Acceptance Examples

- AE1. Same database from different directories
  - **Covers:** R1, R3, R4
  - **Given:** The user has globally installed Stargazer and synced their stars.
  - **When:** The user runs `stargazer search sqlite` from a different working directory.
  - **Then:** Stargazer searches the same user-global database created by sync.

- AE2. Explicit database override
  - **Covers:** R6, R7, R8
  - **Given:** The user provides a custom database path.
  - **When:** The user runs a command with that override.
  - **Then:** Stargazer uses the custom database path instead of the default database under `~/.stargazer`.

- AE3. Config and environment precedence
  - **Covers:** R10, R11, R12, R13
  - **Given:** A persistent config value exists and the user provides a flag for the same setting.
  - **When:** Stargazer loads configuration for a command.
  - **Then:** The flag value wins for that command.

- AE4. Web UI reads the CLI database
  - **Covers:** R15, R16, R17, R18
  - **Given:** The user has synced repositories with the CLI.
  - **When:** The user starts the future web UI through Stargazer.
  - **Then:** The browser UI shows data from the same default database used by `search` and `show`.

---

## Success Criteria

- Users can globally install Stargazer and run commands from any directory without creating accidental per-directory databases.
- The default database and config location are easy to explain in the README.
- CLI overrides remain available for advanced users and tests.
- The future web UI has a clear source of truth: the same user-global database as the CLI.
- The storage decision does not require a background daemon, hosted service, or system keychain integration.

---

## Scope Boundaries

**In scope**

- User-global default database location.
- `~/.stargazer` as the default app directory.
- Persistent config in the app directory.
- Continued support for flags and environment variables.
- Requirements for a future CLI-launched local web server sharing the same database.

**Deferred for later**

- System keychain or credential-manager integration.
- OS-native app data directories.
- Named profiles or multiple first-class local indexes.
- Automated migration of existing project-root databases.
- Long-running background daemon behavior.

**Out of scope**

- Hosted multi-user access.
- Direct browser access to SQLite.
- Changing the synced GitHub data model.
- Implementing the web UI in this requirements pass.

---

## Dependencies / Assumptions

- Stargazer remains local-first and personal by default.
- Developer users will understand and accept a visible home dotdir.
- A config file may contain sensitive values, so documentation must set expectations around file privacy.
- A later web UI can be served locally by the CLI rather than requiring a separate installed service.

---

## Sources / Research

- `STRATEGY.md`
- `README.md`
- `src/config.ts`
- `src/cli.ts`
- `src/db/connection.ts`
- `docs/plans/2026-06-05-001-refactor-stargazer-cli-packaging-plan.md`
