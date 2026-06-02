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
