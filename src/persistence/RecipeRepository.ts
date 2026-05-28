import { Context, Effect, Layer, Option, Schema } from "effect"
import type { RecipeId } from "../domain/Brands.ts"
import { Recipe } from "../domain/Recipe.ts"
import { openPizzaDB, RECIPES_STORE, type DB } from "./db.ts"
import { RepoError } from "./RepoError.ts"

export class RecipeRepository extends Context.Tag("RecipeRepository")<
  RecipeRepository,
  {
    readonly list: Effect.Effect<ReadonlyArray<Recipe>, RepoError>
    readonly get: (id: RecipeId) => Effect.Effect<Option.Option<Recipe>, RepoError>
    readonly save: (recipe: Recipe) => Effect.Effect<Recipe, RepoError>
    readonly delete: (id: RecipeId) => Effect.Effect<void, RepoError>
  }
>() {}

const encodeRecipe = Schema.encode(Recipe)
const decodeRecipe = Schema.decodeUnknown(Recipe)

const toRepoError =
  (op: string) =>
  (cause: unknown): RepoError =>
    new RepoError({ op, cause, message: `Échec ${op}` })

const makeLive = (db: DB): Context.Tag.Service<RecipeRepository> => ({
  list: Effect.tryPromise({
    try: () => db.getAll(RECIPES_STORE),
    catch: toRepoError("list recipes"),
  }).pipe(
    Effect.flatMap((rows) =>
      Effect.forEach(rows, (row) =>
        decodeRecipe(row).pipe(Effect.mapError(toRepoError("decode recipe"))),
      ),
    ),
  ),

  get: (id) =>
    Effect.tryPromise({
      try: () => db.get(RECIPES_STORE, id),
      catch: toRepoError("get recipe"),
    }).pipe(
      Effect.flatMap((row) =>
        row === undefined
          ? Effect.succeed(Option.none<Recipe>())
          : decodeRecipe(row).pipe(
              Effect.map(Option.some),
              Effect.mapError(toRepoError("decode recipe")),
            ),
      ),
    ),

  save: (recipe) =>
    encodeRecipe(recipe).pipe(
      Effect.mapError(toRepoError("encode recipe")),
      Effect.flatMap((encoded) =>
        Effect.tryPromise({
          try: () => db.put(RECIPES_STORE, encoded),
          catch: toRepoError("save recipe"),
        }),
      ),
      Effect.as(recipe),
    ),

  delete: (id) =>
    Effect.tryPromise({
      try: () => db.delete(RECIPES_STORE, id),
      catch: toRepoError("delete recipe"),
    }),
})

export const RecipeRepositoryLive: Layer.Layer<RecipeRepository, RepoError> = Layer.effect(
  RecipeRepository,
  openPizzaDB.pipe(Effect.map(makeLive)),
)

export const RecipeRepositoryInMemory: Layer.Layer<RecipeRepository> = Layer.sync(
  RecipeRepository,
  () => {
    const store = new Map<RecipeId, Recipe>()
    return {
      list: Effect.sync(() => Array.from(store.values())),
      get: (id) => Effect.sync(() => Option.fromNullable(store.get(id))),
      save: (recipe) =>
        Effect.sync(() => {
          store.set(recipe.id, recipe)
          return recipe
        }),
      delete: (id) =>
        Effect.sync(() => {
          store.delete(id)
        }),
    }
  },
)
