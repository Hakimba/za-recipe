import { Either, Option } from "effect"
import { describe, expect, it } from "vitest"
import type { Celsius, PositiveNumber } from "../domain/Brands.ts"
import type { FermentationPhase } from "../domain/Fermentation.ts"
import { FERMENTATION_TABLE } from "../domain/FermentationTable.ts"
import { deriveYeast, fractionForColumn, hoursAt } from "./fermentation.ts"

const phase = (temperatureC: number, hours: number): FermentationPhase =>
  ({ temperatureC: temperatureC as Celsius, hours: hours as PositiveNumber })

// Real table values (CY) used in the worked examples:
// 72°F: 0.3% = 7h ; 40°F: 0.3% = 97h ; 0.2%: 72°F=9h, 40°F=130h
describe("hoursAt", () => {
  it("reads an exact table cell (72°F, col for CY 0.3%)", () => {
    const col = FERMENTATION_TABLE.cyPct.indexOf(0.3)
    const h = hoursAt(FERMENTATION_TABLE, 72, col)
    expect(Option.getOrNull(h)).toBe(7)
  })

  it("interpolates between two temperature rows", () => {
    const col = FERMENTATION_TABLE.cyPct.indexOf(0.3)
    // 72°F = 7h, 73°F = ? ; midpoint 72.5 should be between the two row values
    const at72 = Option.getOrThrow(hoursAt(FERMENTATION_TABLE, 72, col))
    const at73 = Option.getOrThrow(hoursAt(FERMENTATION_TABLE, 73, col))
    const mid = Option.getOrThrow(hoursAt(FERMENTATION_TABLE, 72.5, col))
    expect(mid).toBeCloseTo((at72 + at73) / 2, 6)
  })

  it("returns None for an off-chart (null) cell", () => {
    // CY 0.01% at 40°F is blank in the table
    const col = FERMENTATION_TABLE.cyPct.indexOf(0.01)
    expect(Option.isNone(hoursAt(FERMENTATION_TABLE, 40, col))).toBe(true)
  })

  it("returns None outside the temperature range", () => {
    const col = FERMENTATION_TABLE.cyPct.indexOf(0.3)
    expect(Option.isNone(hoursAt(FERMENTATION_TABLE, 100, col))).toBe(true)
  })

  it("covers the extended warm zone (merged table reaches 95 °F)", () => {
    const col = FERMENTATION_TABLE.cyPct.indexOf(0.3)
    // 90 °F is in the merged range now; a low-yeast column has data there.
    expect(Option.isSome(hoursAt(FERMENTATION_TABLE, 90, col))).toBe(true)
    // but the high-yeast columns (>1%) are null in the warm zone
    const col3 = FERMENTATION_TABLE.cyPct.indexOf(3)
    expect(Option.isNone(hoursAt(FERMENTATION_TABLE, 90, col3))).toBe(true)
  })
})

describe("fractionForColumn", () => {
  it("sums phase fractions for a column", () => {
    const col = FERMENTATION_TABLE.cyPct.indexOf(0.3)
    // 4h@72°F (7h full) + 48h@40°F (97h full)
    const f = fractionForColumn(
      FERMENTATION_TABLE,
      [
        { tempF: 72, hours: 4 },
        { tempF: 40, hours: 48 },
      ],
      col,
    )
    expect(Option.getOrThrow(f)).toBeCloseTo(4 / 7 + 48 / 97, 6)
  })
})

describe("deriveYeast — single phase equals a table cell", () => {
  it("a phase matching CY 0.3% @ 72°F (7h) derives ≈ 0.3% fresh", () => {
    // 7h @ 22.2°C (=72°F) with full=7h → fraction 1 exactly at the 0.3% column
    const result = deriveYeast(FERMENTATION_TABLE, "fresh", [phase(22.2, 7)])
    if (Either.isLeft(result)) throw new Error("expected Right")
    expect(result.right.pct).toBeCloseTo(0.3, 2)
  })
})

describe("deriveYeast — worked Example 2 (4h@72°F + 48h@40°F)", () => {
  it("derives ≈ 0.28% fresh", () => {
    const result = deriveYeast(FERMENTATION_TABLE, "fresh", [phase(22.2, 4), phase(4.4, 48)])
    if (Either.isLeft(result)) throw new Error("expected Right")
    // Between 0.2% (81%) and 0.3% (106%) → ~0.28%
    expect(result.right.pct).toBeGreaterThan(0.25)
    expect(result.right.pct).toBeLessThan(0.3)
  })

  it("active-dry and instant-dry results are smaller than fresh (per table headers)", () => {
    const fresh = deriveYeast(FERMENTATION_TABLE, "fresh", [phase(22.2, 4), phase(4.4, 48)])
    const ady = deriveYeast(FERMENTATION_TABLE, "active-dry", [phase(22.2, 4), phase(4.4, 48)])
    const idy = deriveYeast(FERMENTATION_TABLE, "instant-dry", [phase(22.2, 4), phase(4.4, 48)])
    if (Either.isLeft(fresh) || Either.isLeft(ady) || Either.isLeft(idy)) {
      throw new Error("expected Right")
    }
    expect(ady.right.pct).toBeLessThan(fresh.right.pct)
    expect(idy.right.pct).toBeLessThan(ady.right.pct)
  })

  it("exposes per-phase fractions that sum to ≈ 1", () => {
    const result = deriveYeast(FERMENTATION_TABLE, "fresh", [phase(22.2, 4), phase(4.4, 48)])
    if (Either.isLeft(result)) throw new Error("expected Right")
    const sum = result.right.phaseFractions.reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 1)
  })
})

describe("deriveYeast — unreachable cases", () => {
  it("over-fermented: long warm schedule even at the least yeast", () => {
    // 200h at 26.7°C (80°F) — way past full even at the smallest column
    const result = deriveYeast(FERMENTATION_TABLE, "fresh", [phase(26.7, 200)])
    expect(Either.isLeft(result)).toBe(true)
    if (Either.isRight(result)) return
    expect(result.left._tag).toBe("FermentationUnreachable")
    if (result.left._tag !== "FermentationUnreachable") return
    expect(result.left.kind).toBe("overfermented")
  })

  it("under-fermented: too short even at the most yeast", () => {
    // 0.5h at 1.7°C (35°F) — not enough even at 3% yeast
    const result = deriveYeast(FERMENTATION_TABLE, "fresh", [phase(1.7, 0.5)])
    expect(Either.isLeft(result)).toBe(true)
    if (Either.isRight(result)) return
    expect(result.left._tag).toBe("FermentationUnreachable")
    if (result.left._tag !== "FermentationUnreachable") return
    expect(result.left.kind).toBe("underfermented")
  })
})
