import { Either, Option } from "effect"
import { describe, expect, it } from "vitest"
import type { Percentage, PositivePercentage } from "../domain/Brands.ts"
import type { PrefermentSpec } from "../domain/Preferment.ts"
import type { YeastAmount } from "../domain/Yeast.ts"
import { splitWithPreferment, type SplittableRecipe } from "./prefermentSplit.ts"

const pct = (n: number): Percentage => n as Percentage
const ppct = (n: number): PositivePercentage => n as PositivePercentage
const yeast = (grams: number): YeastAmount => ({ type: "fresh", grams: grams as YeastAmount["grams"] })

const baseRecipe: SplittableRecipe = {
  totalFlour: 500,
  totalWater: 325, // 65% hydration
  totalYeast: yeast(1.5),
  salt: Option.some(12.5),
  sugar: Option.none(),
  oliveOil: Option.none(),
  extras: [],
}

describe("splitWithPreferment — biga 45%", () => {
  it("splits a 500g recipe with biga at 50% flour, 10% of yeast in biga", () => {
    const spec: PrefermentSpec = {
      type: "biga",
      flourPct: pct(50),
      yeastInPrefermentPct: ppct(10),
    }
    const result = splitWithPreferment(baseRecipe, spec)
    if (Either.isLeft(result)) throw new Error("expected Right")
    const { preferment, refresh, hydrationOfPreferment } = result.right

    expect(hydrationOfPreferment).toBe(45)

    // Preferment: 250g flour, 112.5g water (250 * 0.45), 0.15g yeast (1.5 * 0.10)
    expect(preferment.flour).toBe(250)
    expect(preferment.water).toBe(112.5)
    expect(preferment.yeast.grams).toBe(0.2) // 0.15 rounded to 1 decimal → 0.2

    // Refresh: 250g flour, 212.5g water, 1.4g yeast (1.5 - 0.15 ≈ 1.35 → rounded 1.4)
    expect(refresh.flour).toBe(250)
    expect(refresh.water).toBe(212.5)
    expect(refresh.yeast.grams).toBe(1.4)

    // Salt always goes to refresh
    expect(Option.getOrNull(refresh.salt)).toBe(12.5)
  })

  it("totals preserve sum (flour + water + yeast)", () => {
    const spec: PrefermentSpec = {
      type: "biga",
      flourPct: pct(40),
      yeastInPrefermentPct: ppct(5),
    }
    const result = splitWithPreferment(baseRecipe, spec)
    if (Either.isLeft(result)) throw new Error("expected Right")
    const { preferment, refresh } = result.right
    expect(preferment.flour + refresh.flour).toBeCloseTo(baseRecipe.totalFlour, 1)
    expect(preferment.water + refresh.water).toBeCloseTo(baseRecipe.totalWater, 1)
    expect(preferment.yeast.grams + refresh.yeast.grams).toBeCloseTo(
      baseRecipe.totalYeast.grams,
      1,
    )
  })

  it("preferment yeast type matches recipe yeast type", () => {
    const spec: PrefermentSpec = {
      type: "biga",
      flourPct: pct(30),
      yeastInPrefermentPct: ppct(5),
    }
    const result = splitWithPreferment(
      { ...baseRecipe, totalYeast: { type: "instant-dry", grams: 1 as YeastAmount["grams"] } },
      spec,
    )
    if (Either.isLeft(result)) throw new Error("expected Right")
    expect(result.right.preferment.yeast.type).toBe("instant-dry")
    expect(result.right.refresh.yeast.type).toBe("instant-dry")
  })
})

describe("splitWithPreferment — poolish 100%", () => {
  it("splits a 500g recipe with poolish at 30% flour", () => {
    const spec: PrefermentSpec = {
      type: "poolish",
      flourPct: pct(30),
      yeastInPrefermentPct: ppct(20),
    }
    const result = splitWithPreferment(baseRecipe, spec)
    if (Either.isLeft(result)) throw new Error("expected Right")
    const { preferment, refresh, hydrationOfPreferment } = result.right

    expect(hydrationOfPreferment).toBe(100)
    // Preferment: 150g flour, 150g water (100% hydration), 0.3g yeast (1.5 * 0.20)
    expect(preferment.flour).toBe(150)
    expect(preferment.water).toBe(150)
    expect(preferment.yeast.grams).toBe(0.3)
    // Refresh: 350g flour, 175g water, 1.2g yeast
    expect(refresh.flour).toBe(350)
    expect(refresh.water).toBe(175)
    expect(refresh.yeast.grams).toBe(1.2)
  })
})

describe("splitWithPreferment — validation errors", () => {
  it("rejects when poolish water would exceed total water", () => {
    // recipe with low hydration (50%): totalWater = 250g for 500g flour
    // poolish at 60% flour → needs 300g water in preferment → exceeds 250g
    const recipe: SplittableRecipe = {
      ...baseRecipe,
      totalWater: 250,
    }
    const spec: PrefermentSpec = {
      type: "poolish",
      flourPct: pct(60),
      yeastInPrefermentPct: ppct(10),
    }
    const result = splitWithPreferment(recipe, spec)
    expect(Either.isLeft(result)).toBe(true)
    if (Either.isRight(result)) return
    expect(result.left._tag).toBe("PrefermentExceedsRecipe")
    if (result.left._tag !== "PrefermentExceedsRecipe") return
    expect(result.left.resource).toBe("water")
  })

  it("allows preferment up to 100% of flour for biga (at hydration 45)", () => {
    const spec: PrefermentSpec = {
      type: "biga",
      flourPct: pct(100),
      yeastInPrefermentPct: ppct(50),
    }
    const result = splitWithPreferment(baseRecipe, spec)
    if (Either.isLeft(result)) throw new Error("expected Right")
    expect(result.right.preferment.flour).toBe(500)
    expect(result.right.refresh.flour).toBe(0)
  })
})
