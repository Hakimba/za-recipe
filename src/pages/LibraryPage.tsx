import { Link } from "@tanstack/react-router"
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

export const LibraryPage = (): JSX.Element => {
  const { state, refetch } = useEffectQuery(
    () => Effect.flatMap(RecipeRepository, (r) => r.list),
    [],
  )

  const [search, setSearch] = useState("")
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [selectedTags, setSelectedTags] = useState<ReadonlyArray<string>>([])
  const [minRating, setMinRating] = useState<number | "">("")

  const recipes = state.status === "ready" ? state.data : []

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const r of recipes) for (const t of r.tags) set.add(t)
    return Array.from(set).sort()
  }, [recipes])

  const filtered = useMemo(() => {
    return recipes
      .filter((r) =>
        search === "" ? true : r.name.toLowerCase().includes(search.toLowerCase()),
      )
      .filter((r) => (favoritesOnly ? r.favorite : true))
      .filter((r) =>
        selectedTags.length === 0
          ? true
          : selectedTags.every((t) => r.tags.includes(t as (typeof r.tags)[number])),
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
  }, [recipes, search, favoritesOnly, selectedTags, minRating])

  const onToggleFavorite = async (id: RecipeId): Promise<void> => {
    const exit = await runPromiseExit(toggleFavoriteEffect(id))
    if (Exit.isSuccess(exit)) refetch()
  }

  return (
    <>
      <PageHeader title="Bibliothèque" subtitle={`${recipes.length} recette(s)`} />

      <Card className="flex flex-col gap-3">
        <TextInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom…"
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
                  <Card className="active:bg-dough-100 pr-12">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-stone-800 truncate">{r.name}</h2>
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
