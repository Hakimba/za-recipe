import { Data } from "effect"

export class RepoError extends Data.TaggedError("RepoError")<{
  readonly op: string
  readonly cause: unknown
  readonly message: string
}> {}
