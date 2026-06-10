import { Link } from "@tanstack/react-router"
import { Either } from "effect"
import type { Celsius, PositiveNumber, PositivePercentage } from "../domain/Brands.ts"
import type { FermentationPhase, FermentationProtocol } from "../domain/Fermentation.ts"
import {
  allYeastTypes,
  YeastTypeLabel,
  type RecipeYeast,
  type TemplateYeast,
  type YeastAmount,
  type YeastType,
} from "../domain/Yeast.ts"
import { convertYeast, convertYeastPct } from "../calc/yeastConvert.ts"
import {
  deriveYeastDefault,
  FERMENTATION_MAX_C,
  FERMENTATION_MIN_C,
  type DerivedYeast,
} from "../calc/fermentation.ts"
import { Button, FormField, NumberInput, Select } from "./primitives.tsx"

export type ProtocolPhaseDraft = { temperatureC: number | ""; hours: number | "" }

export type YeastDraft = {
  mode: "manual" | "protocol"
  type: YeastType
  manual: number | "" // pct (template) or grams (direct), per manualKind
  phases: ReadonlyArray<ProtocolPhaseDraft>
}

const defaultPhases: ReadonlyArray<ProtocolPhaseDraft> = [{ temperatureC: 22, hours: 4 }]

export const emptyManualDraft = (type: YeastType, manual: number | ""): YeastDraft => ({
  mode: "manual",
  type,
  manual,
  phases: defaultPhases,
})

export const templateYeastToDraft = (y: TemplateYeast): YeastDraft =>
  y._tag === "Manual"
    ? { mode: "manual", type: y.type, manual: y.pct as number, phases: defaultPhases }
    : {
        mode: "protocol",
        type: y.type,
        manual: "",
        phases: y.phases.map((p) => ({ temperatureC: p.temperatureC as number, hours: p.hours as number })),
      }

export const recipeYeastToDraft = (y: RecipeYeast): YeastDraft =>
  y._tag === "Manual"
    ? { mode: "manual", type: y.amount.type, manual: y.amount.grams as number, phases: defaultPhases }
    : {
        mode: "protocol",
        type: y.type,
        manual: "",
        phases: y.phases.map((p) => ({ temperatureC: p.temperatureC as number, hours: p.hours as number })),
      }

const validPhasesOf = (
  phases: ReadonlyArray<ProtocolPhaseDraft>,
): ReadonlyArray<FermentationPhase> =>
  phases
    .filter((p) => p.temperatureC !== "" && p.hours !== "" && p.hours > 0)
    .map((p) => ({
      temperatureC: (p.temperatureC as number) as Celsius,
      hours: (p.hours as number) as PositiveNumber,
    }))

const previewDeriveFromPhases = (
  type: YeastType,
  phases: ReadonlyArray<ProtocolPhaseDraft>,
): Either.Either<DerivedYeast, unknown> | null => {
  const valid = validPhasesOf(phases)
  if (valid.length === 0) return null
  return deriveYeastDefault(type, valid)
}

export const previewDerive = (draft: YeastDraft): Either.Either<DerivedYeast, unknown> | null =>
  previewDeriveFromPhases(draft.type, draft.phases)

const fermentationErrorMessage = (e: { _tag?: string; kind?: string }): string => {
  if (e._tag === "FermentationTempOutOfRange") {
    return `Une température est hors plage : reste entre ${FERMENTATION_MIN_C} et ${FERMENTATION_MAX_C} °C.`
  }
  if (e._tag === "FermentationUnreachable") {
    return e.kind === "overfermented"
      ? "Ce protocole sur-fermente même avec très peu de levure — raccourcis le temps ou baisse la température."
      : "Ce protocole sous-fermente même avec beaucoup de levure — allonge le temps ou monte la température."
  }
  return "Protocole non calculable."
}

// Validates that a protocol (yeast type + phase drafts) converges, returning
// the branded phases on success or a friendly message on failure. Exported so
// the preferment's own protocol can be validated the same way.
export const phasesToProtocol = (
  type: YeastType,
  phases: ReadonlyArray<ProtocolPhaseDraft>,
): Either.Either<FermentationProtocol, string> => {
  const valid = validPhasesOf(phases)
  if (valid.length === 0) return Either.left("Au moins une phase de fermentation est requise")
  return deriveYeastDefault(type, valid).pipe(
    Either.match({
      onLeft: (e) => Either.left(fermentationErrorMessage(e)),
      onRight: () => Either.right(valid as unknown as FermentationProtocol),
    }),
  )
}

const validateProtocol = (draft: YeastDraft): Either.Either<FermentationProtocol, string> =>
  phasesToProtocol(draft.type, draft.phases)

// Builders: draft → domain yeast union. Protocol convergence is validated here.
export const draftToTemplateYeast = (draft: YeastDraft): Either.Either<TemplateYeast, string> => {
  if (draft.mode === "manual") {
    if (draft.manual === "" || draft.manual <= 0) return Either.left("La levure (%) est requise")
    return Either.right({ _tag: "Manual", type: draft.type, pct: draft.manual as PositivePercentage })
  }
  return validateProtocol(draft).pipe(
    Either.map((phases) => ({ _tag: "Protocol", type: draft.type, phases })),
  )
}

export const draftToRecipeYeast = (draft: YeastDraft): Either.Either<RecipeYeast, string> => {
  if (draft.mode === "manual") {
    if (draft.manual === "" || draft.manual <= 0) return Either.left("La levure (g) est requise")
    const amount: YeastAmount = { type: draft.type, grams: draft.manual as PositiveNumber }
    return Either.right({ _tag: "Manual", amount })
  }
  return validateProtocol(draft).pipe(
    Either.map((phases) => ({ _tag: "Protocol", type: draft.type, phases })),
  )
}

const round1 = (v: number): number => Math.round(v * 10) / 10

const shortYeastLabel: Record<YeastType, string> = {
  fresh: "fraîche",
  "active-dry": "sèche active",
  "instant-dry": "sèche inst.",
}

// The manual value expressed in the other two yeast types, for cross-reference.
const YeastEquivalents = ({
  type,
  value,
  unit,
}: {
  type: YeastType
  value: number
  unit: "%" | "g"
}): JSX.Element => (
  <p className="text-xs text-stone-500 -mt-1">
    Équivalent :{" "}
    {allYeastTypes
      .filter((t) => t !== type)
      .map((t) => `${convertYeastPct(value, type, t)} ${unit} ${shortYeastLabel[t]}`)
      .join(" · ")}
  </p>
)

// The phase list + "add phase" + live derived-yeast preview, decoupled from
// the manual/protocol toggle. Reused for a template/recipe protocol and for a
// preferment's own protocol (where totalFlourGrams is the preferment flour).
export const FermentationPhasesEditor = ({
  phases,
  type,
  onChange,
  totalFlourGrams,
}: {
  phases: ReadonlyArray<ProtocolPhaseDraft>
  type: YeastType
  onChange: (phases: ReadonlyArray<ProtocolPhaseDraft>) => void
  totalFlourGrams?: number
}): JSX.Element => {
  const setPhase = (i: number, patch: Partial<ProtocolPhaseDraft>): void =>
    onChange(phases.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))

  const preview = previewDeriveFromPhases(type, phases)

  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-stone-700 text-sm">Phases de fermentation</span>

      <div className="flex gap-2 text-xs text-stone-500 px-1">
        <span className="flex-1">Température (°C)</span>
        <span className="flex-1">Durée (h)</span>
        {phases.length > 1 ? <span className="w-11" /> : null}
      </div>

      <ul className="flex flex-col gap-2">
        {phases.map((p, i) => (
          <li key={i} className="flex gap-2 items-center">
            <NumberInput
              value={p.temperatureC}
              onChange={(v) => setPhase(i, { temperatureC: v === "" ? "" : round1(v) })}
              step={1}
              placeholder="°C"
            />
            <NumberInput
              value={p.hours}
              onChange={(v) => setPhase(i, { hours: v === "" ? "" : round1(v) })}
              step={1}
              min={0}
              placeholder="h"
            />
            {phases.length > 1 ? (
              <Button
                variant="ghost"
                onClick={() => onChange(phases.filter((_, idx) => idx !== i))}
              >
                ✕
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      <Button
        variant="secondary"
        onClick={() => onChange([...phases, { temperatureC: "", hours: "" }])}
      >
        + Ajouter une phase
      </Button>

      {preview !== null ? (
        Either.isRight(preview) ? (
          <div className="rounded-lg bg-basil-500/10 border border-basil-500/30 p-3 text-sm">
            <p className="font-semibold text-stone-800">
              Levure dérivée : {preview.right.pct.toFixed(3)} %
              {totalFlourGrams !== undefined && totalFlourGrams > 0
                ? ` · ≈ ${round1(totalFlourGrams * (preview.right.pct / 100))} g`
                : ""}
            </p>
            <p className="text-xs text-stone-600 mt-1">
              Part de fermentation par phase :{" "}
              {preview.right.phaseFractions
                .map((f, i) => `P${i + 1} ${Math.round(f * 100)}%`)
                .join(" · ")}
            </p>
          </div>
        ) : (
          <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
            {fermentationErrorMessage(preview.left as { _tag?: string; kind?: string })}
          </p>
        )
      ) : null}

      <p className="text-xs text-stone-500">
        Modèle TXCraig1.{" "}
        <Link to="/docs" className="underline text-tomato-700">
          Voir la méthode
        </Link>
      </p>
    </div>
  )
}

export const FermentationProtocolEditor = ({
  draft,
  onChange,
  manualKind,
  totalFlourGrams,
}: {
  draft: YeastDraft
  onChange: (d: YeastDraft) => void
  manualKind: "pct" | "grams"
  totalFlourGrams?: number
}): JSX.Element => {
  const onTypeChange = (type: YeastType): void => {
    // Manual value (grams OR %) converts on type change so the dough keeps the
    // same effective yeast power — intuitive cross-referencing of yeast tables.
    if (draft.mode === "manual" && draft.manual !== "" && draft.manual > 0) {
      const converted =
        manualKind === "grams"
          ? (convertYeast({ type: draft.type, grams: draft.manual as PositiveNumber }, type)
              .grams as number)
          : convertYeastPct(draft.manual, draft.type, type)
      onChange({ ...draft, type, manual: converted })
      return
    }
    onChange({ ...draft, type })
  }

  return (
    <div className="flex flex-col gap-3">
      <FormField label="Type de levure">
        <Select
          value={draft.type}
          onChange={onTypeChange}
          options={allYeastTypes.map((t) => ({ value: t, label: YeastTypeLabel[t] }))}
        />
      </FormField>

      <div className="flex gap-2">
        <Button
          variant={draft.mode === "manual" ? "primary" : "secondary"}
          onClick={() => onChange({ ...draft, mode: "manual" })}
          className="flex-1"
        >
          Valeur manuelle
        </Button>
        <Button
          variant={draft.mode === "protocol" ? "primary" : "secondary"}
          onClick={() => onChange({ ...draft, mode: "protocol" })}
          className="flex-1"
        >
          Protocole auto
        </Button>
      </div>

      {draft.mode === "manual" ? (
        <FormField
          label={manualKind === "pct" ? "Levure (%)" : "Levure (g)"}
          {...(manualKind === "pct" ? { hint: "En % du poids total de farine" } : {})}
        >
          <NumberInput
            value={draft.manual}
            onChange={(v) => onChange({ ...draft, manual: v })}
            step={0.01}
            min={0}
          />
          {draft.manual !== "" && draft.manual > 0 ? (
            <YeastEquivalents
              type={draft.type}
              value={draft.manual}
              unit={manualKind === "pct" ? "%" : "g"}
            />
          ) : null}
        </FormField>
      ) : (
        <FermentationPhasesEditor
          phases={draft.phases}
          type={draft.type}
          onChange={(phases) => onChange({ ...draft, phases })}
          {...(totalFlourGrams !== undefined ? { totalFlourGrams } : {})}
        />
      )}
    </div>
  )
}
