---
date: 2026-06-04
topic: github-star-search
---

# GitHub Star Search Requirements

## Summary

Build a CLI-first local search tool for GitHub stars and GitHub Star Lists. The MVP syncs starred repositories and the user's own public or private list membership into a local store, then supports fast keyword search over repo name and description with compact results that show enough context to identify the right repo.

---

## Problem Frame

GitHub stars are useful as lightweight bookmarks, and GitHub Star Lists are the user's own organization layer on top of those bookmarks. Those lists can be public or private; in the target workflow, many or most are private and visible only to the authenticated user. The built-in experience does not make it easy to search across the personal starred collection and its lists by the terms someone remembers later. The immediate pain is simple retrieval: finding a starred repository when the remembered clue is likely in the repo name, description, or the list it was saved into, with README text becoming useful once the core workflow works.

This is a personal productivity tool first, not a validated multi-user product. The requirements favor a small CLI that proves the local search workflow before adding richer indexing, AI assistance, or a web interface.

---

## Key Decisions

- **Metadata search first.** The first useful version searches repo name and description. README text is valuable, but it should not delay the first working retrieval loop.
- **CLI first.** The app should prove that local starred-repo search is useful from the command line before introducing a web UI.
- **GitHub remains the source.** GitHub remains the source of starred repositories and GitHub Star List membership. Local data exists to make search fast and to support local-only additions later, such as notes.
- **Public and private lists are equivalent for search.** The app should include any GitHub Star List created or managed by the authenticated user, whether public or private, as long as the user can access it.
- **Private organization stays private.** Private list membership and any other organization data around starred repositories should be treated as private user data unless the user explicitly chooses otherwise.
- **Compact results by default.** Search output should be easy to scan, showing repo identity, description, language when available, and why the repo matched.

---

## Requirements

**Sync**

- R1. The app syncs the authenticated user's starred GitHub repositories into a local store.
- R2. The app syncs GitHub Star Lists created or managed by the authenticated user, including both public and private lists.
- R3. The sync captures list membership so each locally stored repository can show which of the user's GitHub Star Lists contain it.
- R4. The sync captures enough repository metadata to support local search and compact result display.
- R5. The sync can be rerun to refresh starred repositories and list membership without requiring the user to rebuild local state manually.
- R6. Private GitHub Star Lists are accessed only through the authenticated user's permissions and remain private in local handling.

**Search**

- R7. The app provides a CLI search command that accepts a keyword query.
- R8. Search matches repositories by repo name and description in the MVP.
- R9. Search can filter or match by the user's GitHub Star List names, including private and public lists.
- R10. Search returns results quickly from local data rather than depending on live GitHub search at query time.
- R11. Search results show the repo full name, description, language when available, list membership when available, URL or another way to open the repo, and the matched field or reason.
- R12. Search behavior is useful for ordinary remembered terms, not only exact repo names.

**Inspection**

- R13. The app provides a way to inspect an individual matched repository in more detail after a search.
- R14. Detailed inspection shows the stored metadata and GitHub Star List membership that helped identify the repo.

**Expansion Path**

- R15. README text search is treated as the next expansion after metadata and list-aware search works.
- R16. The product shape should leave room for local-only organization features, such as notes or extra local categories, without requiring them in the MVP.
- R17. Private lists, categories, notes, and other user-created organization data are not published, synced back to GitHub, or exposed through any hosted service by default.

---

## Key Flows

- F1. Sync starred repositories
  - **Trigger:** The user runs the sync command.
  - **Actor:** A person who wants searchable local access to their starred GitHub repositories and GitHub Star Lists.
  - **Steps:** The app authenticates with GitHub, fetches the user's starred repositories, fetches the user's public and private Star List membership, stores searchable metadata locally, and reports the sync result.
  - **Outcome:** The user's starred repositories and list membership are available for local CLI search.
  - **Covers:** R1, R2, R3, R4, R5, R6

- F2. Search for a remembered repo
  - **Trigger:** The user remembers a term related to a starred repo.
  - **Actor:** A person trying to recover a previously starred repository.
  - **Steps:** The user runs search with a query, the app searches local metadata and list names, and compact matching results appear in the terminal.
  - **Outcome:** The user can identify and open or inspect the likely repository.
  - **Covers:** R7, R8, R9, R10, R11, R12

- F3. Inspect a result
  - **Trigger:** A search result looks promising but needs more context.
  - **Actor:** A person narrowing search results.
  - **Steps:** The user asks the app to show a specific repo, and the app displays stored details for that repository.
  - **Outcome:** The user can decide whether the repository is the one they were looking for.
  - **Covers:** R13, R14

---

## Acceptance Examples

- AE1. Metadata match
  - **Covers:** R7, R8, R11, R12
  - **Given:** The local store contains a starred repository whose description includes a searched term.
  - **When:** The user searches for that term.
  - **Then:** The repository appears in the result list with its full name, description, and match reason.

- AE2. Local search after sync
  - **Covers:** R1, R5, R10
  - **Given:** The user has completed a sync.
  - **When:** The user searches their stars.
  - **Then:** The app searches local data without requiring a live GitHub search request for the query.

- AE3. Private list match
  - **Covers:** R2, R3, R6, R9, R11
  - **Given:** The authenticated user has a private GitHub Star List named "AI" containing starred repositories.
  - **When:** The user searches or filters by that list name.
  - **Then:** Matching repositories from the private list appear locally, and the app does not expose the private list to anyone else.

- AE4. Public list match
  - **Covers:** R2, R3, R9, R11
  - **Given:** The authenticated user has a public GitHub Star List named "Tools" containing starred repositories.
  - **When:** The user searches or filters by that list name.
  - **Then:** Matching repositories from the public list appear locally using the same search behavior as private lists.

- AE5. README not required for MVP
  - **Covers:** R15
  - **Given:** A repository's name and description do not contain a searched term, but its README would.
  - **When:** The MVP does not yet index README text.
  - **Then:** Missing that match is acceptable, and README search remains a planned expansion rather than an MVP failure.

---

## Success Criteria

- A synced starred repository can be found by a term in its name or description.
- Repositories can be found through GitHub Star Lists created or managed by the user, whether those lists are public or private.
- Search results are compact enough to scan quickly in a terminal.
- A user can move from a search result to enough detail to identify or open the repository.
- The MVP remains useful without semantic search, AI-generated tags, or a web UI.

---

## Scope Boundaries

**MVP**

- Sync starred repositories from GitHub.
- Sync GitHub Star Lists created or managed by the authenticated user, including private and public lists.
- Search or filter by GitHub Star List membership.
- Search locally by repo name and description.
- Display compact search results.
- Inspect a single repository's stored details.
- Preserve privacy for any private GitHub star-list information the authenticated user can access.

**Deferred for later**

- README text indexing and search.
- Extra local-only categories, local notes, and manual tagging beyond GitHub Star Lists.
- Semantic search, embeddings, auto-tagging, AI summaries, and duplicate detection.
- Web UI.

**Out of scope**

- Replacing GitHub as the source of truth for which repositories are starred.
- Building a general GitHub search client for repositories outside the user's starred list.

---

## Dependencies / Assumptions

- The user can authenticate with GitHub to access their starred repositories.
- The user can authenticate with GitHub using permissions that expose the user's own public and private GitHub Star Lists.
- The user's GitHub Star Lists may be private or public, and both should be handled as normal searchable inputs.
- GitHub API rate limits are sufficient for a personal starred-repo sync workflow.
- The first version is optimized for one user's local machine, not hosted multi-user access.

---

## Sources / Research

- `github-star-search.md`
