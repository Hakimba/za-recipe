import { Effect } from "effect"
import type { RecipeId, TemplateId } from "../domain/Brands.ts"

const generateUuid = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16)
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export const makeRecipeId: Effect.Effect<RecipeId> = Effect.sync(
  () => generateUuid() as RecipeId,
)

export const makeTemplateId: Effect.Effect<TemplateId> = Effect.sync(
  () => generateUuid() as TemplateId,
)

export const nowIso: Effect.Effect<string> = Effect.sync(() => new Date().toISOString())
