---
title: "refactor: Clean up root folder — remove gitignored junk and tracked legacy files"
type: refactor
status: active
date: 2026-04-30
---

# refactor: Clean up root folder — remove gitignored junk and tracked legacy files

## Overview

The repository root has accumulated three classes of clutter that hurt navigation, repo size, and onboarding clarity:

1. **Gitignored runtime junk** (~1.6 GB on disk): build caches, test reports, log files, multiple redundant PocketBase data snapshots, and a checked-out `pocketbase` binary.
2. **Tracked legacy AI-tool configs** that predate the current Claude Code workflow (`.clinerules/`, `.cursorrules`, `.roo/`, `.roomodes`, `.trae/`, `.taskmaster/`, `.github/instructions/`).
3. **Dead code and duplicate files** that have drifted from active references: a duplicate `LICENSE.md`, a stale unused `config/index.ts` whose locale codes contradict the active `config.ts`, an unused `i18n.js`, an unused `next-intl.config.js`, an upstream-PocketBase `CHANGELOG.md` that was committed once and never maintained, and a `.env.local.redis` shadow env file.

This plan removes the unnecessary files in three coordinated, low-risk passes and tightens `.gitignore` so the gitignored junk does not silently regrow.

The user has approved the **Full cleanup** scope: gitignored artifacts AND tracked legacy/dead files.

---

## Problem Frame

The user works in this repo daily and finds the root cluttered. Concretely:

- `ls` in the root shows ~78 entries; many are obsolete logs, snapshots, or AI-tool configs from earlier in the project's life.
- Legacy AI configs (`.cursorrules`, `.roo/`, `.trae/`, `.taskmaster/`, `.clinerules/`, `.github/instructions/taskmaster.md`, `.roomodes`) reference Taskmaster and other tools no longer used. Authoritative agent guidance now lives in `CLAUDE.md` and `AGENTS.md`.
- `config.ts` (`['ua', 'en']`) and `config/index.ts` (`['en', 'uk']`) coexist with **conflicting** locale identifiers. Only `config.ts` is imported (`app/layout.tsx`); `config/index.ts` is not only dead code, it is dead code that *contradicts* the live source of truth — a footgun if anyone touches it by mistake.
- `i18n.js` and `next-intl.config.js` are not referenced by `next.config.js`, `middleware.ts`, or any app file (the live next-intl entry point is `i18n.ts`).
- `CHANGELOG.md` is a copy of PocketBase's upstream changelog committed once on 2025-07-13, never updated since.
- `LICENSE` and `LICENSE.md` are near-duplicate license files.
- `pb_data_current/` (417 MB), `temp_pb/` (419 MB, contains a checked-out `pocketbase` binary), `pb_data_restore/`, and `pb_data_backup_20250726_162234/` (empty) are gitignored snapshots from 2025-07; the active dev DB is `pb_data/`.
- 13 `*.log` files in root totaling ~1 MB are gitignored.
- `.next/` (893 MB) and `tsconfig.tsbuildinfo` (298 KB) are regenerable build artifacts.

---

## Requirements Trace

- R1. Reduce root-folder clutter so `ls` shows only files that serve an active purpose.
- R2. Remove tracked legacy AI-tool configs that no longer reflect the current workflow (Claude Code + `CLAUDE.md` / `AGENTS.md`).
- R3. Remove dead code and duplicate files that are not imported by any live source path.
- R4. Reclaim disk space by removing redundant PocketBase snapshots, build artifacts, and log files (~1.6 GB total).
- R5. Prevent the gitignored junk from silently regrowing — patterns added to `.gitignore` must cover the deleted classes (e.g., `pb_data_*`, `temp_pb/`, root-level scratch logs).
- R6. Preserve the working dev environment: the active `pb_data/`, `.env`, `.env.local`, `node_modules/`, and `.git/` must not be touched.
- R7. Every removal of a tracked file must be verified as truly unused (grep for imports) before deletion.

---

## Scope Boundaries

- Only the repo root folder (and the immediate subfolders explicitly named in this plan). Nested cleanup of `app/`, `scripts/`, `messages/`, etc. is out of scope.
- No code refactoring, no behavior changes. This is purely file/folder removal plus `.gitignore` hygiene.
- `node_modules/`, `.git/`, `.idea/`, and `.vscode/` are out of scope (developer-local; respect existing conventions).
- The `package-lock.json` vs `yarn.lock` duality is **out of scope for this plan** — choosing a package manager is a separate decision that affects CI, scripts, and contributor workflow.

### Deferred to Follow-Up Work

- Choosing between `package-lock.json` and `yarn.lock`: separate decision; CLAUDE.md mixes `npm` and `yarn` references and needs alignment first.
- Migrating `docs/` loose markdown files (`AI_FEATURES_BRAINSTORM.md`, `RESEARCH_PROMPT_AI_SYSTEMS.md`, etc.) into `docs/brainstorms/` or `docs/plans/`: separate organizational pass.
- Auditing `scripts/` for unused one-off scripts: separate pass.

---

## Context & Research

### Relevant Code and Patterns

- `tsconfig.json` defines `paths: { "@/*": ["./*"] }` — when `@/config` is imported, Node module resolution prefers `./config.ts` over `./config/index.ts`, so `config/index.ts` is unreachable from `app/layout.tsx`'s `import { locales } from '@/config'`. Confirmed by reading `app/layout.tsx`.
- `next.config.js` wires `next-intl` via `createNextIntlPlugin()` with no arguments, which uses `i18n.ts` by default. `next-intl.config.js` and `i18n.js` are not referenced.
- `jest.config.js` matches tests in both `__tests__/**/*.test.ts(x)` and `tests/**/*.test.ts(x)`. Both directories must continue to work; this plan does not consolidate them.
- Active root-level dirs that are imported via `@/`: `lib/utils.ts` (~30 callers), `hooks/use-*` (~30 callers), `components/ui/`, `styles/globals.css`, `config.ts`. **Do not delete these.**
- `CLAUDE.md` and `AGENTS.md` are the authoritative agent-guidance files for this repo (per global CLAUDE.md rules and project CLAUDE.md). The other AI-tool configs are legacy.

### Institutional Learnings

- `docs/solutions/` does not currently exist — no prior cleanup playbook to reference.

### External References

- None required. This is a local file hygiene task; no framework/version-specific guidance applies.

---

## Key Technical Decisions

- **Use `git rm` for tracked files, plain `rm -rf` for gitignored ones.** Mixing them in a single command obscures which deletions need to land in a commit. Splitting them also lets us verify the gitignored deletions reclaim disk space without needing a commit.
- **Verify imports before deleting any tracked file.** For each tracked-file deletion, the implementer runs a targeted grep (specified per unit) and confirms zero hits before `git rm`. This is the central safety mechanism — every tracked file removal is guarded by an explicit non-import check.
- **Add gitignore patterns in the same commit as the tracked-file removals**, so the cleanup commit also prevents the junk from coming back. Doing this in two commits would leave a window where someone could re-add `pb_data_current/` and have it tracked.
- **Do not delete `node_modules/` or `.next/` from disk in this plan, but allow them to be cleared.** They will regenerate. The implementer can `rm -rf .next` to reclaim 893 MB if desired; `node_modules/` removal is up to the user (they may not want to re-run `yarn install` right now).
- **Keep `CHANGELOG.md` removal as a tracked-file deletion**, not a rename or relocation. It is not the project's changelog — it is upstream PocketBase content that was accidentally committed. Renaming would imply we are starting our own changelog, which is a separate decision.
- **Keep `.env.local.redis` removal in tracked-files unit**, not gitignored. It is currently tracked even though `.env*.local` is gitignored. The pattern in `.gitignore` (`.env*.local`) does not match `.env.local.redis` because of file ordering; it was added before that pattern was introduced. Remove from tracking via `git rm`.

---

## Open Questions

### Resolved During Planning

- Which AI tool configs are still used? **Resolution:** None. CLAUDE.md and AGENTS.md are authoritative; all other rule files are stale (Taskmaster references throughout, last touched ~2025-07).
- Is `config/index.ts` used anywhere? **Resolution:** No. `@/config` resolves to `config.ts` first; grep confirms no callers reference the directory form.
- Is `CHANGELOG.md` the project's own? **Resolution:** No. It is PocketBase upstream content; first 30 lines reference PocketBase issues and PRs.
- Is `i18n.js` used? **Resolution:** No. `next.config.js` uses default plugin config which loads `i18n.ts`. Grep finds zero references to `i18n.js`.
- Is `next-intl.config.js` used? **Resolution:** No. Same as above; the file even has a different `defaultLocale` (`'en'`) than the live config (`'ua'`), confirming it is orphaned.

### Deferred to Implementation

- Whether to also `rm -rf .next` and `rm -rf node_modules` during cleanup: leave to the implementer's judgment based on whether the user wants a fresh install/build cycle now.
- Final exact set of gitignore patterns to add: implementer should use the patterns this plan specifies as a floor, but may consolidate/clean up duplicates in `.gitignore` opportunistically.

---

## Implementation Units

- U1. **Delete gitignored runtime junk from disk**

**Goal:** Reclaim ~1.6 GB by removing build caches, test reports, log files, and stale PocketBase snapshots that are already gitignored.

**Requirements:** R1, R4, R6

**Dependencies:** None.

**Files:**
- Delete (gitignored, no git operation needed):
  - `*.log` (13 files in root: `all-rozetka-orders.log`, `excalidraw.log`, `fiscal-data-analysis.log`, `fiscal-receipt-fix-2025-07-26-18-28-41.log`, `order-data-fix.log`, `orders-validation-errors.log`, `product-counts-fix.log`, `product-counts-validation.log`, `recent-orders-fix-test.log`, `rozetka-pricing-analysis.log`, `rozetka-receipt-status-sync.log`, `target-order-857949587.log`, `test-rozetka-orders.log`)
  - `tsconfig.tsbuildinfo`
  - `.DS_Store`
  - `pb_data_backup_20250726_162234/` (0 B, empty)
  - `pb_data_restore/` (2.7 MB)
  - `pb_data_current/` (417 MB)
  - `temp_pb/` (419 MB, contains a checked-out `pocketbase` binary)
  - `playwright-report/` (empty data subdir)
  - `test-results/` (stale Playwright artifacts from 2025-07)
- Optional, implementer's call:
  - `.next/` (893 MB; will regenerate on next `next build`/`dev`)

**Approach:**
- Confirm `pb_data/` (the active dev DB) is **not** in this list. It must stay.
- Confirm none of these paths appears in `git ls-files` before deleting (sanity check that gitignore is doing its job).
- Use `rm -rf` for directories. Use plain `rm` for files. No `find` chains — explicit paths only, to avoid scoped-too-wide accidents.
- After deletion, run `du -sh .` (or equivalent) to confirm disk reclaim ≥ 800 MB.

**Patterns to follow:**
- N/A — this is filesystem hygiene, not application code.

**Test scenarios:**
- Test expectation: none — pure file removal of gitignored, untracked artifacts. No application behavior changes; existing test suites (Jest, Playwright) continue to pass because they regenerate their own outputs (`coverage/`, `playwright-report/`, `test-results/`).

**Verification:**
- `git status` shows no new tracked-file changes from this unit (the deletions were all gitignored).
- The active `pb_data/` directory still exists and contains `data.db`.
- `du -sh .` is at least 800 MB smaller than before.
- The dev server still starts and serves the app (smoke test by the user; this plan does not run servers).

---

- U2. **Remove tracked legacy AI-tool configs**

**Goal:** Stop tracking AI-assistant rule files for tools no longer in use (Cline, Cursor, Roo, Trae, Taskmaster). The active agent guidance is `CLAUDE.md` and `AGENTS.md`.

**Requirements:** R2, R7

**Dependencies:** None.

**Files:**
- Remove (tracked, requires `git rm -r`):
  - `.clinerules/` (4 files: `cline_rules.md`, `dev_workflow.md`, `self_improve.md`, `taskmaster.md`)
  - `.cursorrules` (single file at root)
  - `.roo/` (rules-architect, rules-ask, rules-code, rules-debug, rules-orchestrator, rules-test, rules/, mcp.json)
  - `.roomodes` (single file at root)
  - `.trae/` (rules/dev_workflow.md, rules/self_improve.md, rules/taskmaster.md, rules/trae_rules.md)
  - `.taskmaster/` (config.json, docs/, state.json, templates/, plus runtime logs/ and reports/ that may be untracked)
  - `.github/instructions/` (4 files: `dev_workflow.md`, `self_improve.md`, `taskmaster.md`, `vscode_rules.md`) — `.github/` itself stays in case workflows are added later.
- Verify before deleting: `grep -r -l "clinerules\|cursorrules\|roomodes\|taskmaster\|\.roo/\|\.trae/" app/ scripts/ middleware.ts next.config.js i18n.ts package.json --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" 2>/dev/null` should return zero hits referencing these as runtime dependencies (matches inside docs/comments are acceptable).

**Approach:**
- This is a pure deletion of stale tooling config. No application code references these paths at runtime — they are read by IDE/agent integrations only.
- Use `git rm -r .clinerules .roo .trae .taskmaster .github/instructions` for directories.
- Use `git rm .cursorrules .roomodes` for the single files.
- Stage all in one commit alongside U3 and U4 to keep the cleanup atomic and easy to revert if anything was misjudged.

**Patterns to follow:**
- The repo's authoritative agent guidance lives in `CLAUDE.md` (project root) and `AGENTS.md`. After this unit, those two files are the only sources of truth.

**Test scenarios:**
- Test expectation: none — these files are not loaded by application code, build, lint, or test runners. The verification grep above is the test.

**Verification:**
- `git status` shows the deletions staged.
- `npm run lint` still passes (no broken imports — there are none expected, since these files are tooling configs).
- A spot-check open of CLAUDE.md and AGENTS.md confirms they remain intact and authoritative.

---

- U3. **Remove tracked dead code and duplicate files**

**Goal:** Remove tracked files that have been confirmed dead or redundant: duplicate license, unused config variants, unused i18n configs, upstream-PocketBase changelog, and the leaked Redis env shadow file.

**Requirements:** R3, R7

**Dependencies:** None.

**Files:**
- Remove (tracked):
  - `LICENSE.md` — duplicate of `LICENSE`. Keep `LICENSE` (the canonical filename per GitHub conventions) and remove the `.md` variant.
  - `config/index.ts` (and the `config/` directory if it becomes empty) — dead code; not imported. Conflicts with `config.ts` on locale identifiers (`'uk'` vs `'ua'`).
  - `i18n.js` — unused; `i18n.ts` is the active next-intl entry.
  - `next-intl.config.js` — unused; `next.config.js` invokes `createNextIntlPlugin()` with defaults that load `i18n.ts`.
  - `CHANGELOG.md` — upstream PocketBase changelog content, not this project's. Last edit 2025-07-13; never updated.
  - `.env.local.redis` — tracked env file that should never have been committed (contains a Redis URL example with a hardcoded password). Confirm with the user that the password is not a real production secret before deletion; if it is, also rotate it. The file's body labels the password as `testpassword123` so this appears to be a local-only example, but the implementer must verify.
- Verify before deleting (grep guards — each must return zero hits):
  - `grep -rn "from ['\"]@/config['\"]" app/ middleware.ts i18n.ts --include="*.ts" --include="*.tsx"` — any hits resolve to `config.ts`, **not** `config/index.ts`. Confirm by inspecting the resolved file.
  - `grep -rn "i18n\\.js" . --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git`
  - `grep -rn "next-intl\\.config" . --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git`
  - `grep -rn "LICENSE\\.md" . --include="*.md" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git` (check for any docs that link to it specifically)
  - `grep -rn "\\.env\\.local\\.redis" . --include="*.md" --include="*.ts" --include="*.js" --include="*.json" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git`

**Approach:**
- For each file, run the matching grep above. **Zero hits** is the required signal to delete.
- Use `git rm` for each file. After removing `config/index.ts`, also `rmdir config/` (it should be empty; if not, leave it and surface the unexpected contents to the user).
- The `.env.local.redis` deletion is the only one that has a "did you mean to commit a secret" angle. The file body suggests it is example/test config, but treat any password string with caution: if the user confirms it is non-secret, delete normally; if it was real, rotate the credential separately before or in parallel with this cleanup.

**Patterns to follow:**
- `app/layout.tsx` line containing `import { locales } from '@/config'` is the canonical reader of `config.ts`. Do not change this import.
- `next.config.js` wires next-intl via the default plugin config, which uses `i18n.ts`. Do not change this either.

**Test scenarios:**
- Happy path: After deletions, `npm run lint` exits 0. `npx tsc --noEmit` (or `npm run build` if the user chooses to run it) reports no missing module errors.
- Edge case: A search for `from '@/config/'` (with trailing slash) returns zero hits — confirms nobody is reaching past the file into the directory form.
- Error path: If lint/typecheck fails after deletion citing a missing module from one of the removed files, restore that file via `git restore --staged --worktree <path>` and reinvestigate before proceeding.

**Verification:**
- `npm run lint` exits clean.
- `git ls-files | grep -E '^(LICENSE\\.md|config/|i18n\\.js|next-intl\\.config\\.js|CHANGELOG\\.md|\\.env\\.local\\.redis)$'` returns no rows.
- The active `LICENSE`, `config.ts`, `i18n.ts`, and `.env.local` files still exist and are unchanged.

---

- U4. **Tighten `.gitignore` so junk does not regrow**

**Goal:** Add patterns to `.gitignore` that cover all the gitignored junk classes deleted in U1 and the unintentionally tracked file class in U3, so the cleanup is durable.

**Requirements:** R5, R6

**Dependencies:** U1 (so the patterns can be validated against an already-clean tree), U3 (so the `.env.local.redis` removal is reflected by a pattern that would catch its return).

**Files:**
- Modify: `.gitignore`

**Approach:**
- Read the current `.gitignore`. Its existing rules cover `*.log`, `.DS_Store`, `*.tsbuildinfo`, `/.next/`, `/pb_data`, `/pb_data_backup`, `/pb_data_restore`, `temp_pb`, `pb_data_current`, `pocketbase`, `.env`, `.env.local`, `.env*.local`, `.idea`, `coverage`, `tasks/`, `tasks.json`, `prd.md`, several specific log filenames.
- Add a small, non-redundant block at the bottom labelled `# Cleanup hygiene (added YYYY-MM-DD)` containing only patterns the existing file does not already cover. Concretely, evaluate and add as needed:
  - `pb_data_*/` (matches `pb_data_backup_<timestamp>`, future variants — broader than the existing literal `/pb_data_backup`).
  - `playwright-report/`
  - `test-results/`
  - `.env.local.redis` (or `.env.local.*` to cover similar shadows; pick the broader form unless the user wants finer control — broader is safer here because the goal is preventing accidental commits of secret-bearing env files).
- Do **not** add patterns that already exist; opportunistically remove obvious duplicates the existing file has (e.g., `node_modules/` appears twice). Keep the diff small and reviewable.
- Do **not** restructure or reformat the rest of `.gitignore` in this unit — that is scope creep.

**Patterns to follow:**
- The existing `.gitignore` is a flat, comment-grouped file. Mirror that style: one comment header, one block of patterns, blank line.

**Test scenarios:**
- Happy path: `git check-ignore -v playwright-report test-results .env.local.redis pb_data_backup_20260101_000000` returns matches against the new rules.
- Edge case: `git check-ignore -v pb_data` (the **active** dev DB directory) still matches the existing `/pb_data` rule and is **not** broken by the broader `pb_data_*/` rule. Verify with the explicit command.
- Error path: If `git check-ignore` reveals that the new pattern accidentally captures `pb_data/` as well, the pattern was wrong — narrow it (e.g., use `pb_data_backup*/`, `pb_data_restore*/`, `pb_data_current*/` explicitly, or anchor with a trailing component that does not match the active dir).

**Verification:**
- `git check-ignore -v <each-pattern-target>` returns the expected rule for every target listed in the test scenarios above.
- `git status` is clean except for the `.gitignore` modification and the staged removals from U2 and U3.

---

- U5. **Commit, smoke-test, and report disk savings**

**Goal:** Land the tracked-file deletions and `.gitignore` change as one atomic commit; verify the working tree, lint, and basic smoke test pass; report final disk savings.

**Requirements:** R1, R4, R5, R6, R7

**Dependencies:** U1, U2, U3, U4.

**Files:**
- No new files. Commit-only step.

**Approach:**
- Stage all the deletions from U2 and U3 plus the `.gitignore` modification from U4 into a single commit. (U1's deletions do not appear in `git status` because they were gitignored.)
- Commit message format (conventional commit, no Claude watermark per global CLAUDE.md):
  ```
  refactor: clean up root folder

  - Remove unused AI-tool configs (.clinerules, .cursorrules, .roo, .roomodes, .trae, .taskmaster, .github/instructions)
  - Remove dead code and duplicates (config/index.ts, i18n.js, next-intl.config.js, LICENSE.md, CHANGELOG.md, .env.local.redis)
  - Tighten .gitignore to cover pb_data_*, playwright-report, test-results, .env.local.*

  Reclaims ~1.6 GB on disk (gitignored snapshots, build caches, logs).
  ```
- Run `npm run lint` and confirm it exits 0.
- Run `git status` and confirm it is clean.
- Report to the user: number of files removed, disk reclaimed (rough), and any items that were inspected and intentionally **not** removed (e.g., `node_modules`, `package-lock.json`/`yarn.lock` duality, `docs/` markdown sprawl).

**Patterns to follow:**
- Commit format follows the project's recent commits (`fix:`, `feat:`, `chore:`, `refactor:` prefixes — see `git log --oneline -5`).

**Test scenarios:**
- Happy path: `npm run lint` exits 0; `git status` is clean post-commit; `du -sh .` is at least 800 MB smaller than the pre-cleanup baseline.
- Edge case: If `npm run lint` flags an issue introduced by a deletion, revert just the offending deletion (`git restore --source=HEAD~1 -- <path>`) and rerun.
- Integration: The dev server is **not** started by this plan (per project CLAUDE.md: "Never run the development server"). User runs the smoke test manually if desired.

**Verification:**
- `git log -1` shows the cleanup commit on the current branch (`main` per current state).
- `git status` is clean.
- `npm run lint` exits 0.
- The user can confirm the dev server still works (out of scope to start it here).

---

## System-Wide Impact

- **Interaction graph:** None. No code paths import any of the removed files. The grep guards in U2 and U3 are the proof.
- **Error propagation:** None expected. If lint/typecheck flags a missing module, the implementer reverts the specific deletion and reinvestigates (covered in U3 and U5 error paths).
- **State lifecycle risks:** The risky deletions are the gitignored `pb_data_*` snapshots. Confirmed in U1 that the **active** `pb_data/` is preserved. The snapshots are stale (2025-07) and cannot be confused with current data because their `data.db` mtimes are 8+ months old.
- **API surface parity:** N/A — no APIs touched.
- **Integration coverage:** Existing Jest and Playwright suites are unaffected; their output directories regenerate.
- **Unchanged invariants:**
  - `app/layout.tsx`'s `import { locales } from '@/config'` continues to resolve to `config.ts`.
  - `next.config.js`'s `createNextIntlPlugin()` continues to load `i18n.ts`.
  - `pb_data/`, `.env`, `.env.local`, `node_modules/`, `package.json`, `yarn.lock`, `package-lock.json` are untouched.
  - `CLAUDE.md` and `AGENTS.md` remain the agent-guidance source of truth.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Deleting a file that turns out to be imported somewhere not covered by grep. | Each tracked-file deletion has an explicit grep guard in U2/U3. Lint and typecheck after each unit. The cleanup is a single commit, trivially revertible with `git revert`. |
| `.env.local.redis` contains a real production secret. | Inspected: file labels its password `testpassword123` and explicitly says "Your production Redis stays in .env." Treat as test config. If user disagrees, rotate the credential before/alongside deletion. |
| Broader `pb_data_*/` gitignore pattern accidentally captures the active `pb_data/`. | U4 verification explicitly tests `git check-ignore -v pb_data` to confirm it still matches the existing `/pb_data` rule, not the new broader one. If it does break, narrow the pattern to specific suffixes. |
| User loses needed historical data by deleting `pb_data_current/` (417 MB) or `temp_pb/` (419 MB). | These are gitignored July 2025 snapshots, 9+ months stale. The active dev DB is `pb_data/`. If the user has any uncertainty, U1 can be split: do logs/build caches first, defer the PocketBase snapshots to a follow-up after explicit user confirmation. |
| Cleanup commit accidentally bundles unrelated work. | U5 specifies committing only the U2 + U3 + U4 changes. Implementer runs `git status` and `git diff --cached` before committing to verify scope. |

---

## Documentation / Operational Notes

- After cleanup, consider a one-line note in CLAUDE.md or AGENTS.md confirming that `.cursorrules`, `.roo`, `.trae`, `.taskmaster` etc. are no longer used and that agent guidance lives only in CLAUDE.md / AGENTS.md. This is **optional** and not part of this plan's scope.
- No rollout steps. No monitoring. This is a local refactor.
- If a future contributor sees a `pb_data_<timestamp>/` snapshot they want to keep, they should move it outside the repo or archive it explicitly — the new gitignore intentionally hides those.

---

## Sources & References

- Working tree state captured during planning (root `ls -la`, `git ls-files`, `du -sh`, `git check-ignore -v`).
- `package.json`, `tsconfig.json`, `jest.config.js`, `next.config.js`, `next-intl.config.js`, `i18n.ts`, `i18n.js`, `config.ts`, `config/index.ts`, `app/layout.tsx`, `.gitignore` — all read during Phase 1.
- Project `CLAUDE.md` and global `~/.claude/CLAUDE.md` — agent guidance constraints (no `npm run dev`/`build`, no Claude watermark in commits, lint as primary check).
