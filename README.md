# Za recipe

PWA compagnon pour le calcul automatique de preferment (biga, poolish), de la quantité de levure selon un protocole et la gestion de recettes de pizza.

## Fonctionnalités

- **Saisie directe** d'une recette en grammes (multi-farines, levure auto-convertie quand on change de type)
- **Templates** de baker's percentages réutilisables
- **Génération** d'une recette à partir d'un template + un poids de farine (composite possible)
- **Section Preferment** sur la page de génération :
  - Biga (hydratation fixe 45%)
  - Poolish (hydratation fixe 100%)
  - Output découpé en « Préferment » et « Rafraîchis »
- **Protocole de fermentation** (modèle TXCraig1) — sur un template ou une recette directe sans preferment, la levure peut être saisie manuellement **ou** dérivée automatiquement d'une suite de phases (température + temps), avec aperçu live et part de fermentation par phase
- **Bibliothèque** avec favoris ⭐, notes 0.0–10.0 (1 décimale), tags, filtres
- **Documentation** intégrée — toutes les formules de calcul avec exemples chiffrés + table de fermentation téléchargeable
- **Backup** JSON export/import (rétro-compatible avec les anciennes recettes)

## Stack

- Vite + React 18 + TypeScript strict
- **Effect-TS** (`effect`, `effect/Schema`) — code 100% fonctionnel, jamais de `null`, erreurs via `Either`/`Effect`
- TanStack Router
- Tailwind CSS — mobile-first
- IndexedDB (via `idb`) — stockage 100% local et offline
- `vite-plugin-pwa` — service worker, manifest, install iOS
- `react-markdown` + `remark-math` + `rehype-katex` — documentation rendue avec formules math
- Vitest — 47 tests (calculs purs, solveur de fermentation, round-trip de schema, décodage legacy)

## Scripts

```bash
npm install
npm run dev          # dev server
npm run typecheck    # tsc --noEmit
npm test             # vitest run
npm run icons        # régénère les icônes PWA depuis le SVG source
npm run fermentation-table  # régénère src/domain/FermentationTable.ts depuis le CSV
npm run build        # build prod
npm run preview      # preview prod local
```

## Structure du code

```
src/
  domain/          # Schemas et types (Effect Schema, branded types, no null)
  calc/            # Fonctions pures : bakerPercent, yeastConvert, prefermentSplit + tests
  persistence/     # Repositories IndexedDB (Context.Tag services + Layers Live/InMemory)
  runtime/         # ManagedRuntime qui fournit les services
  ui/              # Primitives (Button, Input, Card, FormField) + hooks Effect
  pages/           # Écrans (Home, Direct, Templates, Generate, Library, RecipeDetail, Docs)
  docs/            # Markdown des méthodes de calcul (rendu par react-markdown + KaTeX)
  router.tsx       # Routes TanStack
```
- [x] Phase 8 — Polish, icônes PWA, déploiement GitHub Pages
