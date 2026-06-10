import { Data, Effect, Schema } from "effect"
import { normalizeLegacyRecipe, Recipe } from "../domain/Recipe.ts"
import { normalizeLegacyTemplate, Template } from "../domain/Template.ts"
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
const decodeBackupSchema = Schema.decodeUnknown(Backup)

const asRecord = (raw: unknown): Record<string, unknown> | undefined =>
  typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : undefined

const stringTags = (raw: unknown): ReadonlyArray<string> => {
  const rec = asRecord(raw)
  const t = rec?.["tags"]
  return Array.isArray(t) ? t.filter((x): x is string => typeof x === "string") : []
}

// A generated recipe (has sourceTemplate) takes its tags from the template it
// came from — but only when that template actually carries tags. An older
// template with no tags must never wipe a recipe's own tags (regression guard).
const reconcileRecipeTags = (
  recipe: unknown,
  tagsByTemplateId: ReadonlyMap<string, ReadonlyArray<string>>,
): unknown => {
  const rec = asRecord(recipe)
  if (rec === undefined) return recipe
  const id = asRecord(rec["sourceTemplate"])?.["id"]
  if (typeof id !== "string") return recipe
  const tags = tagsByTemplateId.get(id)
  return tags === undefined ? recipe : { ...rec, tags }
}

// Normalize legacy yeast shapes inside an imported backup, then reconcile the
// tags of generated recipes against their source template.
const normalizeBackup = (raw: unknown): unknown => {
  const r = asRecord(raw)
  if (r === undefined) return raw
  const mapArr = (v: unknown, f: (x: unknown) => unknown): unknown =>
    Array.isArray(v) ? v.map(f) : v

  const templates = mapArr(r["templates"], normalizeLegacyTemplate)
  const recipes = mapArr(r["recipes"], normalizeLegacyRecipe)

  const tagsByTemplateId = new Map<string, ReadonlyArray<string>>()
  if (Array.isArray(templates)) {
    for (const t of templates) {
      const id = asRecord(t)?.["id"]
      const tags = stringTags(t)
      if (typeof id === "string" && tags.length > 0) tagsByTemplateId.set(id, tags)
    }
  }

  return {
    ...r,
    recipes: Array.isArray(recipes)
      ? recipes.map((rec) => reconcileRecipeTags(rec, tagsByTemplateId))
      : recipes,
    templates,
  }
}

const decodeBackup = (raw: unknown) => decodeBackupSchema(normalizeBackup(raw))

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
