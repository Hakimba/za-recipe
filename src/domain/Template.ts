import { Schema } from "effect"
import { Iso8601, PositivePercentage, TemplateId } from "./Brands.ts"
import { YeastType } from "./Yeast.ts"

export const TemplateExtra = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(60)),
  pct: PositivePercentage,
})
export type TemplateExtra = Schema.Schema.Type<typeof TemplateExtra>

export const Template = Schema.Struct({
  id: TemplateId,
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(80)),
  hydrationPct: PositivePercentage,
  yeastType: YeastType,
  yeastPct: PositivePercentage,
  saltPct: Schema.OptionFromNullishOr(PositivePercentage, null),
  sugarPct: Schema.OptionFromNullishOr(PositivePercentage, null),
  oliveOilPct: Schema.OptionFromNullishOr(PositivePercentage, null),
  extras: Schema.Array(TemplateExtra),
  createdAt: Iso8601,
  updatedAt: Iso8601,
})
export type Template = Schema.Schema.Type<typeof Template>
