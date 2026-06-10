import { Effect, Either, Exit, Layer, Option } from "effect"
import { describe, expect, it } from "vitest"
import type { Iso8601, RecipeId, TemplateId } from "../domain/Brands.ts"
import type { Recipe } from "../domain/Recipe.ts"
import type { Template } from "../domain/Template.ts"
import {
  RecipeRepository,
  RecipeRepositoryInMemory,
} from "../persistence/RecipeRepository.ts"
import {
  TemplateRepository,
  TemplateRepositoryInMemory,
} from "../persistence/TemplateRepository.ts"
import { applyBackup, buildBackup, parseBackup } from "./Backup.ts"

const sampleRecipe = (id: string, name: string): Recipe => ({
  id: id as RecipeId,
  name,
  flours: [
    {
      name: "Caputo 00",
      grams: 500 as Recipe["flours"][number]["grams"],
    },
  ],
  water: 325 as Recipe["water"],
  yeast: {
    _tag: "Manual",
    amount: { type: "fresh", grams: 1.5 as Recipe["flours"][number]["grams"] },
  },
  salt: Option.some(12.5 as Recipe["water"]),
  sugar: Option.none(),
  oliveOil: Option.none(),
  extras: [],
  preferment: Option.none(),
  sourceTemplate: Option.none(),
  tags: [],
  favorite: true,
  tried: false,
  rating: Option.none(),
  notes: Option.none(),
  createdAt: "2026-05-28T10:00:00.000Z" as Iso8601,
  updatedAt: "2026-05-28T10:00:00.000Z" as Iso8601,
})

const sampleTemplate = (id: string, name: string): Template => ({
  id: id as TemplateId,
  name,
  hydrationPct: 60 as Template["hydrationPct"],
  yeast: { _tag: "Manual", type: "fresh", pct: 0.3 as Template["hydrationPct"] },
  saltPct: Option.some(2.8 as Template["hydrationPct"]),
  sugarPct: Option.none(),
  oliveOilPct: Option.none(),
  extras: [],
  tags: [],
  createdAt: "2026-05-28T10:00:00.000Z" as Iso8601,
  updatedAt: "2026-05-28T10:00:00.000Z" as Iso8601,
})

const Repos = Layer.mergeAll(RecipeRepositoryInMemory, TemplateRepositoryInMemory)

describe("Backup round-trip", () => {
  it("builds a backup, parses it back, and re-imports identically", async () => {
    const program = Effect.gen(function* () {
      const recipeRepo = yield* RecipeRepository
      const templateRepo = yield* TemplateRepository
      yield* templateRepo.save(sampleTemplate("11111111-1111-4111-8111-111111111111", "Napoletana"))
      yield* recipeRepo.save(sampleRecipe("22222222-2222-4222-8222-222222222222", "Pizza A"))
      yield* recipeRepo.save(sampleRecipe("33333333-3333-4333-8333-333333333333", "Pizza B"))

      const json = yield* buildBackup
      const parsed = yield* parseBackup(json)
      expect(parsed.recipes).toHaveLength(2)
      expect(parsed.templates).toHaveLength(1)

      // Wipe and re-import
      for (const r of yield* recipeRepo.list) yield* recipeRepo.delete(r.id)
      for (const t of yield* templateRepo.list) yield* templateRepo.delete(t.id)
      expect(yield* recipeRepo.list).toHaveLength(0)

      const summary = yield* applyBackup(parsed)
      expect(summary).toEqual({ recipes: 2, templates: 1 })

      const restored = yield* recipeRepo.list
      expect(restored).toHaveLength(2)
      expect(restored.map((r) => r.name).sort()).toEqual(["Pizza A", "Pizza B"])
    })

    const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(Repos)))
    expect(Exit.isSuccess(exit)).toBe(true)
  })

  it("rejects invalid JSON", async () => {
    const result = await Effect.runPromise(
      Effect.either(parseBackup("not valid json {{{")),
    )
    expect(Either.isLeft(result)).toBe(true)
  })

  it("rejects valid JSON with wrong shape", async () => {
    const result = await Effect.runPromise(
      Effect.either(parseBackup(JSON.stringify({ version: 999, foo: "bar" }))),
    )
    expect(Either.isLeft(result)).toBe(true)
  })
})

// Encoded (JSON) shapes, as they'd appear in a real exported backup file.
const TPL_ID = "11111111-1111-4111-8111-111111111111"
const encodedTemplate = (tags: ReadonlyArray<string> | undefined) => ({
  id: TPL_ID,
  name: "Napoletana",
  hydrationPct: 60,
  yeast: { _tag: "Manual", type: "fresh", pct: 0.3 },
  saltPct: 2.8,
  sugarPct: null,
  oliveOilPct: null,
  extras: [],
  ...(tags === undefined ? {} : { tags }),
  createdAt: "2026-05-28T10:00:00.000Z",
  updatedAt: "2026-05-28T10:00:00.000Z",
})
const encodedRecipe = (
  id: string,
  tags: ReadonlyArray<string>,
  sourceTemplateId: string | undefined,
) => ({
  id,
  name: "Pizza",
  flours: [{ name: "Caputo 00", grams: 500 }],
  water: 325,
  yeast: { _tag: "Manual", amount: { type: "fresh", grams: 1.5 } },
  salt: 12.5,
  sugar: null,
  oliveOil: null,
  extras: [],
  preferment: null,
  ...(sourceTemplateId === undefined
    ? {}
    : { sourceTemplate: { id: sourceTemplateId, name: "Napoletana" } }),
  tags,
  favorite: false,
  tried: false,
  rating: null,
  notes: null,
  createdAt: "2026-05-28T10:00:00.000Z",
  updatedAt: "2026-05-28T10:00:00.000Z",
})

const parse = (recipes: ReadonlyArray<unknown>, templates: ReadonlyArray<unknown>) =>
  Effect.runPromise(parseBackup(JSON.stringify({ version: 1, exportedAt: "x", recipes, templates })))

describe("Backup tag reconciliation on import", () => {
  it("OLD backup (template without tags) keeps the generated recipe's own tags", async () => {
    const backup = await parse(
      [encodedRecipe("22222222-2222-4222-8222-222222222222", ["mes-tags"], TPL_ID)],
      [encodedTemplate(undefined)],
    )
    expect(backup.recipes[0]!.tags).toEqual(["mes-tags"])
    expect(backup.templates[0]!.tags).toEqual([])
  })

  it("template WITH tags overrides the generated recipe's tags", async () => {
    const backup = await parse(
      [encodedRecipe("22222222-2222-4222-8222-222222222222", ["stray", "old"], TPL_ID)],
      [encodedTemplate(["napoletana", "biga"])],
    )
    expect(backup.recipes[0]!.tags).toEqual(["napoletana", "biga"])
  })

  it("leaves a recipe without a source template untouched", async () => {
    const backup = await parse(
      [encodedRecipe("22222222-2222-4222-8222-222222222222", ["direct"], undefined)],
      [encodedTemplate(["napoletana"])],
    )
    expect(backup.recipes[0]!.tags).toEqual(["direct"])
  })

  it("does not wipe tags when the template has an empty tags array", async () => {
    const backup = await parse(
      [encodedRecipe("22222222-2222-4222-8222-222222222222", ["keep-me"], TPL_ID)],
      [encodedTemplate([])],
    )
    expect(backup.recipes[0]!.tags).toEqual(["keep-me"])
  })
})

describe("Backup preferment compatibility", () => {
  const RID = "44444444-4444-4444-8444-444444444444"

  it("imports a legacy backup with a flat preferment (yeastPctOfTotalYeast)", async () => {
    const recipe = {
      ...encodedRecipe(RID, [], undefined),
      preferment: { type: "biga", flourPct: 50, yeastPctOfTotalYeast: 50 },
    }
    const backup = await parse([recipe], [])
    const pre = backup.recipes[0]!.preferment
    expect(Option.isSome(pre)).toBe(true)
    if (Option.isNone(pre)) return
    expect(pre.value.yeast._tag).toBe("Manual")
    if (pre.value.yeast._tag !== "Manual") return
    expect(pre.value.yeast.yeastPctOfTotalYeast).toBe(50)
  })

  it("round-trips a recipe with a protocol-driven preferment", async () => {
    const recipe = {
      ...encodedRecipe(RID, [], undefined),
      preferment: {
        type: "poolish",
        flourPct: 30,
        yeast: { _tag: "Protocol", type: "fresh", phases: [{ temperatureC: 20, hours: 12 }] },
      },
    }
    const backup = await parse([recipe], [])
    const pre = backup.recipes[0]!.preferment
    expect(Option.isSome(pre)).toBe(true)
    if (Option.isNone(pre)) return
    expect(pre.value.yeast._tag).toBe("Protocol")
    if (pre.value.yeast._tag !== "Protocol") return
    expect(pre.value.yeast.phases).toHaveLength(1)
    expect(pre.value.yeast.phases[0]!.hours).toBe(12)
  })
})
