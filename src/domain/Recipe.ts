import { Schema } from "effect"
import { Iso8601, PositiveNumber, Rating, RecipeId, Tag } from "./Brands.ts"
import { FlourComponent, NamedIngredient } from "./Ingredient.ts"
import { PrefermentSpec } from "./Preferment.ts"
import { YeastAmount } from "./Yeast.ts"

export const Recipe = Schema.Struct({
  id: RecipeId,
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(80)),
  flours: Schema.NonEmptyArray(FlourComponent),
  water: PositiveNumber,
  yeast: YeastAmount,
  salt: Schema.OptionFromNullishOr(PositiveNumber, null),
  sugar: Schema.OptionFromNullishOr(PositiveNumber, null),
  oliveOil: Schema.OptionFromNullishOr(PositiveNumber, null),
  extras: Schema.Array(NamedIngredient),
  preferment: Schema.OptionFromNullishOr(PrefermentSpec, null),
  tags: Schema.Array(Tag),
  favorite: Schema.Boolean,
  rating: Schema.OptionFromNullishOr(Rating, null),
  notes: Schema.OptionFromNullishOr(Schema.String, null),
  createdAt: Iso8601,
  updatedAt: Iso8601,
})
export type Recipe = Schema.Schema.Type<typeof Recipe>

export const totalFlour = (flours: ReadonlyArray<FlourComponent>): number =>
  flours.reduce((sum, f) => sum + f.grams, 0)
