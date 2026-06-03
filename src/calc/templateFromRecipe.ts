import { Either, Option, pipe } from "effect"
import type { PositivePercentage } from "../domain/Brands.ts"
import { EmptyFlourComposition, type DomainError } from "../domain/Errors.ts"
import { totalFlour as sumFlour, type Recipe } from "../domain/Recipe.ts"
import type { Template, TemplateExtra } from "../domain/Template.ts"
import type { TemplateYeast } from "../domain/Yeast.ts"

const round3 = (value: number): number => Math.round(value * 1000) / 1000

// Everything a Template needs except its identity/timestamps, which only the
// effectful caller can mint.
export type TemplateDraft = Omit<Template, "id" | "createdAt" | "updatedAt">

const pct = (grams: number, totalFlour: number): PositivePercentage =>
  round3((grams / totalFlour) * 100) as PositivePercentage

const optPct = (
  grams: Option.Option<number>,
  totalFlour: number,
): Option.Option<PositivePercentage> =>
  pipe(
    grams,
    Option.map((g) => pct(g, totalFlour)),
  )

// A Manual gram amount becomes a Manual baker's %; a Protocol carries over
// unchanged (the % is derived the same way at resolution time).
const yeastToTemplate = (
  yeast: Recipe["yeast"],
  totalFlour: number,
): TemplateYeast =>
  yeast._tag === "Manual"
    ? { _tag: "Manual", type: yeast.amount.type, pct: pct(yeast.amount.grams, totalFlour) }
    : { _tag: "Protocol", type: yeast.type, phases: yeast.phases }

// Inverse of generateFromTemplate: a concrete gram recipe → a reusable
// baker's-% template. Preferment split (if any) collapses into the totals.
export const templateFromRecipe = (
  recipe: Recipe,
): Either.Either<TemplateDraft, DomainError> => {
  const totalFlour = sumFlour(recipe.flours)
  if (totalFlour <= 0) {
    return Either.left(
      new EmptyFlourComposition({ message: "Au moins un composant de farine est requis" }),
    )
  }
  return Either.right({
    name: recipe.name,
    hydrationPct: pct(recipe.water, totalFlour),
    yeast: yeastToTemplate(recipe.yeast, totalFlour),
    saltPct: optPct(recipe.salt, totalFlour),
    sugarPct: optPct(recipe.sugar, totalFlour),
    oliveOilPct: optPct(recipe.oliveOil, totalFlour),
    extras: recipe.extras.map(
      (e): TemplateExtra => ({ name: e.name, pct: pct(e.grams, totalFlour) }),
    ),
    tags: recipe.tags,
  })
}
