import { Either, Option } from "effect"
import { describe, expect, it } from "vitest"
import type { Iso8601, PositivePercentage, TemplateId } from "../domain/Brands.ts"
import type { FlourComponent } from "../domain/Ingredient.ts"
import type { Template } from "../domain/Template.ts"
import { generateFromTemplate } from "./bakerPercent.ts"

const pct = (n: number): PositivePercentage => n as PositivePercentage
const flour = (name: string, grams: number): FlourComponent =>
  ({ name, grams }) as FlourComponent

const templateBase: Template = {
  id: "00000000-0000-0000-0000-000000000000" as TemplateId,
  name: "Napoletana",
  hydrationPct: pct(60),
  yeastType: "fresh",
  yeastPct: pct(0.3),
  saltPct: Option.some(pct(2.8)),
  sugarPct: Option.none(),
  oliveOilPct: Option.none(),
  extras: [],
  createdAt: "2026-05-28T10:00:00Z" as Iso8601,
  updatedAt: "2026-05-28T10:00:00Z" as Iso8601,
}

describe("generateFromTemplate", () => {
  it("applies baker percentages on a 500g single-flour recipe", () => {
    const result = generateFromTemplate(templateBase, [flour("Caputo 00", 500)])
    expect(Either.isRight(result)).toBe(true)
    if (Either.isLeft(result)) return
    const r = result.right
    expect(r.totalFlour).toBe(500)
    expect(r.water).toBe(300) // 500 * 60% = 300
    expect(r.yeast.grams).toBe(1.5) // 500 * 0.3% = 1.5
    expect(r.yeast.type).toBe("fresh")
    expect(Option.getOrNull(r.salt)).toBe(14) // 500 * 2.8% = 14
    expect(Option.getOrNull(r.sugar)).toBeNull()
    expect(Option.getOrNull(r.oliveOil)).toBeNull()
  })

  it("sums flour components for composite flour recipes", () => {
    const result = generateFromTemplate(templateBase, [
      flour("Caputo 00", 400),
      flour("Manitoba", 100),
    ])
    if (Either.isLeft(result)) throw new Error("expected Right")
    expect(result.right.totalFlour).toBe(500)
    expect(result.right.water).toBe(300)
  })

  it("rejects empty flour composition", () => {
    const result = generateFromTemplate(templateBase, [])
    expect(Either.isLeft(result)).toBe(true)
    if (Either.isRight(result)) return
    expect(result.left._tag).toBe("EmptyFlourComposition")
  })

  it("rounds amounts to 1 decimal", () => {
    const result = generateFromTemplate(
      { ...templateBase, hydrationPct: pct(67) },
      [flour("Caputo 00", 333)],
    )
    if (Either.isLeft(result)) throw new Error("expected Right")
    // 333 * 0.67 = 223.11 → rounded to 223.1
    expect(result.right.water).toBe(223.1)
  })

  it("handles optional sugar and olive oil and extras", () => {
    const result = generateFromTemplate(
      {
        ...templateBase,
        sugarPct: Option.some(pct(1)),
        oliveOilPct: Option.some(pct(2)),
        extras: [{ name: "Malt", pct: pct(0.5) }],
      },
      [flour("Caputo", 1000)],
    )
    if (Either.isLeft(result)) throw new Error("expected Right")
    expect(Option.getOrNull(result.right.sugar)).toBe(10)
    expect(Option.getOrNull(result.right.oliveOil)).toBe(20)
    expect(result.right.extras).toEqual([{ name: "Malt", grams: 5 }])
  })
})
