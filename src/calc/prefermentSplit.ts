import { Either, Option } from "effect"
import { PrefermentExceedsRecipe, type DomainError } from "../domain/Errors.ts"
import { PREFERMENT_HYDRATION, type PrefermentSpec } from "../domain/Preferment.ts"
import type { YeastAmount } from "../domain/Yeast.ts"

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

export const splitWithPreferment = (
  recipe: SplittableRecipe,
  spec: PrefermentSpec,
): Either.Either<PrefermentSplit, DomainError> => {
  const hydration = PREFERMENT_HYDRATION[spec.type]

  const prefermentFlour = recipe.totalFlour * (spec.flourPct / 100)
  const prefermentWater = prefermentFlour * (hydration / 100)
  const prefermentYeast = recipe.totalYeast.grams * (spec.yeastInPrefermentPct / 100)

  if (prefermentWater > recipe.totalWater + 1e-6) {
    return Either.left(
      new PrefermentExceedsRecipe({
        resource: "water",
        required: prefermentWater,
        available: recipe.totalWater,
      }),
    )
  }
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
}
