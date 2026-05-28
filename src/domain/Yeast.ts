import { Schema } from "effect"
import { PositiveNumber } from "./Brands.ts"

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
