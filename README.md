# Pizza Preferment (za-recipe)

PWA compagnon pour le calcul automatique de preferment (biga, poolish) et la gestion de recettes de pizza. Installable sur iPhone via Safari → « Sur l'écran d'accueil ».

## Fonctionnalités

- **Saisie directe** d'une recette en grammes (multi-farines, levure auto-convertie quand on change de type)
- **Templates** de baker's percentages réutilisables
- **Génération** d'une recette à partir d'un template + un poids de farine (composite possible)
- **Section Preferment** sur la page de génération :
  - Biga (hydratation fixe 45%)
  - Poolish (hydratation fixe 100%)
  - Output découpé en « Préferment » et « Rafraîchis »
- **Bibliothèque** avec favoris ⭐, notes 0.0–10.0 (1 décimale), tags, filtres
- **Documentation** intégrée — toutes les formules de calcul avec exemples chiffrés

## Stack

- Vite + React 18 + TypeScript strict
- **Effect-TS** (`effect`, `effect/Schema`) — code 100% fonctionnel, jamais de `null`, erreurs via `Either`/`Effect`
- TanStack Router
- Tailwind CSS — mobile-first
- IndexedDB (via `idb`) — stockage 100% local et offline
- `vite-plugin-pwa` — service worker, manifest, install iOS
- `react-markdown` + `remark-math` + `rehype-katex` — documentation rendue avec formules math
- Vitest — 23 tests sur les calculs purs et le round-trip de schema

## Scripts

```bash
npm install
npm run dev          # dev server
npm run typecheck    # tsc --noEmit
npm test             # vitest run
npm run icons        # régénère les icônes PWA depuis le SVG source
npm run build        # build prod
npm run preview      # preview prod local
```

## Installer sur iPhone

1. Push sur `main` → GitHub Pages déploie automatiquement à `https://hakimba.github.io/za-recipe/`
2. Ouvre cette URL dans **Safari** (pas Chrome — l'install PWA n'est supportée que par Safari sur iOS)
3. Bouton **Partager** (carré avec flèche vers le haut) → **« Sur l'écran d'accueil »**
4. L'icône apparaît, l'app se lance en plein écran sans barre Safari

L'app fonctionne 100% offline une fois installée. Les recettes et templates sont stockés dans IndexedDB sur l'iPhone (rester sous le quota Safari ≈ 50 MB qui est très loin d'être atteint).

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

## Phases livrées

- [x] Phase 0 — Scaffold Vite + React + TS + Effect + Tailwind + PWA
- [x] Phase 1 — Domain + calculs purs (21 tests)
- [x] Phase 2 — Repositories IndexedDB (Effect services, encode/decode via Schema)
- [x] Phase 3 — Saisie directe + Templates CRUD
- [x] Phase 4 — Génération depuis template
- [x] Phase 5 — **Section Preferment** (biga 45%, poolish 100%) avec validation
- [x] Phase 6 — Bibliothèque + tags + favoris + note 0.0–10.0 + filtres
- [x] Phase 7 — Page Documentation (markdown + KaTeX, lazy-loaded)
- [x] Phase 8 — Polish, icônes PWA, déploiement GitHub Pages
