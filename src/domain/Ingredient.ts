import { Schema } from "effect"
import { PositiveNumber } from "./Brands.ts"

export const FlourComponent = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(60)),
  grams: PositiveNumber,
})
export type FlourComponent = Schema.Schema.Type<typeof FlourComponent>

export const NamedIngredient = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(60)),
  grams: PositiveNumber,
})
export type NamedIngredient = Schema.Schema.Type<typeof NamedIngredient>
