import { Schema } from "effect"
import { describe, expect, it } from "vitest"
import { normalizeLegacyRecipe, Recipe } from "./Recipe.ts"
import { normalizeLegacyTemplate, Template } from "./Template.ts"

const decodeTemplate = (raw: unknown) =>
  Schema.decodeUnknownSync(Template)(normalizeLegacyTemplate(raw))
const decodeRecipe = (raw: unknown) =>
  Schema.decodeUnknownSync(Recipe)(normalizeLegacyRecipe(raw))

// A template JSON saved before the yeast union existed (flat yeastType/yeastPct).
const legacyTemplateJson = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Old Napoletana",
  hydrationPct: 60,
  yeastType: "fresh",
  yeastPct: 0.3,
  saltPct: 2.8,
  sugarPct: null,
  oliveOilPct: null,
  extras: [],
  createdAt: "2026-05-28T10:00:00.000Z",
  updatedAt: "2026-05-28T10:00:00.000Z",
}

const legacyRecipeJson = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Old pizza",
  flours: [{ name: "Caputo", grams: 500 }],
  water: 325,
  yeast: { type: "fresh", grams: 1.5 },
  salt: 12.5,
  sugar: null,
  oliveOil: null,
  extras: [],
  preferment: null,
  tags: [],
  favorite: false,
  rating: null,
  notes: null,
  createdAt: "2026-05-28T10:00:00.000Z",
  updatedAt: "2026-05-28T10:00:00.000Z",
}

describe("legacy decode — Template", () => {
  it("maps flat yeastType/yeastPct to a Manual yeast", () => {
    const t = decodeTemplate(legacyTemplateJson)
    expect(t.yeast._tag).toBe("Manual")
    if (t.yeast._tag !== "Manual") return
    expect(t.yeast.type).toBe("fresh")
    expect(t.yeast.pct).toBe(0.3)
  })

  it("leaves a modern template untouched", () => {
    const modern = {
      ...legacyTemplateJson,
      yeastType: undefined,
      yeastPct: undefined,
      yeast: { _tag: "Manual", type: "active-dry", pct: 0.12 },
    }
    const t = decodeTemplate(modern)
    expect(t.yeast._tag).toBe("Manual")
    if (t.yeast._tag !== "Manual") return
    expect(t.yeast.type).toBe("active-dry")
  })
})

describe("legacy decode — Recipe", () => {
  it("wraps a bare YeastAmount into a Manual yeast", () => {
    const r = decodeRecipe(legacyRecipeJson)
    expect(r.yeast._tag).toBe("Manual")
    if (r.yeast._tag !== "Manual") return
    expect(r.yeast.amount.type).toBe("fresh")
    expect(r.yeast.amount.grams).toBe(1.5)
  })

  it("defaults the new `tried` flag to false for legacy records", () => {
    const r = decodeRecipe(legacyRecipeJson)
    expect(r.tried).toBe(false)
  })

  it("leaves a modern recipe untouched", () => {
    const modern = {
      ...legacyRecipeJson,
      yeast: { _tag: "Manual", amount: { type: "instant-dry", grams: 0.5 } },
    }
    const r = decodeRecipe(modern)
    expect(r.yeast._tag).toBe("Manual")
    if (r.yeast._tag !== "Manual") return
    expect(r.yeast.amount.type).toBe("instant-dry")
  })
})
