import { Schema } from "effect"

export const PositiveNumber = Schema.Number.pipe(
  Schema.positive({ message: () => "Doit être strictement positif" }),
  Schema.brand("PositiveNumber"),
)
export type PositiveNumber = Schema.Schema.Type<typeof PositiveNumber>

export const NonNegativeNumber = Schema.Number.pipe(
  Schema.nonNegative({ message: () => "Doit être positif ou nul" }),
  Schema.brand("NonNegativeNumber"),
)
export type NonNegativeNumber = Schema.Schema.Type<typeof NonNegativeNumber>

export const Percentage = Schema.Number.pipe(
  Schema.between(0, 100, { message: () => "Doit être entre 0 et 100" }),
  Schema.brand("Percentage"),
)
export type Percentage = Schema.Schema.Type<typeof Percentage>

export const PositivePercentage = Schema.Number.pipe(
  Schema.greaterThan(0, { message: () => "Doit être strictement positif" }),
  Schema.lessThanOrEqualTo(1000, { message: () => "Doit être inférieur ou égal à 1000" }),
  Schema.brand("PositivePercentage"),
)
export type PositivePercentage = Schema.Schema.Type<typeof PositivePercentage>

// Plausible dough temperature. The fermentation table's exact range
// (35–80 °F ≈ 1.7–26.7 °C) is enforced by the solver, which reports a friendly
// "hors table" error; this brand is kept generous so encoding never rejects a
// value the solver already accepted.
export const Celsius = Schema.Number.pipe(
  Schema.between(0, 40, { message: () => "Température invalide" }),
  Schema.brand("Celsius"),
)
export type Celsius = Schema.Schema.Type<typeof Celsius>

const RATING_STEP = 0.1
const isMultipleOfStep = (value: number): boolean => {
  const scaled = Math.round(value * 10)
  return Math.abs(scaled / 10 - value) < 1e-9
}

export const Rating = Schema.Number.pipe(
  Schema.between(0, 10, { message: () => "La note doit être entre 0.0 et 10.0" }),
  Schema.filter(isMultipleOfStep, {
    message: () => "La note doit avoir au plus 1 chiffre après la virgule",
  }),
  Schema.brand("Rating"),
)
export type Rating = Schema.Schema.Type<typeof Rating>

export const ratingStep = (): number => RATING_STEP

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const RecipeId = Schema.String.pipe(
  Schema.pattern(UUID_REGEX, { message: () => "RecipeId doit être un UUID" }),
  Schema.brand("RecipeId"),
)
export type RecipeId = Schema.Schema.Type<typeof RecipeId>

export const TemplateId = Schema.String.pipe(
  Schema.pattern(UUID_REGEX, { message: () => "TemplateId doit être un UUID" }),
  Schema.brand("TemplateId"),
)
export type TemplateId = Schema.Schema.Type<typeof TemplateId>

export const Tag = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(40),
  Schema.brand("Tag"),
)
export type Tag = Schema.Schema.Type<typeof Tag>

export const Iso8601 = Schema.String.pipe(Schema.brand("Iso8601"))
export type Iso8601 = Schema.Schema.Type<typeof Iso8601>
