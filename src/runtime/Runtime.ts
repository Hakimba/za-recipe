import { Effect, Exit, Layer, ManagedRuntime } from "effect"
import { RecipeRepository, RecipeRepositoryLive } from "../persistence/RecipeRepository.ts"
import { RepoError } from "../persistence/RepoError.ts"
import { TemplateRepository, TemplateRepositoryLive } from "../persistence/TemplateRepository.ts"

export type AppServices = RecipeRepository | TemplateRepository

const AppLayer = Layer.mergeAll(RecipeRepositoryLive, TemplateRepositoryLive)

export const runtime = ManagedRuntime.make(AppLayer)

export const runPromise = <A, E>(
  eff: Effect.Effect<A, E, AppServices>,
): Promise<A> => runtime.runPromise(eff)

export const runPromiseExit = <A, E>(
  eff: Effect.Effect<A, E, AppServices>,
): Promise<Exit.Exit<A, E | RepoError>> => runtime.runPromiseExit(eff)
