import { Either, Option, pipe } from "effect"
import { EmptyFlourComposition, type DomainError } from "../domain/Errors.ts"
import type { FlourComponent } from "../domain/Ingredient.ts"
import type { Template } from "../domain/Template.ts"
import type { YeastAmount } from "../domain/Yeast.ts"

const round1 = (value: number): number => Math.round(value * 10) / 10

export type GeneratedRecipe = {
  readonly flours: ReadonlyArray<FlourComponent>
  readonly totalFlour: number
  readonly water: number
  readonly yeast: YeastAmount
  readonly salt: Option.Option<number>
  readonly sugar: Option.Option<number>
  readonly oliveOil: Option.Option<number>
  readonly extras: ReadonlyArray<{ readonly name: string; readonly grams: number }>
}

const optPct = (pct: Option.Option<number>, totalFlour: number): Option.Option<number> =>
  pipe(
    pct,
    Option.map((p) => round1(totalFlour * (p / 100))),
  )

export const generateFromTemplate = (
  template: Template,
  flourComposition: ReadonlyArray<FlourComponent>,
): Either.Either<GeneratedRecipe, DomainError> => {
  if (flourComposition.length === 0) {
    return Either.left(
      new EmptyFlourComposition({
        message: "Au moins un composant de farine est requis",
      }),
    )
  }

  const totalFlour = flourComposition.reduce((sum, f) => sum + f.grams, 0)

  const water = round1(totalFlour * (template.hydrationPct / 100))
  const yeastGrams = round1(totalFlour * (template.yeastPct / 100))

  return Either.right({
    flours: flourComposition,
    totalFlour,
    water,
    yeast: {
      type: template.yeastType,
      grams: yeastGrams as YeastAmount["grams"],
    },
    salt: optPct(template.saltPct, totalFlour),
    sugar: optPct(template.sugarPct, totalFlour),
    oliveOil: optPct(template.oliveOilPct, totalFlour),
    extras: template.extras.map((e) => ({
      name: e.name,
      grams: round1(totalFlour * (e.pct / 100)),
    })),
  })
}
