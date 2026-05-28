import { Link } from "@tanstack/react-router"
import { Effect, Option } from "effect"
import { useMemo, useState } from "react"
import { RecipeRepository } from "../persistence/RecipeRepository.ts"
import { Button, Card, PageHeader, TextInput } from "../ui/primitives.tsx"
import { useEffectQuery } from "../ui/hooks.ts"

export const LibraryPage = (): JSX.Element => {
  const { state } = useEffectQuery(
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
              <Link to="/library/$id" params={{ id: r.id }}>
                <Card className="active:bg-dough-100">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {r.favorite ? <span>⭐</span> : null}
                        <h2 className="font-semibold text-stone-800 truncate">{r.name}</h2>
                      </div>
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
                    </div>
                    <div className="text-right">
                      {Option.match(r.rating, {
                        onNone: () => <span className="text-xs text-stone-400">—</span>,
                        onSome: (v) => (
                          <span className="font-bold text-tomato-700">
                            {(v as number).toFixed(1)}
                          </span>
                        ),
                      })}
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
