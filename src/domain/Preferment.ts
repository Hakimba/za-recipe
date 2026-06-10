import { Schema } from "effect"
import { Percentage } from "./Brands.ts"
import { FermentationProtocol } from "./Fermentation.ts"
import { YeastType } from "./Yeast.ts"

export const PrefermentType = Schema.Literal("biga", "poolish")
export type PrefermentType = Schema.Schema.Type<typeof PrefermentType>

export const PrefermentTypeLabel: Record<PrefermentType, string> = {
  biga: "Biga",
  poolish: "Poolish",
}

export const PREFERMENT_HYDRATION: Record<PrefermentType, number> = {
  biga: 45,
  poolish: 100,
}

// How the preferment's yeast is specified: either a manual share of the
// recipe's total yeast (the original behaviour), or derived from the
// preferment's own fermentation protocol via the TXCraig table — applied to
// the preferment flour, since the preferment is its own saltless mini-dough.
export const PrefermentYeast = Schema.Union(
  Schema.TaggedStruct("Manual", { yeastPctOfTotalYeast: Percentage }),
  Schema.TaggedStruct("Protocol", { type: YeastType, phases: FermentationProtocol }),
)
export type PrefermentYeast = Schema.Schema.Type<typeof PrefermentYeast>

export const PrefermentSpec = Schema.Struct({
  type: PrefermentType,
  flourPct: Percentage,
  yeast: PrefermentYeast,
})
export type PrefermentSpec = Schema.Schema.Type<typeof PrefermentSpec>
