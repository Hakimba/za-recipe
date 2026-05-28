import { describe, expect, it } from "vitest"
import type { YeastAmount } from "../domain/Yeast.ts"
import { convertYeast, convertYeastGrams } from "./yeastConvert.ts"

const amount = (type: YeastAmount["type"], grams: number): YeastAmount =>
  ({ type, grams }) as YeastAmount

describe("convertYeastGrams", () => {
  it("returns the same value when from === to", () => {
    expect(convertYeastGrams(2.5, "fresh", "fresh")).toBe(2.5)
  })

  it("converts fresh → active-dry using factor 0.4", () => {
    expect(convertYeastGrams(3, "fresh", "active-dry")).toBeCloseTo(1.2, 6)
  })

  it("converts fresh → instant-dry using factor 0.33", () => {
    expect(convertYeastGrams(3, "fresh", "instant-dry")).toBeCloseTo(0.99, 6)
  })

  it("converts active-dry → fresh as the inverse of fresh → active-dry", () => {
    expect(convertYeastGrams(1.2, "active-dry", "fresh")).toBeCloseTo(3, 6)
  })

  it("converts active-dry → instant-dry via fresh-equivalent (factor 0.825)", () => {
    expect(convertYeastGrams(1.0, "active-dry", "instant-dry")).toBeCloseTo(0.825, 6)
  })

  it("converts instant-dry → active-dry", () => {
    expect(convertYeastGrams(0.99, "instant-dry", "active-dry")).toBeCloseTo(1.2, 6)
  })

  it("is reversible — round-tripping returns the original value", () => {
    const original = 4.7
    const round = convertYeastGrams(
      convertYeastGrams(original, "fresh", "instant-dry"),
      "instant-dry",
      "fresh",
    )
    expect(round).toBeCloseTo(original, 6)
  })
})

describe("convertYeast (YeastAmount)", () => {
  it("returns same amount when types match", () => {
    const a = amount("fresh", 3)
    const result = convertYeast(a, "fresh")
    expect(result.type).toBe("fresh")
    expect(result.grams).toBe(3)
  })

  it("preserves the target type", () => {
    const result = convertYeast(amount("fresh", 3), "active-dry")
    expect(result.type).toBe("active-dry")
  })

  it("rounds to 3 decimals", () => {
    const result = convertYeast(amount("fresh", 1), "instant-dry")
    expect(result.grams).toBe(0.33)
  })
})
