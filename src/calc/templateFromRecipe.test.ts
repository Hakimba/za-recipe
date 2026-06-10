import { Either, Option } from "effect"
import { describe, expect, it } from "vitest"
import type { Celsius, Iso8601, PositiveNumber, RecipeId, Tag, TemplateId } from "../domain/Brands.ts"
import type { FermentationProtocol } from "../domain/Fermentation.ts"
import type { Recipe } from "../domain/Recipe.ts"
import { generateFromTemplate } from "./bakerPercent.ts"
import { templateFromRecipe } from "./templateFromRecipe.ts"

const num = (n: number): PositiveNumber => n as PositiveNumber

const baseRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  id: "22222222-2222-4222-8222-222222222222" as RecipeId,
  name: "Pizza du livre",
  flours: [{ name: "Caputo 00", grams: num(500) }],
  water: num(325),
  yeast: { _tag: "Manual", amount: { type: "fresh", grams: num(1.5) } },
  salt: Option.some(num(12.5)),
  sugar: Option.none(),
  oliveOil: Option.some(num(10)),
  extras: [{ name: "Malt", grams: num(5) }],
  preferment: Option.none(),
  sourceTemplate: Option.none(),
  tags: ["napoletana"] as unknown as ReadonlyArray<Tag>,
  favorite: false,
  tried: false,
  rating: Option.none(),
  notes: Option.none(),
  createdAt: "2026-05-28T10:00:00.000Z" as Iso8601,
  updatedAt: "2026-05-28T10:00:00.000Z" as Iso8601,
  ...overrides,
})

describe("templateFromRecipe", () => {
  it("derives baker's percentages from a single-flour gram recipe", () => {
    const result = templateFromRecipe(baseRecipe())
    expect(Either.isRight(result)).toBe(true)
    if (Either.isLeft(result)) return
    const t = result.right
    expect(t.name).toBe("Pizza du livre")
    expect(t.hydrationPct).toBe(65) // 325 / 500 * 100
    expect(t.yeast._tag).toBe("Manual")
    if (t.yeast._tag !== "Manual") return
    expect(t.yeast.type).toBe("fresh")
    expect(t.yeast.pct).toBe(0.3) // 1.5 / 500 * 100
    expect(Option.getOrNull(t.saltPct)).toBe(2.5) // 12.5 / 500 * 100
    expect(Option.isNone(t.sugarPct)).toBe(true)
    expect(Option.getOrNull(t.oliveOilPct)).toBe(2) // 10 / 500 * 100
    expect(t.extras).toEqual([{ name: "Malt", pct: 1 }]) // 5 / 500 * 100
  })

  it("carries the recipe tags onto the template", () => {
    const result = templateFromRecipe(baseRecipe())
    if (Either.isLeft(result)) throw new Error("expected Right")
    expect(result.right.tags).toEqual(["napoletana"])
  })

  it("sums multiple flours for the percentage base", () => {
    const result = templateFromRecipe(
      baseRecipe({
        flours: [
          { name: "Caputo 00", grams: num(400) },
          { name: "Semola", grams: num(100) },
        ],
      }),
    )
    if (Either.isLeft(result)) throw new Error("expected Right")
    expect(result.right.hydrationPct).toBe(65) // still /500 total
  })

  it("carries a Protocol yeast over unchanged", () => {
    const phases: FermentationProtocol = [
      { temperatureC: 4 as Celsius, hours: num(48) },
    ]
    const result = templateFromRecipe(
      baseRecipe({ yeast: { _tag: "Protocol", type: "instant-dry", phases } }),
    )
    if (Either.isLeft(result)) throw new Error("expected Right")
    expect(result.right.yeast._tag).toBe("Protocol")
    if (result.right.yeast._tag !== "Protocol") return
    expect(result.right.yeast.type).toBe("instant-dry")
    expect(result.right.yeast.phases).toEqual(phases)
  })

  it("round-trips: generating from the derived template reproduces the grams", () => {
    const recipe = baseRecipe()
    const draft = templateFromRecipe(recipe)
    if (Either.isLeft(draft)) throw new Error("expected Right")
    const template = {
      ...draft.right,
      id: "00000000-0000-0000-0000-000000000000" as TemplateId,
      createdAt: "2026-05-28T10:00:00.000Z" as Iso8601,
      updatedAt: "2026-05-28T10:00:00.000Z" as Iso8601,
    }
    const regenerated = generateFromTemplate(template, recipe.flours)
    if (Either.isLeft(regenerated)) throw new Error("expected Right")
    const g = regenerated.right
    expect(g.water).toBe(325)
    expect(g.yeast.grams).toBe(1.5)
    expect(Option.getOrNull(g.salt)).toBe(12.5)
    expect(Option.getOrNull(g.oliveOil)).toBe(10)
    expect(g.extras).toEqual([{ name: "Malt", grams: 5 }])
  })
})
