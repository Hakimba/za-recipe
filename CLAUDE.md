# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**za-recipe** — personal iPhone PWA companion app for pizza recipes with automatic preferment (biga, poolish) calculations. Solo user (the repo owner), no backend, offline-first.

- Repo: `https://github.com/Hakimba/za-recipe`
- Deployed: `https://hakimba.github.io/za-recipe/` (auto-deployed from `main` via `.github/workflows/deploy.yml`)
- Installed on iPhone via Safari → Share → "Add to Home Screen"
- Local working directory name (`pizza-calculation-preferment`) does not match the repo name (`za-recipe`); Vite base path is `/za-recipe/`

## Commands

```bash
npm run dev           # Vite dev server (http://localhost:5173/za-recipe/)
npm run typecheck     # tsc -b --noEmit (strict mode)
npm test              # vitest run (one shot)
npm run test:watch    # vitest watch
npm run build         # tsc -b && vite build
npm run preview       # serve the prod build locally
npm run icons         # regenerate PWA icons from inline SVG (scripts/generate-icons.mjs)
npm run lint          # eslint .

# Run a single test file:
npx vitest run src/calc/prefermentSplit.test.ts
# Run tests matching a name:
npx vitest run -t "biga"
```

Always run `npm run typecheck` and `npm test` before committing — TS is strict (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, etc.) and bugs surface there first.

## Coding style — non-negotiable

This codebase is written in functional Effect-TS style:

- **Never use `null` or `undefined`.** Model absence with `Option`. Model failure with `Either` (sync) or `Effect` (async / with services). At Schema boundaries use `Schema.OptionFromNullishOr(...)` so encoded/decoded JSON uses `null` while domain code uses `Option`.
- **Errors are tagged classes** (`Data.TaggedError`), never thrown strings. See `src/domain/Errors.ts`, `src/persistence/RepoError.ts`, `src/backup/Backup.ts` for the pattern.
- **All repositories are Effect services**: `Context.Tag` + `Layer.effect` for the live impl, `Layer.sync` for in-memory test impl. The runtime is wired in `src/runtime/Runtime.ts` via `ManagedRuntime`.
- **Branded types** in `src/domain/Brands.ts` (`PositiveNumber`, `Percentage`, `Rating`, `RecipeId`, `Tag`, ...). Use them in Schemas instead of raw `number`/`string`.
- **Pure calc functions in `src/calc/`** — no side effects, no Effect. They return `Either<A, DomainError>` when fallible, plain `A` when total. Heavily tested (see existing patterns).
- **Pipe composition** (`pipe(x, fn1, fn2)`) over method chains where idiomatic.
- **UI ↔ Effect bridge**: `src/ui/hooks.ts` exposes `useEffectQuery` and `useEffectAction` that run effects through the app runtime and produce React-friendly state.

## Architecture overview

```
src/
  domain/           Schemas + branded types — the source of truth. Everything else
                    decodes/encodes through these. Recipe.ts and Template.ts are
                    the two root aggregates. Preferment.ts holds the constant
                    PREFERMENT_HYDRATION (biga 45%, poolish 100%).
  calc/             Pure functions. bakerPercent (template → grams), yeastConvert
                    (fresh ↔ active-dry ↔ instant-dry), prefermentSplit (the
                    KEY feature: splits a recipe into preferment + refresh).
                    Each has a colocated *.test.ts.
  persistence/      IndexedDB repos via `idb`, exposed as Effect Context.Tag
                    services. Recipe and Template have parallel structures
                    (Live + InMemory layers). Schema.encode/decode at every
                    boundary. db.ts opens the DB with versioned migrations.
  backup/           JSON export/import. Backup.ts defines a versioned schema
                    (version: 1). download.ts has the browser File↔text helpers
                    as Effects. Pure / testable; UI lives in pages/BackupPage.tsx.
  runtime/          ManagedRuntime that merges the Live layers. Exports
                    runPromise / runPromiseExit typed to AppServices.
  ui/               Mobile-first primitives (Button, Card, FormField, TextInput,
                    NumberInput, Select, PageHeader) + Nav (bottom tab bar) +
                    hooks. All inputs are `block w-full min-w-0` so they shrink
                    inside flex rows without overflowing.
  pages/            One file per route. The KEY screen is GeneratePage.tsx
                    (template + flours → preferment split).
  docs/methods.md   Markdown rendered by react-markdown + remark-gfm + remark-math
                    + rehype-katex on /docs. Versioned in code.
  router.tsx        TanStack Router config. Root layout handles iOS safe-areas
                    (top inset + landscape left/right). DocsPage is lazy-loaded
                    to keep KaTeX out of the initial bundle.
  styles/index.css  Tailwind + `.prose-pizza` doc styles + a force-hide for
                    `.katex-mathml` (the screen-reader fallback would otherwise
                    visually duplicate the rendered formulas).
```

### Preferment math (the heart of the app)

User enters:
- `flourPct` (0–100) — % of total flour going into the preferment
- `yeastPctOfTotalYeast` (0–100) — % of the recipe's **total yeast** going into the preferment

The function `splitWithPreferment` (in `src/calc/prefermentSplit.ts`) computes:
```
prefermentFlour = totalFlour × flourPct/100
prefermentWater = prefermentFlour × PREFERMENT_HYDRATION[type] / 100  (biga: 45, poolish: 100)
prefermentYeast = totalYeast    × yeastPctOfTotalYeast / 100
refreshX        = totalX - prefermentX  for X in {flour, water, yeast}
```
**Salt, sugar, oil, extras always go entirely into the refresh, never the preferment.**

A pure helper `equivalentYeastPctOnPrefermentFlour` derives the equivalent `prefermentYeast / prefermentFlour × 100` for display (so the user can cross-reference Lehmann/biancolievito tables that use that convention). It's shown live on GeneratePage under the input, and on RecipeDetailPage for saved recipes.

The only failure mode is `PrefermentExceedsRecipe.water` (poolish needs more water than the recipe has). Yeast cannot exceed by construction (input is bounded 0–100 of total yeast).

## What NOT to do

- **Don't use `null`/`undefined`** anywhere. Use `Option`. (See coding style above.)
- **Don't throw.** Return `Either`/`Effect` with tagged errors.
- **Don't add presets, fermentation-time tables, or recommended values for yeast %.** The user explicitly rejected these — they prefer to enter their own value and use the in-app live equivalent to sanity-check.
- **Don't expand the "Documentation" page intro** (no "what is baker's %", no "what is preferment") and **don't add a "Sources/Bibliography" section** — both were explicitly removed.
- **Don't add a sourdough yeast type or sourdough preferment** in v1. Not in scope.
- **Don't make biga or poolish hydration configurable** — biga is always 45%, poolish always 100%. Hardcoded constants in `src/domain/Preferment.ts`.
- **Don't add "N pâtons de M grammes" mode.** User declined; only total flour input.
- **Don't introduce a backend, auth, or cloud sync.** Local IndexedDB only. Backup/restore via JSON is the v1 portability story.
- **Don't ship without tests for new calc/repo modules.** The pattern is colocated `*.test.ts` next to the module. Use the InMemory repo layers for Effect-driven tests.
- **Don't write multi-paragraph code comments or docstrings.** One short line max, only when the *why* is non-obvious.

## Git workflow (lessons learned)

- The repo uses `main`, not `master`.
- **Never push follow-up commits to a branch that's already been merged.** After a PR merges, switch back to `main`, `git pull`, then `git checkout -b feature/<new>` for the next change.
- The user merges PRs themselves on GitHub. Don't force-push, don't merge yourself.
- Don't use `git pull --rebase -X ours` when the remote was auto-created with a default README — the rebase semantics flip "ours/theirs" and you'll lose your version. Use `git pull origin main --allow-unrelated-histories -X theirs` (or `--no-rebase -X ours`) instead, or use `git merge -X ours` after fetching.
- Commit messages: imperative subject, optional bullet body explaining why. The repo trailer is `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main`: typecheck → tests → build → upload-pages-artifact → deploy-pages. Pages must be configured with **Source: GitHub Actions** in repo settings (not "Deploy from branch"). The `VITE_BASE` env var defaults to `/za-recipe/` in `vite.config.ts`; override only if the repo is renamed.

PWA icons (`public/icons/*.png` and `public/apple-touch-icon.png`) are generated by `scripts/generate-icons.mjs` from inline SVG sources and committed. Re-run `npm run icons` if the icon design changes.

## Tests overview

Current count: **32 tests across 5 files** (as of last commit on main). Pattern:
- `src/calc/*.test.ts` — pure function tests with Vitest, no Effect runtime
- `src/persistence/RecipeRepository.test.ts` — uses `RecipeRepositoryInMemory` via `Effect.provide`
- `src/backup/Backup.test.ts` — round-trip through Schema with both InMemory repos

When adding tests for new Effect-using code: build a `Layer.mergeAll(...)` of InMemory layers, then `Effect.runPromiseExit(program.pipe(Effect.provide(Repos)))`.

## Memory

A persistent memory directory at `~/.claude/projects/-home-hakbaal-pizza-calculation-preferment/memory/` tracks project state across sessions. Keep `MEMORY.md` in sync with the actual repo state — especially after merges and feature additions. Don't store project structure or git history there (use `git log` / read the code).
