import { Schema } from "effect"
import { Iso8601, PositivePercentage, TemplateId } from "./Brands.ts"
import { TemplateYeast } from "./Yeast.ts"

export const TemplateExtra = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(60)),
  pct: PositivePercentage,
})
export type TemplateExtra = Schema.Schema.Type<typeof TemplateExtra>

export const Template = Schema.Struct({
  id: TemplateId,
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(80)),
  hydrationPct: PositivePercentage,
  yeast: TemplateYeast,
  saltPct: Schema.OptionFromNullishOr(PositivePercentage, null),
  sugarPct: Schema.OptionFromNullishOr(PositivePercentage, null),
  oliveOilPct: Schema.OptionFromNullishOr(PositivePercentage, null),
  extras: Schema.Array(TemplateExtra),
  createdAt: Iso8601,
  updatedAt: Iso8601,
})
export type Template = Schema.Schema.Type<typeof Template>

// Records saved before the yeast union existed carried flat `yeastType` +
// `yeastPct`. Rewrite them to a Manual yeast before decoding. Pure, idempotent.
export const normalizeLegacyTemplate = (raw: unknown): unknown => {
  if (typeof raw !== "object" || raw === null) return raw
  const r = raw as Record<string, unknown>
  if ("yeast" in r || !("yeastType" in r) || !("yeastPct" in r)) return raw
  const { yeastType, yeastPct, ...rest } = r
  return { ...rest, yeast: { _tag: "Manual", type: yeastType, pct: yeastPct } }
}
