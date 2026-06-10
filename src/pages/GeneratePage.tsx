import { useNavigate } from "@tanstack/react-router"
import { Either, Effect, Exit, Option } from "effect"
import { useMemo, useState } from "react"
import type {
  Iso8601,
  Percentage,
  PositiveNumber,
  RecipeId,
  Tag,
  TemplateId,
} from "../domain/Brands.ts"
import type { FlourComponent, NamedIngredient } from "../domain/Ingredient.ts"
import {
  PrefermentTypeLabel,
  PREFERMENT_HYDRATION,
  type PrefermentSpec,
  type PrefermentType,
  type PrefermentYeast,
} from "../domain/Preferment.ts"
import type { Recipe } from "../domain/Recipe.ts"
import type { Template } from "../domain/Template.ts"
import { allYeastTypes, YeastTypeLabel, type YeastType } from "../domain/Yeast.ts"
import { generateFromTemplate, type GeneratedRecipe } from "../calc/bakerPercent.ts"
import {
  equivalentYeastPctOnPrefermentFlour,
  splitWithPreferment,
  type PrefermentSplit,
} from "../calc/prefermentSplit.ts"
import {
  FermentationPhasesEditor,
  phasesToProtocol,
  type ProtocolPhaseDraft,
} from "../ui/FermentationProtocolEditor.tsx"
import { makeRecipeId, nowIso } from "../persistence/Id.ts"
import { RecipeRepository } from "../persistence/RecipeRepository.ts"
import { TemplateRepository } from "../persistence/TemplateRepository.ts"
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
import { useEffectQuery } from "../ui/hooks.ts"

type FlourRow = { name: string; grams: number | "" }

export const GeneratePage = (): JSX.Element => {
  const navigate = useNavigate()
  const { state: templatesState } = useEffectQuery(
    () => Effect.flatMap(TemplateRepository, (r) => r.list),
    [],
  )

  const [selectedId, setSelectedId] = useState<TemplateId | "">("")
  const [flours, setFlours] = useState<ReadonlyArray<FlourRow>>([
    { name: "Caputo 00", grams: 500 },
  ])
  const [prefermentOn, setPrefermentOn] = useState(false)
  const [prefermentType, setPrefermentType] = useState<PrefermentType>("biga")
  const [flourPct, setFlourPct] = useState<number | "">(50)
  const [yeastPct, setYeastPct] = useState<number | "">(50)
  // The preferment's yeast: a manual share of total yeast, or derived from the
  // preferment's own fermentation schedule (TXCraig on the preferment flour).
  const [prefermentYeastMode, setPrefermentYeastMode] = useState<"manual" | "protocol">("manual")
  const [prefermentYeastType, setPrefermentYeastType] = useState<YeastType>("fresh")
  const [prefermentPhases, setPrefermentPhases] = useState<ReadonlyArray<ProtocolPhaseDraft>>([
    { temperatureC: 20, hours: 12 },
  ])

  const templates = templatesState.status === "ready" ? templatesState.data : []
  const selected: Template | undefined = templates.find((t) => t.id === selectedId)

  const totalFlour = flours.reduce(
    (sum, f) => sum + (f.grams === "" ? 0 : f.grams),
    0,
  )

  // Build the preferment-yeast union from the current inputs. undefined = inputs
  // incomplete; Left = the preferment protocol doesn't converge (message shown).
  const buildPrefermentYeast = (): Either.Either<PrefermentYeast, string> | undefined => {
    if (prefermentYeastMode === "manual") {
      if (yeastPct === "" || yeastPct < 0 || yeastPct > 100) return undefined
      return Either.right({ _tag: "Manual", yeastPctOfTotalYeast: yeastPct as Percentage })
    }
    return phasesToProtocol(prefermentYeastType, prefermentPhases).pipe(
      Either.map((phases) => ({ _tag: "Protocol", type: prefermentYeastType, phases })),
    )
  }

  const generated: Either.Either<GeneratedRecipe, unknown> | undefined =
    selected !== undefined && totalFlour > 0
      ? generateFromTemplate(
          selected,
          flours
            .filter((f) => f.name.trim() !== "" && f.grams !== "" && f.grams > 0)
            .map(
              (f): FlourComponent => ({
                name: f.name.trim(),
                grams: f.grams as PositiveNumber,
              }),
            ),
        )
      : undefined

  const generatedRecipe: GeneratedRecipe | undefined =
    generated !== undefined && Either.isRight(generated) ? generated.right : undefined

  const split: Either.Either<PrefermentSplit, unknown> | undefined = useMemo(() => {
    if (
      generatedRecipe === undefined ||
      !prefermentOn ||
      flourPct === "" ||
      flourPct < 0 ||
      flourPct > 100
    ) {
      return undefined
    }
    let yeast: PrefermentYeast
    if (prefermentYeastMode === "manual") {
      if (yeastPct === "" || yeastPct < 0 || yeastPct > 100) return undefined
      yeast = { _tag: "Manual", yeastPctOfTotalYeast: yeastPct as Percentage }
    } else {
      const proto = phasesToProtocol(prefermentYeastType, prefermentPhases)
      if (Either.isLeft(proto)) return undefined
      yeast = { _tag: "Protocol", type: prefermentYeastType, phases: proto.right }
    }
    const spec: PrefermentSpec = {
      type: prefermentType,
      flourPct: flourPct as Percentage,
      yeast,
    }
    return splitWithPreferment(
      {
        totalFlour: generatedRecipe.totalFlour,
        totalWater: generatedRecipe.water,
        totalYeast: generatedRecipe.yeast,
        salt: generatedRecipe.salt,
        sugar: generatedRecipe.sugar,
        oliveOil: generatedRecipe.oliveOil,
        extras: generatedRecipe.extras,
      },
      spec,
    )
  }, [
    generatedRecipe,
    prefermentOn,
    prefermentType,
    flourPct,
    yeastPct,
    prefermentYeastMode,
    prefermentYeastType,
    prefermentPhases,
  ])

  const [saveName, setSaveName] = useState("")
  const [saveTags, setSaveTags] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState("")

  const onSave = async (): Promise<void> => {
    if (selected === undefined || generatedRecipe === undefined) return
    if (saveName.trim() === "") return setSaveErr("Le nom est requis")
    const prefermentYeast = prefermentOn ? buildPrefermentYeast() : undefined
    if (prefermentOn) {
      if (flourPct === "" || flourPct < 0 || flourPct > 100) {
        return setSaveErr("Le % de farine du préferment est invalide")
      }
      if (prefermentYeast === undefined) {
        return setSaveErr("Renseigne la levure du préferment")
      }
      if (Either.isLeft(prefermentYeast)) return setSaveErr(prefermentYeast.left)
    }
    if (prefermentOn && split !== undefined && Either.isLeft(split)) {
      return setSaveErr("Le preferment dépasse la recette — ajuste avant d'enregistrer")
    }
    setSaving(true)
    setSaveErr("")
    const exit = await runPromiseExit(
      Effect.gen(function* () {
        const repo = yield* RecipeRepository
        const id = (yield* makeRecipeId) as RecipeId
        const now = (yield* nowIso) as Iso8601
        const prefermentSpec: Option.Option<PrefermentSpec> =
          prefermentOn && prefermentYeast !== undefined && Either.isRight(prefermentYeast)
            ? Option.some({
                type: prefermentType,
                flourPct: flourPct as Percentage,
                yeast: prefermentYeast.right,
              })
            : Option.none()
        const recipe: Recipe = {
          id,
          name: saveName.trim(),
          flours: generatedRecipe.flours as Recipe["flours"],
          water: generatedRecipe.water as PositiveNumber,
          yeast: { _tag: "Manual", amount: generatedRecipe.yeast },
          salt: generatedRecipe.salt as Option.Option<PositiveNumber>,
          sugar: generatedRecipe.sugar as Option.Option<PositiveNumber>,
          oliveOil: generatedRecipe.oliveOil as Option.Option<PositiveNumber>,
          extras: generatedRecipe.extras.map(
            (e): NamedIngredient => ({
              name: e.name,
              grams: e.grams as PositiveNumber,
            }),
          ),
          preferment: prefermentSpec,
          sourceTemplate: Option.some({ id: selected.id, name: selected.name }),
          tags: saveTags
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t !== "") as unknown as ReadonlyArray<Tag>,
          favorite: false,
          tried: false,
          rating: Option.none(),
          notes: Option.none(),
          createdAt: now,
          updatedAt: now,
        }
        yield* repo.save(recipe)
      }),
    )
    setSaving(false)
    if (Exit.isSuccess(exit)) navigate({ to: "/library" })
    else setSaveErr("Échec d'enregistrement")
  }

  return (
    <>
      <PageHeader title="Générer une recette" subtitle="Template + farine = grammes" back />

      <Card className="flex flex-col gap-4">
        <FormField label="Template">
          {templates.length === 0 ? (
            <p className="text-sm text-stone-500">
              Aucun template. Crée-en un d'abord depuis l'onglet Templates.
            </p>
          ) : (
            <Select
              value={selectedId === "" ? "" : (selectedId as string)}
              onChange={(v) => {
                const id = v === "" ? "" : (v as TemplateId)
                setSelectedId(id)
                // Generated recipe inherits the template's tags as an editable copy.
                const t = templates.find((tpl) => tpl.id === id)
                setSaveTags(t !== undefined ? t.tags.join(", ") : "")
              }}
              options={[
                { value: "", label: "— Choisir un template —" },
                ...templates.map((t) => ({ value: t.id as string, label: t.name })),
              ]}
            />
          )}
        </FormField>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-stone-700 text-sm">
              Farines · total {totalFlour} g
            </span>
            <Button
              variant="secondary"
              onClick={() => setFlours([...flours, { name: "", grams: "" }])}
            >
              + Ajouter
            </Button>
          </div>
          <ul className="flex flex-col gap-2">
            {flours.map((f, i) => (
              <li key={i} className="flex gap-2">
                <TextInput
                  value={f.name}
                  onChange={(e) => {
                    const next = [...flours]
                    next[i] = { ...next[i]!, name: e.target.value }
                    setFlours(next)
                  }}
                  placeholder="Type"
                />
                <NumberInput
                  value={f.grams}
                  onChange={(v) => {
                    const next = [...flours]
                    next[i] = { ...next[i]!, grams: v }
                    setFlours(next)
                  }}
                  step={1}
                  min={0}
                  placeholder="g"
                />
                {flours.length > 1 ? (
                  <Button
                    variant="ghost"
                    onClick={() => setFlours(flours.filter((_, idx) => idx !== i))}
                  >
                    ✕
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <Card className="mt-3 flex flex-col gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={prefermentOn}
            onChange={(e) => setPrefermentOn(e.target.checked)}
            className="w-5 h-5"
          />
          <span className="font-medium">Utiliser un preferment</span>
        </label>

        {prefermentOn ? (
          <>
            <FormField label="Type de preferment">
              <Select
                value={prefermentType}
                onChange={(v) => setPrefermentType(v)}
                options={[
                  { value: "biga", label: `Biga (hydratation 45% fixe)` },
                  { value: "poolish", label: `Poolish (hydratation 100% fixe)` },
                ]}
              />
            </FormField>
            <FormField
              label="% de farine en preferment"
              hint={`Hydratation du ${PrefermentTypeLabel[prefermentType]} : ${PREFERMENT_HYDRATION[prefermentType]}%`}
            >
              <NumberInput value={flourPct} onChange={setFlourPct} step={1} min={0} max={100} />
            </FormField>

            <div className="flex gap-2">
              <Button
                variant={prefermentYeastMode === "manual" ? "primary" : "secondary"}
                onClick={() => setPrefermentYeastMode("manual")}
                className="flex-1"
              >
                % de la levure totale
              </Button>
              <Button
                variant={prefermentYeastMode === "protocol" ? "primary" : "secondary"}
                onClick={() => setPrefermentYeastMode("protocol")}
                className="flex-1"
              >
                Protocole auto
              </Button>
            </div>

            {prefermentYeastMode === "manual" ? (
              <>
                <FormField
                  label="% de la levure totale dans le préferment"
                  hint="0 à 100. Ex : 50 = la moitié de la levure de la recette va dans le préferment."
                >
                  <NumberInput value={yeastPct} onChange={setYeastPct} step={1} min={0} max={100} />
                </FormField>
                <EquivalentPreview
                  totalFlour={generatedRecipe?.totalFlour}
                  totalYeast={generatedRecipe?.yeast.grams}
                  flourPct={flourPct}
                  yeastPct={yeastPct}
                />
              </>
            ) : (
              <>
                <FormField label="Type de levure du préferment">
                  <Select
                    value={prefermentYeastType}
                    onChange={setPrefermentYeastType}
                    options={allYeastTypes.map((t) => ({ value: t, label: YeastTypeLabel[t] }))}
                  />
                </FormField>
                <FermentationPhasesEditor
                  phases={prefermentPhases}
                  type={prefermentYeastType}
                  onChange={setPrefermentPhases}
                  {...(generatedRecipe !== undefined && flourPct !== ""
                    ? { totalFlourGrams: generatedRecipe.totalFlour * (flourPct / 100) }
                    : {})}
                />
                <p className="text-xs text-stone-500 bg-dough-100 rounded-lg px-3 py-2">
                  Le protocole du préferment et celui de la pâte finale (template) sont deux
                  horloges distinctes : l'horaire ci-dessus dimensionne la levure du préferment
                  seul. La levure du rafraîchi = levure totale − levure du préferment. Le
                  préferment fermente sans sel — un peu plus vite que ne le prédit la table.
                </p>
              </>
            )}
          </>
        ) : null}
      </Card>

      {generated !== undefined && Either.isLeft(generated) ? (
        <Card className="mt-3 bg-red-50 border-red-200">
          <p className="text-red-800 text-sm">Erreur de calcul de la recette.</p>
        </Card>
      ) : null}

      {generatedRecipe !== undefined ? (
        <Card className="mt-3 flex flex-col gap-3">
          <h2 className="font-semibold text-stone-800">Résultat</h2>
          {prefermentOn && split !== undefined && Either.isLeft(split) ? (
            <PrefermentError error={split.left} />
          ) : prefermentOn && split !== undefined && Either.isRight(split) ? (
            <SplitView split={split.right} />
          ) : (
            <SingleView gen={generatedRecipe} />
          )}
        </Card>
      ) : null}

      {generatedRecipe !== undefined ? (
        <Card className="mt-3 flex flex-col gap-3">
          <h3 className="font-semibold text-stone-800">Enregistrer dans la bibliothèque</h3>
          <FormField label="Nom">
            <TextInput
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Napoletana de samedi"
            />
          </FormField>
          <FormField label="Tags" hint="Séparés par virgule">
            <TextInput
              value={saveTags}
              onChange={(e) => setSaveTags(e.target.value)}
              placeholder="napoletana, four à bois"
            />
          </FormField>
          {saveErr !== "" ? (
            <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{saveErr}</p>
          ) : null}
          <Button onClick={onSave} disabled={saving}>
            {saving ? "…" : "Enregistrer"}
          </Button>
        </Card>
      ) : null}
    </>
  )
}

const EquivalentPreview = ({
  totalFlour,
  totalYeast,
  flourPct,
  yeastPct,
}: {
  totalFlour: number | undefined
  totalYeast: number | undefined
  flourPct: number | ""
  yeastPct: number | ""
}): JSX.Element | null => {
  if (
    totalFlour === undefined ||
    totalYeast === undefined ||
    flourPct === "" ||
    yeastPct === "" ||
    flourPct <= 0 ||
    yeastPct < 0
  ) {
    return null
  }
  const eq = equivalentYeastPctOnPrefermentFlour({
    totalFlour,
    totalYeast,
    flourPct,
    yeastPctOfTotalYeast: yeastPct,
  })
  return Option.match(eq, {
    onNone: () => null,
    onSome: (v) => (
      <p className="text-xs text-stone-500 -mt-1">
        ≈ {v.toFixed(3)}% de la farine du préferment
      </p>
    ),
  })
}

const PrefermentError = ({ error }: { error: unknown }): JSX.Element => {
  const e = error as { _tag?: string; resource?: string; required?: number; available?: number }
  if (e._tag === "PrefermentExceedsRecipe") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
        Le preferment demande plus de {e.resource} ({e.required?.toFixed(1)} g) que la recette n'en
        contient ({e.available?.toFixed(1)} g). Baisse le % de farine ou ajuste l'hydratation.
      </div>
    )
  }
  return (
    <div className="bg-red-50 rounded-lg p-3 text-sm text-red-800">Erreur de calcul.</div>
  )
}

const Row = ({ label, value }: { label: string; value: string }): JSX.Element => (
  <div className="flex justify-between text-sm py-1 border-b border-dough-100 last:border-b-0">
    <span className="text-stone-600">{label}</span>
    <span className="font-medium text-stone-900">{value}</span>
  </div>
)

const SingleView = ({ gen }: { gen: GeneratedRecipe }): JSX.Element => (
  <div>
    {gen.flours.map((f, i) => (
      <Row key={i} label={f.name} value={`${f.grams} g`} />
    ))}
    <Row label="Eau" value={`${gen.water} g`} />
    <Row label="Levure" value={`${gen.yeast.grams} g`} />
    {Option.match(gen.salt, {
      onNone: () => null,
      onSome: (v) => <Row label="Sel" value={`${v} g`} />,
    })}
    {Option.match(gen.sugar, {
      onNone: () => null,
      onSome: (v) => <Row label="Sucre" value={`${v} g`} />,
    })}
    {Option.match(gen.oliveOil, {
      onNone: () => null,
      onSome: (v) => <Row label="Huile d'olive" value={`${v} g`} />,
    })}
    {gen.extras.map((e, i) => (
      <Row key={`x-${i}`} label={e.name} value={`${e.grams} g`} />
    ))}
  </div>
)

const SplitView = ({ split }: { split: PrefermentSplit }): JSX.Element => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <div>
      <h4 className="font-semibold text-tomato-700 text-sm mb-1">
        Preferment ({split.hydrationOfPreferment}% hydratation)
      </h4>
      <Row label="Farine" value={`${split.preferment.flour} g`} />
      <Row label="Eau" value={`${split.preferment.water} g`} />
      <Row label="Levure" value={`${split.preferment.yeast.grams} g`} />
    </div>
    <div>
      <h4 className="font-semibold text-basil-500 text-sm mb-1">Rafraîchis</h4>
      <Row label="Farine" value={`${split.refresh.flour} g`} />
      <Row label="Eau" value={`${split.refresh.water} g`} />
      <Row label="Levure" value={`${split.refresh.yeast.grams} g`} />
      {Option.match(split.refresh.salt, {
        onNone: () => null,
        onSome: (v) => <Row label="Sel" value={`${v} g`} />,
      })}
      {Option.match(split.refresh.sugar, {
        onNone: () => null,
        onSome: (v) => <Row label="Sucre" value={`${v} g`} />,
      })}
      {Option.match(split.refresh.oliveOil, {
        onNone: () => null,
        onSome: (v) => <Row label="Huile d'olive" value={`${v} g`} />,
      })}
      {split.refresh.extras.map((e, i) => (
        <Row key={i} label={e.name} value={`${e.grams} g`} />
      ))}
    </div>
  </div>
)
