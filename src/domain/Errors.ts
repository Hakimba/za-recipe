import { Data } from "effect"

export class InvalidInput extends Data.TaggedError("InvalidInput")<{
  readonly field: string
  readonly message: string
}> {}

export class PrefermentExceedsRecipe extends Data.TaggedError("PrefermentExceedsRecipe")<{
  readonly resource: "water" | "yeast" | "flour"
  readonly required: number
  readonly available: number
}> {}

export class EmptyFlourComposition extends Data.TaggedError("EmptyFlourComposition")<{
  readonly message: string
}> {}

export class FermentationTempOutOfRange extends Data.TaggedError("FermentationTempOutOfRange")<{
  readonly phaseIndex: number
  readonly temperatureC: number
  readonly minC: number
  readonly maxC: number
}> {}

export class FermentationUnreachable extends Data.TaggedError("FermentationUnreachable")<{
  readonly kind: "underfermented" | "overfermented"
}> {}

export type DomainError =
  | InvalidInput
  | PrefermentExceedsRecipe
  | EmptyFlourComposition
  | FermentationTempOutOfRange
  | FermentationUnreachable
