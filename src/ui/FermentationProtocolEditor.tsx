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
import { convertYeast } from "../calc/yeastConvert.ts"
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

const validPhases = (draft: YeastDraft): ReadonlyArray<FermentationPhase> =>
  draft.phases
    .filter((p) => p.temperatureC !== "" && p.hours !== "" && p.hours > 0)
    .map((p) => ({
      temperatureC: (p.temperatureC as number) as Celsius,
      hours: (p.hours as number) as PositiveNumber,
    }))

export const previewDerive = (draft: YeastDraft): Either.Either<DerivedYeast, unknown> | null => {
  const phases = validPhases(draft)
  if (phases.length === 0) return null
  return deriveYeastDefault(draft.type, phases)
}

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

// Validates that a protocol draft converges (derives a yeast), returning the
// branded phases on success or a friendly message on failure.
const validateProtocol = (draft: YeastDraft): Either.Either<FermentationProtocol, string> => {
  const phases = validPhases(draft)
  if (phases.length === 0) return Either.left("Au moins une phase de fermentation est requise")
  return deriveYeastDefault(draft.type, phases).pipe(
    Either.match({
      onLeft: (e) => Either.left(fermentationErrorMessage(e)),
      onRight: () => Either.right(phases as unknown as FermentationProtocol),
    }),
  )
}

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
    // Manual grams convert on type change (parity with the old direct-entry UX).
    if (draft.mode === "manual" && manualKind === "grams" && draft.manual !== "" && draft.manual > 0) {
      const converted = convertYeast(
        { type: draft.type, grams: draft.manual as PositiveNumber },
        type,
      )
      onChange({ ...draft, type, manual: converted.grams as number })
      return
    }
    onChange({ ...draft, type })
  }

  const setPhase = (i: number, patch: Partial<ProtocolPhaseDraft>): void => {
    const next = draft.phases.map((p, idx) => (idx === i ? { ...p, ...patch } : p))
    onChange({ ...draft, phases: next })
  }

  const preview = draft.mode === "protocol" ? previewDerive(draft) : null

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
            step={manualKind === "pct" ? 0.01 : 0.01}
            min={0}
          />
        </FormField>
      ) : (
        <div className="flex flex-col gap-2">
          <span className="font-medium text-stone-700 text-sm">
            Phases de fermentation
          </span>

          <div className="flex gap-2 text-xs text-stone-500 px-1">
            <span className="flex-1">Température (°C)</span>
            <span className="flex-1">Durée (h)</span>
            {draft.phases.length > 1 ? <span className="w-11" /> : null}
          </div>

          <ul className="flex flex-col gap-2">
            {draft.phases.map((p, i) => (
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
                {draft.phases.length > 1 ? (
                  <Button
                    variant="ghost"
                    onClick={() => onChange({ ...draft, phases: draft.phases.filter((_, idx) => idx !== i) })}
                  >
                    ✕
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>

          <Button
            variant="secondary"
            onClick={() => onChange({ ...draft, phases: [...draft.phases, { temperatureC: "", hours: "" }] })}
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
                  {preview.right.phaseFractions.map((f, i) => `P${i + 1} ${Math.round(f * 100)}%`).join(" · ")}
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
      )}
    </div>
  )
}
