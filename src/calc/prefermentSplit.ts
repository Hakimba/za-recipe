import { Either, Option } from "effect"
import { PrefermentExceedsRecipe, type DomainError } from "../domain/Errors.ts"
import {
  PREFERMENT_HYDRATION,
  type PrefermentSpec,
  type PrefermentYeast,
} from "../domain/Preferment.ts"
import type { YeastAmount } from "../domain/Yeast.ts"
import { deriveYeastDefault } from "./fermentation.ts"
import { convertYeastGrams } from "./yeastConvert.ts"

export const equivalentYeastPctOnPrefermentFlour = (params: {
  readonly totalFlour: number
  readonly totalYeast: number
  readonly flourPct: number
  readonly yeastPctOfTotalYeast: number
}): Option.Option<number> => {
  const prefermentFlour = params.totalFlour * (params.flourPct / 100)
  if (prefermentFlour <= 0) return Option.none()
  const prefermentYeast = params.totalYeast * (params.yeastPctOfTotalYeast / 100)
  return Option.some((prefermentYeast / prefermentFlour) * 100)
}

const round1 = (value: number): number => Math.round(value * 10) / 10

export type PrefermentPortion = {
  readonly flour: number
  readonly water: number
  readonly yeast: YeastAmount
}

export type RefreshPortion = {
  readonly flour: number
  readonly water: number
  readonly yeast: YeastAmount
  readonly salt: Option.Option<number>
  readonly sugar: Option.Option<number>
  readonly oliveOil: Option.Option<number>
  readonly extras: ReadonlyArray<{ readonly name: string; readonly grams: number }>
}

export type PrefermentSplit = {
  readonly preferment: PrefermentPortion
  readonly refresh: RefreshPortion
  readonly hydrationOfPreferment: number
}

export type SplittableRecipe = {
  readonly totalFlour: number
  readonly totalWater: number
  readonly totalYeast: YeastAmount
  readonly salt: Option.Option<number>
  readonly sugar: Option.Option<number>
  readonly oliveOil: Option.Option<number>
  readonly extras: ReadonlyArray<{ readonly name: string; readonly grams: number }>
}

// Resolve how many grams of yeast (expressed in the recipe's total-yeast type)
// belong in the preferment. Manual → a share of the total yeast. Protocol →
// derived from the preferment's own fermentation schedule via TXCraig, applied
// to the preferment flour and converted into the recipe's yeast type so the
// "refresh = total − preferment" subtraction stays type-consistent.
const resolvePrefermentYeastGrams = (
  yeast: PrefermentYeast,
  prefermentFlour: number,
  totalYeast: YeastAmount,
): Either.Either<number, DomainError> => {
  if (yeast._tag === "Manual") {
    return Either.right(totalYeast.grams * (yeast.yeastPctOfTotalYeast / 100))
  }
  return deriveYeastDefault(yeast.type, yeast.phases).pipe(
    Either.map((d) =>
      convertYeastGrams(prefermentFlour * (d.pct / 100), yeast.type, totalYeast.type),
    ),
  )
}

export const splitWithPreferment = (
  recipe: SplittableRecipe,
  spec: PrefermentSpec,
): Either.Either<PrefermentSplit, DomainError> => {
  const hydration = PREFERMENT_HYDRATION[spec.type]

  const prefermentFlour = recipe.totalFlour * (spec.flourPct / 100)
  const prefermentWater = prefermentFlour * (hydration / 100)

  if (prefermentWater > recipe.totalWater + 1e-6) {
    return Either.left(
      new PrefermentExceedsRecipe({
        resource: "water",
        required: prefermentWater,
        available: recipe.totalWater,
      }),
    )
  }

  return resolvePrefermentYeastGrams(spec.yeast, prefermentFlour, recipe.totalYeast).pipe(
    Either.flatMap((prefermentYeast) => {
      if (prefermentYeast > recipe.totalYeast.grams + 1e-6) {
        return Either.left(
          new PrefermentExceedsRecipe({
            resource: "yeast",
            required: prefermentYeast,
            available: recipe.totalYeast.grams,
          }),
        )
      }

      const refreshFlour = recipe.totalFlour - prefermentFlour
      const refreshWater = recipe.totalWater - prefermentWater
      const refreshYeast = recipe.totalYeast.grams - prefermentYeast

      return Either.right({
        hydrationOfPreferment: hydration,
        preferment: {
          flour: round1(prefermentFlour),
          water: round1(prefermentWater),
          yeast: {
            type: recipe.totalYeast.type,
            grams: round1(prefermentYeast) as YeastAmount["grams"],
          },
        },
        refresh: {
          flour: round1(refreshFlour),
          water: round1(refreshWater),
          yeast: {
            type: recipe.totalYeast.type,
            grams: round1(refreshYeast) as YeastAmount["grams"],
          },
          salt: recipe.salt,
          sugar: recipe.sugar,
          oliveOil: recipe.oliveOil,
          extras: recipe.extras,
        },
      })
    }),
  )
}
