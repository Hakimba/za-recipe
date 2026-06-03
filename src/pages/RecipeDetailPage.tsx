import { Link, useNavigate, useParams } from "@tanstack/react-router"
import { Effect, Either, Exit, Option } from "effect"
import { useEffect, useState } from "react"
import type { PositiveNumber, Rating, RecipeId, Tag } from "../domain/Brands.ts"
import {
  equivalentYeastPctOnPrefermentFlour,
  splitWithPreferment,
} from "../calc/prefermentSplit.ts"
import { deriveYeastDefault } from "../calc/fermentation.ts"
import { resolveRecipeYeast } from "../calc/resolveYeast.ts"
import { templateFromRecipe } from "../calc/templateFromRecipe.ts"
import type { Recipe, SourceTemplate } from "../domain/Recipe.ts"
import { totalFlour } from "../domain/Recipe.ts"
import { PrefermentTypeLabel } from "../domain/Preferment.ts"
import { makeTemplateId, nowIso } from "../persistence/Id.ts"
import { RecipeRepository } from "../persistence/RecipeRepository.ts"
import { TemplateRepository } from "../persistence/TemplateRepository.ts"
import { runPromiseExit } from "../runtime/Runtime.ts"
import { Button, Card, FormField, PageHeader, Select, TextInput } from "../ui/primitives.tsx"
import { useEffectQuery } from "../ui/hooks.ts"

export const RecipeDetailPage = (): JSX.Element => {
  const { id } = useParams({ from: "/library/$id" })
  const navigate = useNavigate()
  const { state, refetch } = useEffectQuery(
    () => Effect.flatMap(RecipeRepository, (r) => r.get(id as RecipeId)),
    [id],
  )
  const { state: templatesState } = useEffectQuery(
    () => Effect.flatMap(TemplateRepository, (tr) => tr.list),
    [],
  )
  const templates = templatesState.status === "ready" ? templatesState.data : []

  const [rating, setRating] = useState<number | "">("")
  const [notes, setNotes] = useState("")
  const [tagInput, setTagInput] = useState("")
  const [favorite, setFavorite] = useState(false)
  const [tried, setTried] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadedFor, setLoadedFor] = useState<string>("")

  useEffect(() => {
    if (state.status === "ready" && Option.isSome(state.data) && loadedFor !== state.data.value.id) {
      const r = state.data.value
      setRating(Option.getOrElse(r.rating, () => "" as const) as number | "")
      setNotes(Option.getOrElse(r.notes, () => ""))
      setTagInput(r.tags.join(", "))
      setFavorite(r.favorite)
      setTried(r.tried)
      setLoadedFor(r.id)
    }
  }, [state, loadedFor])

  if (state.status === "loading") return <p className="text-stone-500">Chargement…</p>
  if (state.status === "error" || Option.isNone(state.data)) {
    return <p className="text-red-700">Recette introuvable.</p>
  }
  const r = state.data.value

  const onSave = async (): Promise<void> => {
    setSaving(true)
    const exit = await runPromiseExit(
      Effect.gen(function* () {
        const repo = yield* RecipeRepository
        const now = (yield* nowIso) as Recipe["updatedAt"]
        const updated: Recipe = {
          ...r,
          favorite,
          tried,
          rating: rating === "" ? Option.none() : Option.some(rating as Rating),
          notes: notes.trim() === "" ? Option.none() : Option.some(notes.trim()),
          tags: tagInput
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t !== "") as unknown as ReadonlyArray<Tag>,
          updatedAt: now,
        }
        yield* repo.save(updated)
      }),
    )
    setSaving(false)
    if (Exit.isSuccess(exit)) refetch()
  }

  const onDelete = async (): Promise<void> => {
    setSaving(true)
    const exit = await runPromiseExit(
      Effect.flatMap(RecipeRepository, (repo) => repo.delete(r.id)),
    )
    setSaving(false)
    if (Exit.isSuccess(exit)) navigate({ to: "/library" })
  }

  // Associate / change / clear the source template a posteriori. Empty = clear.
  // Reads the persisted record so unsaved evaluation edits aren't clobbered.
  const onAssociateTemplate = async (templateId: string): Promise<void> => {
    setSaving(true)
    const exit = await runPromiseExit(
      Effect.gen(function* () {
        const repo = yield* RecipeRepository
        const maybe = yield* repo.get(r.id)
        if (Option.isNone(maybe)) return
        const now = (yield* nowIso) as Recipe["updatedAt"]
        const sourceTemplate: Option.Option<SourceTemplate> = Option.fromNullable(
          templateId === "" ? undefined : templates.find((t) => t.id === templateId),
        ).pipe(Option.map((t) => ({ id: t.id, name: t.name })))
        yield* repo.save({ ...maybe.value, sourceTemplate, updatedAt: now })
      }),
    )
    setSaving(false)
    if (Exit.isSuccess(exit)) refetch()
  }

  // Reverse of generation: turn this gram recipe into a reusable baker's-%
  // template, then jump to the new template's editor to rename/tweak.
  const onCreateTemplate = async (): Promise<void> => {
    const draft = templateFromRecipe(r)
    if (Either.isLeft(draft)) return
    setSaving(true)
    const exit = await runPromiseExit(
      Effect.gen(function* () {
        const repo = yield* TemplateRepository
        const id = yield* makeTemplateId
        const now = (yield* nowIso) as Recipe["createdAt"]
        yield* repo.save({ ...draft.right, id, createdAt: now, updatedAt: now })
        return id
      }),
    )
    setSaving(false)
    if (Exit.isSuccess(exit)) navigate({ to: "/templates/$id", params: { id: exit.value } })
  }

  const tf = totalFlour(r.flours)

  const resolvedYeast = resolveRecipeYeast(r.yeast, tf)
  const yeastAmount = Either.getOrElse(resolvedYeast, () => ({
    type: r.yeast._tag === "Manual" ? r.yeast.amount.type : r.yeast.type,
    grams: 0 as PositiveNumber,
  }))

  const splitDisplay = Option.match(r.preferment, {
    onNone: () => null,
    onSome: (spec) =>
      splitWithPreferment(
        {
          totalFlour: tf,
          totalWater: r.water,
          totalYeast: yeastAmount,
          salt: r.salt,
          sugar: r.sugar,
          oliveOil: r.oliveOil,
          extras: r.extras.map((e) => ({ name: e.name, grams: e.grams as number })),
        },
        spec,
      ),
  })

  return (
    <>
      <PageHeader title={r.name} subtitle={`${tf} g de farine totale`} back />

      <Card className="mb-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">Template</h3>
          {Option.match(r.sourceTemplate, {
            onNone: () => <span className="text-xs text-stone-500">Aucun template associé</span>,
            onSome: (t) => (
              <Link
                to="/templates/$id"
                params={{ id: t.id }}
                className="text-sm font-medium text-tomato-700 hover:underline truncate"
              >
                {t.name} →
              </Link>
            ),
          })}
        </div>
        {templates.length > 0 ? (
          <Select
            value={Option.match(r.sourceTemplate, {
              onNone: () => "",
              onSome: (t) => t.id as string,
            })}
            onChange={(v) => void onAssociateTemplate(v)}
            options={[
              { value: "", label: "— Aucun —" },
              ...templates.map((t) => ({ value: t.id as string, label: t.name })),
            ]}
          />
        ) : (
          <p className="text-xs text-stone-500">
            Crée un template pour pouvoir l'associer à cette recette.
          </p>
        )}
        <Button variant="secondary" onClick={() => void onCreateTemplate()} disabled={saving}>
          Créer un template à partir de cette recette
        </Button>
      </Card>

      <Card className="flex flex-col">
        <h3 className="font-semibold mb-2">Ingrédients</h3>
        {r.flours.map((f, i) => (
          <Row key={i} label={f.name} value={`${f.grams} g`} />
        ))}
        <Row label="Eau" value={`${r.water} g`} />
        <Row label={`Levure (${labelYeast(yeastAmount.type)})`} value={`${yeastAmount.grams} g`} />
        {Option.match(r.salt, {
          onNone: () => null,
          onSome: (v) => <Row label="Sel" value={`${v} g`} />,
        })}
        {Option.match(r.sugar, {
          onNone: () => null,
          onSome: (v) => <Row label="Sucre" value={`${v} g`} />,
        })}
        {Option.match(r.oliveOil, {
          onNone: () => null,
          onSome: (v) => <Row label="Huile d'olive" value={`${v} g`} />,
        })}
        {r.extras.map((e, i) => (
          <Row key={`x-${i}`} label={e.name} value={`${e.grams} g`} />
        ))}
      </Card>

      {r.yeast._tag === "Protocol" ? (
        <Card className="mt-3">
          <h3 className="font-semibold mb-2">Protocole de fermentation</h3>
          <ul className="text-sm">
            {r.yeast.phases.map((p, i) => (
              <Row
                key={i}
                label={`Phase ${i + 1}`}
                value={`${p.hours} h à ${p.temperatureC} °C`}
              />
            ))}
          </ul>
          {Either.match(deriveYeastDefault((r.yeast as { type: typeof yeastAmount.type }).type, r.yeast.phases), {
            onLeft: () => null,
            onRight: (d) => (
              <p className="text-xs text-stone-600 mt-2">
                Levure dérivée : {d.pct.toFixed(3)} % · part par phase :{" "}
                {d.phaseFractions.map((f, i) => `P${i + 1} ${Math.round(f * 100)}%`).join(" · ")}
              </p>
            ),
          })}
        </Card>
      ) : null}

      {splitDisplay !== null && splitDisplay._tag === "Right" ? (
        <Card className="mt-3">
          <h3 className="font-semibold mb-2">
            {Option.match(r.preferment, {
              onNone: () => "Preferment",
              onSome: (s) =>
                `${PrefermentTypeLabel[s.type]} (${s.flourPct}% farine · ${s.yeastPctOfTotalYeast}% levure)`,
            })}
          </h3>
          {Option.match(r.preferment, {
            onNone: () => null,
            onSome: (s) => {
              const eq = equivalentYeastPctOnPrefermentFlour({
                totalFlour: tf,
                totalYeast: yeastAmount.grams,
                flourPct: s.flourPct,
                yeastPctOfTotalYeast: s.yeastPctOfTotalYeast,
              })
              return Option.match(eq, {
                onNone: () => null,
                onSome: (v) => (
                  <p className="text-xs text-stone-500 mb-2">
                    ≈ {v.toFixed(3)}% de la farine du préferment
                  </p>
                ),
              })
            },
          })}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <h4 className="font-medium text-tomato-700 text-sm mb-1">Preferment</h4>
              <Row label="Farine" value={`${splitDisplay.right.preferment.flour} g`} />
              <Row label="Eau" value={`${splitDisplay.right.preferment.water} g`} />
              <Row label="Levure" value={`${splitDisplay.right.preferment.yeast.grams} g`} />
            </div>
            <div>
              <h4 className="font-medium text-basil-500 text-sm mb-1">Rafraîchis</h4>
              <Row label="Farine" value={`${splitDisplay.right.refresh.flour} g`} />
              <Row label="Eau" value={`${splitDisplay.right.refresh.water} g`} />
              <Row label="Levure" value={`${splitDisplay.right.refresh.yeast.grams} g`} />
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="mt-3 flex flex-col gap-3">
        <h3 className="font-semibold">Évaluation</h3>
        <FormField label={`Note ${rating === "" ? "" : `: ${(rating as number).toFixed(1)} / 10`}`}>
          <input
            type="range"
            min={0}
            max={10}
            step={0.1}
            value={rating === "" ? 0 : rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="w-full"
          />
          {rating !== "" ? (
            <Button variant="ghost" onClick={() => setRating("")}>
              Effacer la note
            </Button>
          ) : null}
        </FormField>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={tried}
            onChange={(e) => setTried(e.target.checked)}
            className="w-5 h-5"
          />
          <span>Je l'ai essayée 🍕</span>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={favorite}
            onChange={(e) => setFavorite(e.target.checked)}
            className="w-5 h-5"
          />
          <span>Favori ⭐</span>
        </label>

        <FormField label="Tags" hint="Séparés par virgule">
          <TextInput value={tagInput} onChange={(e) => setTagInput(e.target.value)} />
        </FormField>

        <FormField label="Notes de dégustation">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="block w-full min-w-0 rounded-lg border border-dough-300 bg-white px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-tomato-500/40 focus:border-tomato-500"
          />
        </FormField>

        <div className="flex gap-2">
          <Button onClick={onSave} disabled={saving} className="flex-1">
            {saving ? "…" : "Mettre à jour"}
          </Button>
          <Button variant="danger" onClick={onDelete} disabled={saving}>
            Supprimer
          </Button>
        </div>
      </Card>
    </>
  )
}

const Row = ({ label, value }: { label: string; value: string }): JSX.Element => (
  <div className="flex justify-between text-sm py-1 border-b border-dough-100 last:border-b-0">
    <span className="text-stone-600">{label}</span>
    <span className="font-medium text-stone-900">{value}</span>
  </div>
)

const labelYeast = (t: "fresh" | "active-dry" | "instant-dry"): string =>
  t === "fresh" ? "fraîche" : t === "active-dry" ? "sèche active" : "sèche instantanée"
