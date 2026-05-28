import { Either, Option } from "effect"
import { describe, expect, it } from "vitest"
import type { Percentage, PositivePercentage } from "../domain/Brands.ts"
import type { PrefermentSpec } from "../domain/Preferment.ts"
import type { YeastAmount } from "../domain/Yeast.ts"
import { splitWithPreferment, type SplittableRecipe } from "./prefermentSplit.ts"

const pct = (n: number): Percentage => n as Percentage
const ppct = (n: number): PositivePercentage => n as PositivePercentage
const yeast = (grams: number): YeastAmount => ({
  type: "fresh",
  grams: grams as YeastAmount["grams"],
})

// Recipe baseline: 500 g flour, 65% hydration (325 g water), 0.3% yeast (1.5 g), 2.5% salt (12.5 g)
const baseRecipe: SplittableRecipe = {
  totalFlour: 500,
  totalWater: 325,
  totalYeast: yeast(1.5),
  salt: Option.some(12.5),
  sugar: Option.none(),
  oliveOil: Option.none(),
  extras: [],
}

describe("splitWithPreferment — biga (hydratation 45%, levure calculée sur la farine du préferment)", () => {
  it("respecte la règle d'uniformité Lehmann: biga 50% farine + 0.3% levure/farine biga → moitié de la levure dans la biga", () => {
    // 250 g biga flour × 0.3% = 0.75 g biga yeast (rounded to 0.8 g)
    const spec: PrefermentSpec = {
      type: "biga",
      flourPct: pct(50),
      yeastPctOfPrefermentFlour: ppct(0.3),
    }
    const result = splitWithPreferment(baseRecipe, spec)
    if (Either.isLeft(result)) throw new Error("expected Right")
    const { preferment, refresh, hydrationOfPreferment } = result.right

    expect(hydrationOfPreferment).toBe(45)
    expect(preferment.flour).toBe(250)
    expect(preferment.water).toBe(112.5)
    expect(preferment.yeast.grams).toBe(0.8) // 0.75 rounded
    expect(refresh.flour).toBe(250)
    expect(refresh.water).toBe(212.5)
    expect(refresh.yeast.grams).toBe(0.8) // 1.5 - 0.75 = 0.75 → 0.8
    expect(Option.getOrNull(refresh.salt)).toBe(12.5)
  })

  it("biga overnight à très peu de levure (0.1%) — laisse beaucoup de levure pour le rafraîchis", () => {
    // 250 × 0.1% = 0.25 g biga, refresh yeast = 1.5 - 0.25 = 1.25 g
    const spec: PrefermentSpec = {
      type: "biga",
      flourPct: pct(50),
      yeastPctOfPrefermentFlour: ppct(0.1),
    }
    const result = splitWithPreferment(baseRecipe, spec)
    if (Either.isLeft(result)) throw new Error("expected Right")
    expect(result.right.preferment.yeast.grams).toBe(0.3) // 0.25 → 0.3
    expect(result.right.refresh.yeast.grams).toBe(1.3) // 1.25 → 1.3
  })

  it("conserve les sommes farine + eau + levure", () => {
    const spec: PrefermentSpec = {
      type: "biga",
      flourPct: pct(40),
      yeastPctOfPrefermentFlour: ppct(0.2),
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

  it("le type de levure du préferment et du rafraîchis matche celui de la recette", () => {
    const spec: PrefermentSpec = {
      type: "biga",
      flourPct: pct(30),
      yeastPctOfPrefermentFlour: ppct(0.2),
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

describe("splitWithPreferment — poolish (hydratation 100%)", () => {
  it("poolish 30% farine + 0.2% levure (≈12h fermentation) — calcule sur la farine du poolish", () => {
    // 150 g poolish flour × 0.2% = 0.3 g poolish yeast
    const spec: PrefermentSpec = {
      type: "poolish",
      flourPct: pct(30),
      yeastPctOfPrefermentFlour: ppct(0.2),
    }
    const result = splitWithPreferment(baseRecipe, spec)
    if (Either.isLeft(result)) throw new Error("expected Right")
    const { preferment, refresh, hydrationOfPreferment } = result.right

    expect(hydrationOfPreferment).toBe(100)
    expect(preferment.flour).toBe(150)
    expect(preferment.water).toBe(150)
    expect(preferment.yeast.grams).toBe(0.3)
    expect(refresh.flour).toBe(350)
    expect(refresh.water).toBe(175)
    expect(refresh.yeast.grams).toBe(1.2) // 1.5 - 0.3
  })
})

describe("splitWithPreferment — validation", () => {
  it("rejette si l'eau du poolish dépasse l'eau totale", () => {
    // recipe 50% hydration: 250 g water for 500 g flour. Poolish at 60% flour → 300 g water needed > 250
    const recipe: SplittableRecipe = { ...baseRecipe, totalWater: 250 }
    const spec: PrefermentSpec = {
      type: "poolish",
      flourPct: pct(60),
      yeastPctOfPrefermentFlour: ppct(0.2),
    }
    const result = splitWithPreferment(recipe, spec)
    expect(Either.isLeft(result)).toBe(true)
    if (Either.isRight(result)) return
    expect(result.left._tag).toBe("PrefermentExceedsRecipe")
    if (result.left._tag !== "PrefermentExceedsRecipe") return
    expect(result.left.resource).toBe("water")
  })

  it("rejette si la levure du préferment dépasse la levure totale", () => {
    // 500 × 50% = 250 g biga flour, × 1% = 2.5 g biga yeast > 1.5 g total → erreur
    const spec: PrefermentSpec = {
      type: "biga",
      flourPct: pct(50),
      yeastPctOfPrefermentFlour: ppct(1),
    }
    const result = splitWithPreferment(baseRecipe, spec)
    expect(Either.isLeft(result)).toBe(true)
    if (Either.isRight(result)) return
    expect(result.left._tag).toBe("PrefermentExceedsRecipe")
    if (result.left._tag !== "PrefermentExceedsRecipe") return
    expect(result.left.resource).toBe("yeast")
  })

  it("autorise biga 100% farine avec très peu de levure", () => {
    // 500 g flour all in biga, 0.1% yeast → 0.5 g biga yeast (< 1.5 g OK)
    const spec: PrefermentSpec = {
      type: "biga",
      flourPct: pct(100),
      yeastPctOfPrefermentFlour: ppct(0.1),
    }
    const result = splitWithPreferment(baseRecipe, spec)
    if (Either.isLeft(result)) throw new Error("expected Right")
    expect(result.right.preferment.flour).toBe(500)
    expect(result.right.refresh.flour).toBe(0)
    expect(result.right.preferment.yeast.grams).toBe(0.5)
    expect(result.right.refresh.yeast.grams).toBe(1)
  })
})
