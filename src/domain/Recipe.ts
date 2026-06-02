import { Schema } from "effect"
import { Iso8601, PositiveNumber, Rating, RecipeId, Tag, TemplateId } from "./Brands.ts"
import { FlourComponent, NamedIngredient } from "./Ingredient.ts"
import { PrefermentSpec } from "./Preferment.ts"
import { RecipeYeast } from "./Yeast.ts"

// The template a generated recipe came from. Name is snapshotted so the link
// still reads correctly if the template is later renamed or deleted.
export const SourceTemplate = Schema.Struct({
  id: TemplateId,
  name: Schema.String,
})
export type SourceTemplate = Schema.Schema.Type<typeof SourceTemplate>

export const Recipe = Schema.Struct({
  id: RecipeId,
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(80)),
  flours: Schema.NonEmptyArray(FlourComponent),
  water: PositiveNumber,
  yeast: RecipeYeast,
  salt: Schema.OptionFromNullishOr(PositiveNumber, null),
  sugar: Schema.OptionFromNullishOr(PositiveNumber, null),
  oliveOil: Schema.OptionFromNullishOr(PositiveNumber, null),
  extras: Schema.Array(NamedIngredient),
  preferment: Schema.OptionFromNullishOr(PrefermentSpec, null),
  sourceTemplate: Schema.optionalWith(SourceTemplate, { as: "Option", nullable: true }),
  tags: Schema.Array(Tag),
  favorite: Schema.Boolean,
  tried: Schema.optionalWith(Schema.Boolean, { default: () => false, nullable: true }),
  rating: Schema.OptionFromNullishOr(Rating, null),
  notes: Schema.OptionFromNullishOr(Schema.String, null),
  createdAt: Iso8601,
  updatedAt: Iso8601,
})
export type Recipe = Schema.Schema.Type<typeof Recipe>

// Records saved before the yeast union existed carried a bare YeastAmount
// ({type, grams}) in `yeast`. Wrap it as a Manual yeast. Pure, idempotent.
export const normalizeLegacyRecipe = (raw: unknown): unknown => {
  if (typeof raw !== "object" || raw === null) return raw
  const r = raw as Record<string, unknown>
  const y = r["yeast"]
  if (typeof y === "object" && y !== null && !("_tag" in y)) {
    return { ...r, yeast: { _tag: "Manual", amount: y } }
  }
  return raw
}

export const totalFlour = (flours: ReadonlyArray<FlourComponent>): number =>
  flours.reduce((sum, f) => sum + f.grams, 0)
