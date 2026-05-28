import { Context, Effect, Layer, Option, Schema } from "effect"
import type { TemplateId } from "../domain/Brands.ts"
import { Template } from "../domain/Template.ts"
import { openPizzaDB, TEMPLATES_STORE, type DB } from "./db.ts"
import { RepoError } from "./RepoError.ts"

export class TemplateRepository extends Context.Tag("TemplateRepository")<
  TemplateRepository,
  {
    readonly list: Effect.Effect<ReadonlyArray<Template>, RepoError>
    readonly get: (id: TemplateId) => Effect.Effect<Option.Option<Template>, RepoError>
    readonly save: (template: Template) => Effect.Effect<Template, RepoError>
    readonly delete: (id: TemplateId) => Effect.Effect<void, RepoError>
  }
>() {}

const encodeTemplate = Schema.encode(Template)
const decodeTemplate = Schema.decodeUnknown(Template)

const toRepoError =
  (op: string) =>
  (cause: unknown): RepoError =>
    new RepoError({ op, cause, message: `Échec ${op}` })

const makeLive = (db: DB): Context.Tag.Service<TemplateRepository> => ({
  list: Effect.tryPromise({
    try: () => db.getAll(TEMPLATES_STORE),
    catch: toRepoError("list templates"),
  }).pipe(
    Effect.flatMap((rows) =>
      Effect.forEach(rows, (row) =>
        decodeTemplate(row).pipe(Effect.mapError(toRepoError("decode template"))),
      ),
    ),
  ),

  get: (id) =>
    Effect.tryPromise({
      try: () => db.get(TEMPLATES_STORE, id),
      catch: toRepoError("get template"),
    }).pipe(
      Effect.flatMap((row) =>
        row === undefined
          ? Effect.succeed(Option.none<Template>())
          : decodeTemplate(row).pipe(
              Effect.map(Option.some),
              Effect.mapError(toRepoError("decode template")),
            ),
      ),
    ),

  save: (template) =>
    encodeTemplate(template).pipe(
      Effect.mapError(toRepoError("encode template")),
      Effect.flatMap((encoded) =>
        Effect.tryPromise({
          try: () => db.put(TEMPLATES_STORE, encoded),
          catch: toRepoError("save template"),
        }),
      ),
      Effect.as(template),
    ),

  delete: (id) =>
    Effect.tryPromise({
      try: () => db.delete(TEMPLATES_STORE, id),
      catch: toRepoError("delete template"),
    }),
})

export const TemplateRepositoryLive: Layer.Layer<TemplateRepository, RepoError> = Layer.effect(
  TemplateRepository,
  openPizzaDB.pipe(Effect.map(makeLive)),
)

export const TemplateRepositoryInMemory: Layer.Layer<TemplateRepository> = Layer.sync(
  TemplateRepository,
  () => {
    const store = new Map<TemplateId, Template>()
    return {
      list: Effect.sync(() => Array.from(store.values())),
      get: (id) => Effect.sync(() => Option.fromNullable(store.get(id))),
      save: (template) =>
        Effect.sync(() => {
          store.set(template.id, template)
          return template
        }),
      delete: (id) =>
        Effect.sync(() => {
          store.delete(id)
        }),
    }
  },
)
