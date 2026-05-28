import { Schema } from "effect"
import { Percentage, PositivePercentage } from "./Brands.ts"

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

export const PrefermentSpec = Schema.Struct({
  type: PrefermentType,
  flourPct: Percentage,
  yeastInPrefermentPct: PositivePercentage,
})
export type PrefermentSpec = Schema.Schema.Type<typeof PrefermentSpec>
