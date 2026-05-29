import { Schema } from "effect"
import { Celsius, PositiveNumber } from "./Brands.ts"

export const FermentationPhase = Schema.Struct({
  temperatureC: Celsius,
  hours: PositiveNumber,
})
export type FermentationPhase = Schema.Schema.Type<typeof FermentationPhase>

// At least one phase (a protocol always has a final ferment).
export const FermentationProtocol = Schema.NonEmptyArray(FermentationPhase)
export type FermentationProtocol = Schema.Schema.Type<typeof FermentationProtocol>

export const celsiusToF = (c: number): number => (c * 9) / 5 + 32
export const fahrenheitToC = (f: number): number => ((f - 32) * 5) / 9
