import { useNavigate } from "@tanstack/react-router"
import { Effect, Exit, Option } from "effect"
import { useState } from "react"
import type { Iso8601, PositiveNumber, RecipeId, Tag } from "../domain/Brands.ts"
import type { FlourComponent, NamedIngredient } from "../domain/Ingredient.ts"
import type { Recipe } from "../domain/Recipe.ts"
import {
  allYeastTypes,
  YeastTypeLabel,
  type YeastAmount,
  type YeastType,
} from "../domain/Yeast.ts"
import { convertYeast } from "../calc/yeastConvert.ts"
import { makeRecipeId, nowIso } from "../persistence/Id.ts"
import { RecipeRepository } from "../persistence/RecipeRepository.ts"
import { runPromiseExit } from "../runtime/Runtime.ts"
import {
  Button,
  Card,
  FormField,
  NumberInput,
  PageHeader,
  Select,
  TextInput,
} from "../ui/primitives.tsx"

type FlourRow = { name: string; grams: number | "" }
type ExtraRow = { name: string; grams: number | "" }

type State = {
  name: string
  flours: ReadonlyArray<FlourRow>
  water: number | ""
  yeastType: YeastType
  yeastGrams: number | ""
  salt: number | ""
  sugar: number | ""
  oliveOil: number | ""
  extras: ReadonlyArray<ExtraRow>
  notes: string
  tags: string
  favorite: boolean
}

const initial: State = {
  name: "",
  flours: [{ name: "Farine principale", grams: 500 }],
  water: 325,
  yeastType: "fresh",
  yeastGrams: 1.5,
  salt: 12.5,
  sugar: "",
  oliveOil: "",
  extras: [],
  notes: "",
  tags: "",
  favorite: false,
}

const pos = (n: number | ""): Option.Option<PositiveNumber> =>
  n === "" || n <= 0 ? Option.none() : Option.some(n as PositiveNumber)

export const DirectEntryPage = (): JSX.Element => {
  const navigate = useNavigate()
  const [s, setS] = useState<State>(initial)
  const [err, setErr] = useState("")
  const [saving, setSaving] = useState(false)

  const onYeastTypeChange = (to: YeastType): void => {
    if (s.yeastGrams === "" || s.yeastGrams <= 0) {
      setS({ ...s, yeastType: to })
      return
    }
    const converted: YeastAmount = convertYeast(
      { type: s.yeastType, grams: s.yeastGrams as YeastAmount["grams"] },
      to,
    )
    setS({ ...s, yeastType: to, yeastGrams: converted.grams })
  }

  const onSave = async (): Promise<void> => {
    setErr("")
    if (s.name.trim() === "") return setErr("Le nom est requis")
    const cleanFlours = s.flours.filter((f) => f.name.trim() !== "" && f.grams !== "" && f.grams > 0)
    if (cleanFlours.length === 0) return setErr("Au moins une farine est requise")
    if (s.water === "" || s.water <= 0) return setErr("L'eau est requise")
    if (s.yeastGrams === "" || s.yeastGrams <= 0) return setErr("La levure est requise")

    setSaving(true)
    const exit = await runPromiseExit(
      Effect.gen(function* () {
        const repo = yield* RecipeRepository
        const id = (yield* makeRecipeId) as RecipeId
        const now = (yield* nowIso) as Iso8601
        const recipe: Recipe = {
          id,
          name: s.name.trim(),
          flours: cleanFlours.map(
            (f): FlourComponent => ({
              name: f.name.trim(),
              grams: f.grams as PositiveNumber,
            }),
          ) as unknown as Recipe["flours"],
          water: s.water as PositiveNumber,
          yeast: {
            type: s.yeastType,
            grams: s.yeastGrams as YeastAmount["grams"],
          },
          salt: pos(s.salt),
          sugar: pos(s.sugar),
          oliveOil: pos(s.oliveOil),
          extras: s.extras
            .filter((e) => e.name.trim() !== "" && e.grams !== "" && e.grams > 0)
            .map(
              (e): NamedIngredient => ({
                name: e.name.trim(),
                grams: e.grams as PositiveNumber,
              }),
            ),
          preferment: Option.none(),
          tags: s.tags
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t !== "") as unknown as ReadonlyArray<Tag>,
          favorite: s.favorite,
          rating: Option.none(),
          notes: s.notes.trim() === "" ? Option.none() : Option.some(s.notes.trim()),
          createdAt: now,
          updatedAt: now,
        }
        yield* repo.save(recipe)
      }),
    )
    setSaving(false)
    if (Exit.isSuccess(exit)) navigate({ to: "/library" })
    else setErr("Échec d'enregistrement")
  }

  return (
    <>
      <PageHeader title="Saisie directe" subtitle="Recette en grammes" />

      <Card className="flex flex-col gap-4">
        <FormField label="Nom">
          <TextInput
            value={s.name}
            onChange={(e) => setS({ ...s, name: e.target.value })}
            placeholder="Ma recette du dimanche"
          />
        </FormField>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-stone-700 text-sm">Farines (g)</span>
            <Button
              variant="secondary"
              onClick={() => setS({ ...s, flours: [...s.flours, { name: "", grams: "" }] })}
            >
              + Ajouter
            </Button>
          </div>
          <ul className="flex flex-col gap-2">
            {s.flours.map((f, i) => (
              <li key={i} className="flex gap-2 items-center">
                <TextInput
                  value={f.name}
                  onChange={(e) => {
                    const next = [...s.flours]
                    next[i] = { ...next[i]!, name: e.target.value }
                    setS({ ...s, flours: next })
                  }}
                  placeholder="Type de farine"
                />
                <NumberInput
                  value={f.grams}
                  onChange={(v) => {
                    const next = [...s.flours]
                    next[i] = { ...next[i]!, grams: v }
                    setS({ ...s, flours: next })
                  }}
                  step={1}
                  min={0}
                  placeholder="g"
                />
                {s.flours.length > 1 ? (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setS({ ...s, flours: s.flours.filter((_, idx) => idx !== i) })
                    }
                  >
                    ✕
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <FormField label="Eau (g)">
          <NumberInput
            value={s.water}
            onChange={(v) => setS({ ...s, water: v })}
            step={1}
            min={0}
          />
        </FormField>

        <FormField label="Type de levure" hint="Changer le type convertit la quantité">
          <Select
            value={s.yeastType}
            onChange={onYeastTypeChange}
            options={allYeastTypes.map((t) => ({ value: t, label: YeastTypeLabel[t] }))}
          />
        </FormField>

        <FormField label="Levure (g)">
          <NumberInput
            value={s.yeastGrams}
            onChange={(v) => setS({ ...s, yeastGrams: v })}
            step={0.01}
            min={0}
          />
        </FormField>

        <FormField label="Sel (g) — optionnel">
          <NumberInput value={s.salt} onChange={(v) => setS({ ...s, salt: v })} step={0.1} min={0} />
        </FormField>

        <FormField label="Sucre (g) — optionnel">
          <NumberInput value={s.sugar} onChange={(v) => setS({ ...s, sugar: v })} step={0.1} min={0} />
        </FormField>

        <FormField label="Huile d'olive (g) — optionnel">
          <NumberInput
            value={s.oliveOil}
            onChange={(v) => setS({ ...s, oliveOil: v })}
            step={0.1}
            min={0}
          />
        </FormField>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-stone-700 text-sm">Ingrédients perso (g)</span>
            <Button
              variant="secondary"
              onClick={() => setS({ ...s, extras: [...s.extras, { name: "", grams: "" }] })}
            >
              + Ajouter
            </Button>
          </div>
          {s.extras.map((e, i) => (
            <div key={i} className="flex gap-2 items-center mb-2">
              <TextInput
                value={e.name}
                onChange={(ev) => {
                  const next = [...s.extras]
                  next[i] = { ...next[i]!, name: ev.target.value }
                  setS({ ...s, extras: next })
                }}
                placeholder="Nom"
              />
              <NumberInput
                value={e.grams}
                onChange={(v) => {
                  const next = [...s.extras]
                  next[i] = { ...next[i]!, grams: v }
                  setS({ ...s, extras: next })
                }}
                step={0.1}
                min={0}
                placeholder="g"
              />
              <Button
                variant="ghost"
                onClick={() =>
                  setS({ ...s, extras: s.extras.filter((_, idx) => idx !== i) })
                }
              >
                ✕
              </Button>
            </div>
          ))}
        </div>

        <FormField label="Tags" hint="Séparés par virgule (ex: napoletana, four à bois)">
          <TextInput
            value={s.tags}
            onChange={(e) => setS({ ...s, tags: e.target.value })}
          />
        </FormField>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={s.favorite}
            onChange={(e) => setS({ ...s, favorite: e.target.checked })}
            className="w-5 h-5"
          />
          <span>Favori ⭐</span>
        </label>

        <FormField label="Notes">
          <textarea
            value={s.notes}
            onChange={(e) => setS({ ...s, notes: e.target.value })}
            rows={3}
            className="block w-full min-w-0 rounded-lg border border-dough-300 bg-white px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-tomato-500/40 focus:border-tomato-500"
          />
        </FormField>

        {err !== "" ? (
          <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{err}</p>
        ) : null}

        <Button onClick={onSave} disabled={saving}>
          {saving ? "…" : "Enregistrer dans la bibliothèque"}
        </Button>
      </Card>
    </>
  )
}
