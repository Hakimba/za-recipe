import { FRESH_TO_TYPE_FACTOR, type YeastAmount, type YeastType } from "../domain/Yeast.ts"

const round = (value: number, decimals: number): number => {
  const k = 10 ** decimals
  return Math.round(value * k) / k
}

export const convertYeastGrams = (
  grams: number,
  from: YeastType,
  to: YeastType,
): number => {
  if (from === to) return grams
  const freshEq = grams / FRESH_TO_TYPE_FACTOR[from]
  return freshEq * FRESH_TO_TYPE_FACTOR[to]
}

export const convertYeast = (amount: YeastAmount, to: YeastType): YeastAmount => ({
  type: to,
  grams: round(convertYeastGrams(amount.grams, amount.type, to), 3) as YeastAmount["grams"],
})

// A baker's % scales between yeast types exactly like grams (both are
// proportional to the same fresh-equivalent mass).
export const convertYeastPct = (pct: number, from: YeastType, to: YeastType): number =>
  round(convertYeastGrams(pct, from, to), 3)
