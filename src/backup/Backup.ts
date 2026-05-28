import { Data, Effect, Schema } from "effect"
import { Recipe } from "../domain/Recipe.ts"
import { Template } from "../domain/Template.ts"
import { RecipeRepository } from "../persistence/RecipeRepository.ts"
import { TemplateRepository } from "../persistence/TemplateRepository.ts"

export const BACKUP_VERSION = 1 as const

export const Backup = Schema.Struct({
  version: Schema.Literal(BACKUP_VERSION),
  exportedAt: Schema.String,
  recipes: Schema.Array(Recipe),
  templates: Schema.Array(Template),
})
export type Backup = Schema.Schema.Type<typeof Backup>
export type BackupEncoded = Schema.Schema.Encoded<typeof Backup>

export class BackupParseError extends Data.TaggedError("BackupParseError")<{
  readonly message: string
  readonly cause: unknown
}> {}

const encodeBackup = Schema.encode(Backup)
const decodeBackup = Schema.decodeUnknown(Backup)

export const buildBackup: Effect.Effect<
  string,
  BackupParseError,
  RecipeRepository | TemplateRepository
> = Effect.gen(function* () {
  const recipeRepo = yield* RecipeRepository
  const templateRepo = yield* TemplateRepository
  const [recipes, templates] = yield* Effect.all([recipeRepo.list, templateRepo.list])
  const backup: Backup = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    recipes,
    templates,
  }
  const encoded = yield* encodeBackup(backup).pipe(
    Effect.mapError(
      (cause) =>
        new BackupParseError({
          message: "Échec d'encodage du backup",
          cause,
        }),
    ),
  )
  return JSON.stringify(encoded, null, 2)
}).pipe(
  Effect.catchTags({
    RepoError: (e) =>
      new BackupParseError({ message: "Échec de lecture du repository", cause: e }),
  }),
)

export const parseBackup = (
  text: string,
): Effect.Effect<Backup, BackupParseError> =>
  Effect.try({
    try: () => JSON.parse(text) as unknown,
    catch: (cause) => new BackupParseError({ message: "JSON invalide", cause }),
  }).pipe(
    Effect.flatMap((parsed) =>
      decodeBackup(parsed).pipe(
        Effect.mapError(
          (cause) =>
            new BackupParseError({
              message: "Format de backup invalide",
              cause,
            }),
        ),
      ),
    ),
  )

export type ImportSummary = {
  readonly recipes: number
  readonly templates: number
}

export const applyBackup = (
  backup: Backup,
): Effect.Effect<
  ImportSummary,
  BackupParseError,
  RecipeRepository | TemplateRepository
> =>
  Effect.gen(function* () {
    const recipeRepo = yield* RecipeRepository
    const templateRepo = yield* TemplateRepository
    yield* Effect.forEach(backup.templates, (t) => templateRepo.save(t), {
      discard: true,
    })
    yield* Effect.forEach(backup.recipes, (r) => recipeRepo.save(r), { discard: true })
    return {
      recipes: backup.recipes.length,
      templates: backup.templates.length,
    }
  }).pipe(
    Effect.catchTags({
      RepoError: (e) =>
        new BackupParseError({ message: "Échec d'écriture du repository", cause: e }),
    }),
  )

export const importBackup = (
  text: string,
): Effect.Effect<
  ImportSummary,
  BackupParseError,
  RecipeRepository | TemplateRepository
> => parseBackup(text).pipe(Effect.flatMap(applyBackup))
