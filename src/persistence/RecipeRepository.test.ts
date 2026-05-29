import { Effect, Option, Schema } from "effect"
import { describe, expect, it } from "vitest"
import type { Iso8601, RecipeId } from "../domain/Brands.ts"
import { Recipe } from "../domain/Recipe.ts"
import {
  RecipeRepository,
  RecipeRepositoryInMemory,
} from "./RecipeRepository.ts"

const encode = Schema.encodeSync(Recipe)
const decode = Schema.decodeUnknownSync(Recipe)

const sampleRecipe = (id: string): Recipe => ({
  id: id as RecipeId,
  name: "Test pizza",
  flours: [{ name: "Caputo 00", grams: 500 as Recipe["flours"][number]["grams"] }],
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
  tags: [],
  favorite: false,
  tried: false,
  rating: Option.none(),
  notes: Option.none(),
  createdAt: "2026-05-28T10:00:00.000Z" as Iso8601,
  updatedAt: "2026-05-28T10:00:00.000Z" as Iso8601,
})

describe("Recipe encode/decode round-trip", () => {
  it("preserves Option.none and Option.some through schema encoding", () => {
    const recipe = sampleRecipe("11111111-1111-4111-8111-111111111111")
    const encoded = encode(recipe)
    const decoded = decode(encoded)
    expect(decoded.name).toBe(recipe.name)
    expect(Option.isSome(decoded.salt)).toBe(true)
    expect(Option.isNone(decoded.sugar)).toBe(true)
    expect(Option.isNone(decoded.rating)).toBe(true)
  })
})

describe("RecipeRepositoryInMemory", () => {
  const run = <A, E>(eff: Effect.Effect<A, E, RecipeRepository>): Promise<A> =>
    Effect.runPromise(eff.pipe(Effect.provide(RecipeRepositoryInMemory)))

  it("saves, lists, gets, deletes", async () => {
    const recipe = sampleRecipe("22222222-2222-4222-8222-222222222222")

    const program = Effect.gen(function* () {
      const repo = yield* RecipeRepository
      yield* repo.save(recipe)
      const all = yield* repo.list
      const got = yield* repo.get(recipe.id)
      yield* repo.delete(recipe.id)
      const afterDelete = yield* repo.list
      return { all, got, afterDelete }
    })

    const { all, got, afterDelete } = await run(program)
    expect(all).toHaveLength(1)
    expect(Option.isSome(got)).toBe(true)
    expect(afterDelete).toHaveLength(0)
  })
})
