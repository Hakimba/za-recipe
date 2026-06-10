import { Either, Option } from "effect"
import { describe, expect, it } from "vitest"
import type { Celsius, Percentage, PositiveNumber } from "../domain/Brands.ts"
import type { FermentationProtocol } from "../domain/Fermentation.ts"
import type { PrefermentSpec } from "../domain/Preferment.ts"
import type { YeastAmount, YeastType } from "../domain/Yeast.ts"
import { deriveYeastDefault } from "./fermentation.ts"
import {
  equivalentYeastPctOnPrefermentFlour,
  splitWithPreferment,
  type SplittableRecipe,
} from "./prefermentSplit.ts"

const pct = (n: number): Percentage => n as Percentage
const round1 = (v: number): number => Math.round(v * 10) / 10
const protocolYeast = (
  type: YeastType,
  phases: ReadonlyArray<{ temperatureC: number; hours: number }>,
) => ({
  _tag: "Protocol" as const,
  type,
  phases: phases.map((p) => ({
    temperatureC: p.temperatureC as Celsius,
    hours: p.hours as PositiveNumber,
  })) as unknown as FermentationProtocol,
})
const yeast = (grams: number): YeastAmount => ({
  type: "fresh",
  grams: grams as YeastAmount["grams"],
})
const manual = (n: number) => ({ _tag: "Manual" as const, yeastPctOfTotalYeast: pct(n) })

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

describe("splitWithPreferment — biga (hydratation 45%)", () => {
  it("biga 50% farine + 50% de la levure totale", () => {
    const spec: PrefermentSpec = {
      type: "biga",
      flourPct: pct(50),
      yeast: manual(50),
    }
    const result = splitWithPreferment(baseRecipe, spec)
    if (Either.isLeft(result)) throw new Error("expected Right")
    const { preferment, refresh, hydrationOfPreferment } = result.right

    expect(hydrationOfPreferment).toBe(45)
    expect(preferment.flour).toBe(250)
    expect(preferment.water).toBe(112.5)
    expect(preferment.yeast.grams).toBe(0.8) // 1.5 × 0.5 = 0.75 → 0.8
    expect(refresh.flour).toBe(250)
    expect(refresh.water).toBe(212.5)
    expect(refresh.yeast.grams).toBe(0.8) // 1.5 - 0.75 = 0.75 → 0.8
    expect(Option.getOrNull(refresh.salt)).toBe(12.5)
  })

  it("biga 70% farine + 30% de la levure (overnight typique)", () => {
    const spec: PrefermentSpec = {
      type: "biga",
      flourPct: pct(70),
      yeast: manual(30),
    }
    const result = splitWithPreferment(baseRecipe, spec)
    if (Either.isLeft(result)) throw new Error("expected Right")
    const { preferment, refresh } = result.right
    expect(preferment.flour).toBe(350)
    expect(preferment.water).toBe(157.5)
    expect(preferment.yeast.grams).toBe(0.5) // 1.5 × 0.30 = 0.45 → 0.5
    expect(refresh.flour).toBe(150)
    expect(refresh.water).toBe(167.5)
    expect(refresh.yeast.grams).toBe(1.1) // 1.5 - 0.45 = 1.05 → 1.1
  })

  it("conserve les sommes farine + eau + levure", () => {
    const spec: PrefermentSpec = {
      type: "biga",
      flourPct: pct(40),
      yeast: manual(60),
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

  it("préserve le type de levure", () => {
    const spec: PrefermentSpec = {
      type: "biga",
      flourPct: pct(30),
      yeast: manual(50),
    }
    const result = splitWithPreferment(
      { ...baseRecipe, totalYeast: { type: "instant-dry", grams: 1 as YeastAmount["grams"] } },
      spec,
    )
    if (Either.isLeft(result)) throw new Error("expected Right")
    expect(result.right.preferment.yeast.type).toBe("instant-dry")
    expect(result.right.refresh.yeast.type).toBe("instant-dry")
  })

  it("avec 0% de la levure dans le préferment, tout va au rafraîchis", () => {
    const spec: PrefermentSpec = {
      type: "biga",
      flourPct: pct(50),
      yeast: manual(0),
    }
    const result = splitWithPreferment(baseRecipe, spec)
    if (Either.isLeft(result)) throw new Error("expected Right")
    expect(result.right.preferment.yeast.grams).toBe(0)
    expect(result.right.refresh.yeast.grams).toBe(1.5)
  })
})

describe("splitWithPreferment — poolish (hydratation 100%)", () => {
  it("poolish 30% farine + 25% de la levure totale", () => {
    const spec: PrefermentSpec = {
      type: "poolish",
      flourPct: pct(30),
      yeast: manual(25),
    }
    const result = splitWithPreferment(baseRecipe, spec)
    if (Either.isLeft(result)) throw new Error("expected Right")
    const { preferment, refresh, hydrationOfPreferment } = result.right

    expect(hydrationOfPreferment).toBe(100)
    expect(preferment.flour).toBe(150)
    expect(preferment.water).toBe(150)
    expect(preferment.yeast.grams).toBe(0.4) // 1.5 × 0.25 = 0.375 → 0.4
    expect(refresh.flour).toBe(350)
    expect(refresh.water).toBe(175)
    expect(refresh.yeast.grams).toBe(1.1) // 1.5 - 0.375 = 1.125 → 1.1
  })
})

describe("splitWithPreferment — validation", () => {
  it("rejette si l'eau du poolish dépasse l'eau totale", () => {
    const recipe: SplittableRecipe = { ...baseRecipe, totalWater: 250 }
    const spec: PrefermentSpec = {
      type: "poolish",
      flourPct: pct(60),
      yeast: manual(20),
    }
    const result = splitWithPreferment(recipe, spec)
    expect(Either.isLeft(result)).toBe(true)
    if (Either.isRight(result)) return
    expect(result.left._tag).toBe("PrefermentExceedsRecipe")
    if (result.left._tag !== "PrefermentExceedsRecipe") return
    expect(result.left.resource).toBe("water")
  })

  it("autorise biga 100% farine", () => {
    const spec: PrefermentSpec = {
      type: "biga",
      flourPct: pct(100),
      yeast: manual(50),
    }
    const result = splitWithPreferment(baseRecipe, spec)
    if (Either.isLeft(result)) throw new Error("expected Right")
    expect(result.right.preferment.flour).toBe(500)
    expect(result.right.refresh.flour).toBe(0)
  })
})

describe("splitWithPreferment — préferment piloté par protocole (TXCraig)", () => {
  it("dérive la levure du préferment sur la farine du préferment, rafraîchi = total − préferment", () => {
    // Poolish 30% farine (150 g) fermenté 12 h à 20 °C. Levure dérivée sur les 150 g.
    const phases = [{ temperatureC: 20, hours: 12 }]
    const spec: PrefermentSpec = {
      type: "poolish",
      flourPct: pct(30),
      yeast: protocolYeast("fresh", phases),
    }
    const derived = deriveYeastDefault(
      "fresh",
      phases.map((p) => ({ temperatureC: p.temperatureC as Celsius, hours: p.hours as PositiveNumber })),
    )
    if (Either.isLeft(derived)) throw new Error("baseline derive should converge")
    const expectedPrefGrams = round1(150 * (derived.right.pct / 100))

    const result = splitWithPreferment(baseRecipe, spec)
    if (Either.isLeft(result)) throw new Error("expected Right")
    const { preferment, refresh } = result.right

    expect(preferment.flour).toBe(150)
    expect(preferment.water).toBe(150) // poolish 100% hydratation
    expect(preferment.yeast.grams).toBe(expectedPrefGrams)
    // refresh = 1.5 − préferment (même type de levure), arrondi à 0.1 g.
    expect(refresh.yeast.grams).toBe(round1(baseRecipe.totalYeast.grams - expectedPrefGrams))
    expect(preferment.yeast.type).toBe("fresh")
  })

  it("rejette si la levure dérivée du préferment dépasse la levure totale", () => {
    // Très peu de levure totale, grosse part de farine préfermentée → la dérivation
    // produit plus de levure que la recette n'en contient.
    // biga (45% hydratation) pour que l'eau reste sous la limite et que ce soit
    // bien la levure dérivée qui dépasse.
    const recipe: SplittableRecipe = { ...baseRecipe, totalYeast: yeast(0.05) }
    const spec: PrefermentSpec = {
      type: "biga",
      flourPct: pct(80),
      yeast: protocolYeast("fresh", [{ temperatureC: 20, hours: 12 }]),
    }
    const result = splitWithPreferment(recipe, spec)
    expect(Either.isLeft(result)).toBe(true)
    if (Either.isRight(result)) return
    expect(result.left._tag).toBe("PrefermentExceedsRecipe")
    if (result.left._tag !== "PrefermentExceedsRecipe") return
    expect(result.left.resource).toBe("yeast")
  })

  it("propage l'erreur d'un protocole hors plage de température", () => {
    const spec: PrefermentSpec = {
      type: "poolish",
      flourPct: pct(30),
      yeast: protocolYeast("fresh", [{ temperatureC: 50, hours: 2 }]), // > 35 °C, hors table
    }
    const result = splitWithPreferment(baseRecipe, spec)
    expect(Either.isLeft(result)).toBe(true)
    if (Either.isRight(result)) return
    expect(result.left._tag).toBe("FermentationTempOutOfRange")
  })

  it("convertit la levure dérivée vers le type de levure de la recette", () => {
    // Préferment en IDY, recette en fresh : préf + rafraîchi doivent sommer au total fresh.
    const spec: PrefermentSpec = {
      type: "poolish",
      flourPct: pct(30),
      yeast: protocolYeast("instant-dry", [{ temperatureC: 20, hours: 12 }]),
    }
    const result = splitWithPreferment(baseRecipe, spec)
    if (Either.isLeft(result)) throw new Error("expected Right")
    const { preferment, refresh } = result.right
    expect(preferment.yeast.type).toBe("fresh")
    expect(refresh.yeast.type).toBe("fresh")
    expect(preferment.yeast.grams + refresh.yeast.grams).toBeCloseTo(
      baseRecipe.totalYeast.grams,
      1,
    )
  })
})

describe("equivalentYeastPctOnPrefermentFlour", () => {
  it("calcule la conversion: 50% de 1.5g pour une biga de 250g = 0.3%", () => {
    const eq = equivalentYeastPctOnPrefermentFlour({
      totalFlour: 500,
      totalYeast: 1.5,
      flourPct: 50,
      yeastPctOfTotalYeast: 50,
    })
    expect(Option.isSome(eq)).toBe(true)
    if (Option.isNone(eq)) return
    expect(eq.value).toBeCloseTo(0.3, 6)
  })

  it("renvoie None si la farine du préferment est nulle", () => {
    const eq = equivalentYeastPctOnPrefermentFlour({
      totalFlour: 500,
      totalYeast: 1.5,
      flourPct: 0,
      yeastPctOfTotalYeast: 50,
    })
    expect(Option.isNone(eq)).toBe(true)
  })

  it("100% de levure totale dans biga 100% farine = même % que la recette", () => {
    // Recipe at 0.3% yeast → moving 100% of yeast into 100% of flour = 0.3%
    const eq = equivalentYeastPctOnPrefermentFlour({
      totalFlour: 500,
      totalYeast: 1.5,
      flourPct: 100,
      yeastPctOfTotalYeast: 100,
    })
    if (Option.isNone(eq)) throw new Error("expected Some")
    expect(eq.value).toBeCloseTo(0.3, 6)
  })

  it("règle d'uniformité Lehmann: même % flour et yeast → même densité que la recette", () => {
    // Recipe 0.3% yeast, biga 50% flour + 50% yeast → biga has 0.3% yeast on biga flour
    const eq = equivalentYeastPctOnPrefermentFlour({
      totalFlour: 500,
      totalYeast: 1.5,
      flourPct: 50,
      yeastPctOfTotalYeast: 50,
    })
    if (Option.isNone(eq)) throw new Error("expected Some")
    expect(eq.value).toBeCloseTo(0.3, 6)
  })
})
