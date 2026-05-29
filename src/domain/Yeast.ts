import { Schema } from "effect"
import { PositiveNumber, PositivePercentage } from "./Brands.ts"
import { FermentationProtocol } from "./Fermentation.ts"

export const YeastType = Schema.Literal("fresh", "active-dry", "instant-dry")
export type YeastType = Schema.Schema.Type<typeof YeastType>

export const YeastAmount = Schema.Struct({
  type: YeastType,
  grams: PositiveNumber,
})
export type YeastAmount = Schema.Schema.Type<typeof YeastAmount>

export const YeastTypeLabel: Record<YeastType, string> = {
  fresh: "Levure fraîche",
  "active-dry": "Levure sèche active",
  "instant-dry": "Levure sèche instantanée",
}

export const allYeastTypes: ReadonlyArray<YeastType> = ["fresh", "active-dry", "instant-dry"]

export const FRESH_TO_TYPE_FACTOR: Record<YeastType, number> = {
  fresh: 1.0,
  "active-dry": 0.4,
  "instant-dry": 0.33,
}

// How yeast is specified in a Template: either a manual baker's % or derived
// from a fermentation protocol (the % is computed, never stored).
export const TemplateYeast = Schema.Union(
  Schema.TaggedStruct("Manual", { type: YeastType, pct: PositivePercentage }),
  Schema.TaggedStruct("Protocol", { type: YeastType, phases: FermentationProtocol }),
)
export type TemplateYeast = Schema.Schema.Type<typeof TemplateYeast>

// How yeast is specified in a concrete Recipe: either a manual gram amount or
// derived from a fermentation protocol (grams computed from total flour).
export const RecipeYeast = Schema.Union(
  Schema.TaggedStruct("Manual", { amount: YeastAmount }),
  Schema.TaggedStruct("Protocol", { type: YeastType, phases: FermentationProtocol }),
)
export type RecipeYeast = Schema.Schema.Type<typeof RecipeYeast>

export const templateYeastType = (y: TemplateYeast): YeastType => y.type
export const recipeYeastType = (y: RecipeYeast): YeastType =>
  y._tag === "Manual" ? y.amount.type : y.type
