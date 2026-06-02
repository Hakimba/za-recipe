import { Link, useNavigate } from "@tanstack/react-router"
import { Effect, Exit, Option } from "effect"
import { useMemo, useState } from "react"
import type { RecipeId } from "../domain/Brands.ts"
import type { Recipe } from "../domain/Recipe.ts"
import { nowIso } from "../persistence/Id.ts"
import { RecipeRepository } from "../persistence/RecipeRepository.ts"
import { runPromiseExit } from "../runtime/Runtime.ts"
import { Button, Card, PageHeader, TextInput } from "../ui/primitives.tsx"
import { useEffectQuery } from "../ui/hooks.ts"

const toggleFavoriteEffect = (id: RecipeId) =>
  Effect.gen(function* () {
    const repo = yield* RecipeRepository
    const maybe = yield* repo.get(id)
    if (Option.isNone(maybe)) return
    const now = (yield* nowIso) as Recipe["updatedAt"]
    yield* repo.save({ ...maybe.value, favorite: !maybe.value.favorite, updatedAt: now })
  })

const setTriedEffect = (id: RecipeId, tried: boolean) =>
  Effect.gen(function* () {
    const repo = yield* RecipeRepository
    const maybe = yield* repo.get(id)
    if (Option.isNone(maybe)) return
    const now = (yield* nowIso) as Recipe["updatedAt"]
    yield* repo.save({ ...maybe.value, tried, updatedAt: now })
  })

type TriedFilter = "all" | "tried" | "untried"

export const LibraryPage = (): JSX.Element => {
  const navigate = useNavigate()
  const { state, refetch } = useEffectQuery(
    () => Effect.flatMap(RecipeRepository, (r) => r.list),
    [],
  )

  const [search, setSearch] = useState("")
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [triedFilter, setTriedFilter] = useState<TriedFilter>("all")
  const [selectedTags, setSelectedTags] = useState<ReadonlyArray<string>>([])
  const [selectedTemplates, setSelectedTemplates] = useState<ReadonlyArray<string>>([])
  const [minRating, setMinRating] = useState<number | "">("")

  const recipes = state.status === "ready" ? state.data : []

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const r of recipes) for (const t of r.tags) set.add(t)
    return Array.from(set).sort()
  }, [recipes])

  // Distinct source templates across the library (id → name), for filtering.
  const allTemplates = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of recipes) {
      if (Option.isSome(r.sourceTemplate)) {
        map.set(r.sourceTemplate.value.id, r.sourceTemplate.value.name)
      }
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name < b.name ? -1 : 1,
    )
  }, [recipes])

  const filtered = useMemo(() => {
    return recipes
      .filter((r) => {
        if (search === "") return true
        const q = search.toLowerCase()
        if (r.name.toLowerCase().includes(q)) return true
        return Option.match(r.sourceTemplate, {
          onNone: () => false,
          onSome: (t) => t.name.toLowerCase().includes(q),
        })
      })
      .filter((r) => (favoritesOnly ? r.favorite : true))
      .filter((r) =>
        triedFilter === "all" ? true : triedFilter === "tried" ? r.tried : !r.tried,
      )
      .filter((r) =>
        selectedTags.length === 0
          ? true
          : selectedTags.every((t) => r.tags.includes(t as (typeof r.tags)[number])),
      )
      .filter((r) =>
        selectedTemplates.length === 0
          ? true
          : Option.match(r.sourceTemplate, {
              onNone: () => false,
              onSome: (t) => selectedTemplates.includes(t.id),
            }),
      )
      .filter((r) =>
        minRating === ""
          ? true
          : Option.match(r.rating, {
              onNone: () => false,
              onSome: (v) => (v as number) >= minRating,
            }),
      )
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  }, [recipes, search, favoritesOnly, triedFilter, selectedTags, selectedTemplates, minRating])

  const onToggleFavorite = async (id: RecipeId): Promise<void> => {
    const exit = await runPromiseExit(toggleFavoriteEffect(id))
    if (Exit.isSuccess(exit)) refetch()
  }

  // Marking "tried" sends you to the recipe to rate it / write notes;
  // un-marking just updates the flag.
  const onToggleTried = async (id: RecipeId, current: boolean): Promise<void> => {
    const exit = await runPromiseExit(setTriedEffect(id, !current))
    if (Exit.isSuccess(exit)) {
      if (!current) navigate({ to: "/library/$id", params: { id } })
      else refetch()
    }
  }

  return (
    <>
      <PageHeader title="Bibliothèque" subtitle={`${recipes.length} recette(s)`} />

      <Card className="flex flex-col gap-3">
        <TextInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou template…"
        />
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              favoritesOnly
                ? "bg-tomato-500 text-white border-tomato-500"
                : "bg-white text-stone-700 border-dough-300"
            }`}
          >
            ⭐ Favoris
          </button>
          <button
            onClick={() =>
              setTriedFilter(
                triedFilter === "all" ? "tried" : triedFilter === "tried" ? "untried" : "all",
              )
            }
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              triedFilter !== "all"
                ? "bg-basil-500 text-white border-basil-500"
                : "bg-white text-stone-700 border-dough-300"
            }`}
          >
            🍕 {triedFilter === "tried" ? "Essayées" : triedFilter === "untried" ? "Non essayées" : "Essayées ?"}
          </button>
          <label className="flex items-center gap-1 text-xs text-stone-700">
            Note ≥
            <input
              type="number"
              value={minRating}
              onChange={(e) =>
                setMinRating(e.target.value === "" ? "" : Number(e.target.value))
              }
              step={0.1}
              min={0}
              max={10}
              className="w-16 rounded-lg border border-dough-300 px-2 py-1 text-sm"
            />
          </label>
        </div>
        {allTags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((t) => {
              const active = selectedTags.includes(t)
              return (
                <button
                  key={t}
                  onClick={() =>
                    setSelectedTags(
                      active
                        ? selectedTags.filter((x) => x !== t)
                        : [...selectedTags, t],
                    )
                  }
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                    active
                      ? "bg-basil-500 text-white border-basil-500"
                      : "bg-white text-stone-700 border-dough-300"
                  }`}
                >
                  {t}
                </button>
              )
            })}
          </div>
        ) : null}
        {allTemplates.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {allTemplates.map((tpl) => {
              const active = selectedTemplates.includes(tpl.id)
              return (
                <button
                  key={tpl.id}
                  onClick={() =>
                    setSelectedTemplates(
                      active
                        ? selectedTemplates.filter((x) => x !== tpl.id)
                        : [...selectedTemplates, tpl.id],
                    )
                  }
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                    active
                      ? "bg-tomato-500 text-white border-tomato-500"
                      : "bg-white text-stone-700 border-dough-300"
                  }`}
                >
                  📐 {tpl.name}
                </button>
              )
            })}
          </div>
        ) : null}
      </Card>

      <div className="mt-3 flex justify-end gap-2">
        <Link to="/direct">
          <Button variant="secondary">+ Saisie directe</Button>
        </Link>
        <Link to="/generate">
          <Button>+ Générer</Button>
        </Link>
      </div>

      {state.status === "loading" ? (
        <p className="text-stone-500 mt-4">Chargement…</p>
      ) : filtered.length === 0 ? (
        <Card className="mt-4">
          <p className="text-stone-600 text-sm">
            {recipes.length === 0
              ? "Aucune recette enregistrée. Démarre par générer ou saisir une recette."
              : "Aucune recette ne correspond aux filtres."}
          </p>
        </Card>
      ) : (
        <ul className="mt-4 grid gap-2">
          {filtered.map((r) => (
            <li key={r.id}>
              <div className="relative">
                <Link to="/library/$id" params={{ id: r.id }} className="block">
                  <Card className="active:bg-dough-100 pr-24">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {r.tried ? <span title="Essayée">🍕</span> : null}
                        <h2 className="font-semibold text-stone-800 truncate">{r.name}</h2>
                      </div>
                      {Option.match(r.sourceTemplate, {
                        onNone: () => null,
                        onSome: (t) => (
                          <p className="text-xs text-stone-500 mt-0.5 truncate">
                            📐 {t.name}
                          </p>
                        ),
                      })}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-dough-100 text-stone-700"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                      {Option.match(r.rating, {
                        onNone: () => null,
                        onSome: (v) => (
                          <p className="mt-1 text-sm font-bold text-tomato-700">
                            {(v as number).toFixed(1)} / 10
                          </p>
                        ),
                      })}
                    </div>
                  </Card>
                </Link>
                <TriedButton
                  active={r.tried}
                  onClick={(): void => {
                    void onToggleTried(r.id, r.tried)
                  }}
                />
                <StarButton
                  active={r.favorite}
                  onClick={(): void => {
                    void onToggleFavorite(r.id)
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

const StarButton = ({
  active,
  onClick,
}: {
  active: boolean
  onClick: () => void
}): JSX.Element => (
  <button
    type="button"
    aria-label={active ? "Retirer des favoris" : "Ajouter aux favoris"}
    aria-pressed={active}
    onClick={(e) => {
      e.preventDefault()
      e.stopPropagation()
      onClick()
    }}
    className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full text-xl bg-white/80 border border-dough-300 active:scale-95"
  >
    <span className={active ? "" : "grayscale opacity-40"}>{active ? "⭐" : "☆"}</span>
  </button>
)

const TriedButton = ({
  active,
  onClick,
}: {
  active: boolean
  onClick: () => void
}): JSX.Element => (
  <button
    type="button"
    aria-label={active ? "Marquer comme non essayée" : "Je l'ai essayée"}
    aria-pressed={active}
    onClick={(e) => {
      e.preventDefault()
      e.stopPropagation()
      onClick()
    }}
    className="absolute top-3 right-14 w-9 h-9 flex items-center justify-center rounded-full text-lg bg-white/80 border border-dough-300 active:scale-95"
  >
    <span className={active ? "" : "grayscale opacity-40"}>🍕</span>
  </button>
)
