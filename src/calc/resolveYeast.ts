import { Either } from "effect"
import type { Percentage, PositiveNumber } from "../domain/Brands.ts"
import type { DomainError } from "../domain/Errors.ts"
import { FERMENTATION_TABLE } from "../domain/FermentationTable.ts"
import type { RecipeYeast, TemplateYeast, YeastAmount, YeastType } from "../domain/Yeast.ts"
import { deriveYeast } from "./fermentation.ts"

const round1 = (value: number): number => Math.round(value * 10) / 10

export type ResolvedTemplateYeast = {
  readonly type: YeastType
  readonly pct: Percentage
}

// Manual → its own %; Protocol → derived % via the fermentation table.
export const resolveTemplateYeast = (
  yeast: TemplateYeast,
): Either.Either<ResolvedTemplateYeast, DomainError> => {
  if (yeast._tag === "Manual") {
    return Either.right({ type: yeast.type, pct: yeast.pct as unknown as Percentage })
  }
  return deriveYeast(FERMENTATION_TABLE, yeast.type, yeast.phases).pipe(
    Either.map((d) => ({ type: yeast.type, pct: d.pct })),
  )
}

// Manual → its own grams; Protocol → derived % × totalFlour / 100.
export const resolveRecipeYeast = (
  yeast: RecipeYeast,
  totalFlourGrams: number,
): Either.Either<YeastAmount, DomainError> => {
  if (yeast._tag === "Manual") {
    return Either.right(yeast.amount)
  }
  return deriveYeast(FERMENTATION_TABLE, yeast.type, yeast.phases).pipe(
    Either.map((d) => ({
      type: yeast.type,
      grams: round1(totalFlourGrams * (d.pct / 100)) as PositiveNumber,
    })),
  )
}
