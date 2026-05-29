import { Either, Option } from "effect"
import type { Percentage } from "../domain/Brands.ts"
import {
  FermentationTempOutOfRange,
  FermentationUnreachable,
  type DomainError,
} from "../domain/Errors.ts"
import { celsiusToF, type FermentationPhase } from "../domain/Fermentation.ts"
import {
  FERMENTATION_MAX_F,
  FERMENTATION_MIN_F,
  FERMENTATION_TABLE,
  type FermentationTable,
} from "../domain/FermentationTable.ts"
import type { YeastType } from "../domain/Yeast.ts"

const round = (value: number, decimals: number): number => {
  const k = 10 ** decimals
  return Math.round(value * k) / k
}

const headersFor = (table: FermentationTable, type: YeastType): ReadonlyArray<number> =>
  type === "fresh" ? table.cyPct : type === "active-dry" ? table.adyPct : table.idyPct

// Full-completion hours at an (interpolated) temperature for a fixed yeast column.
// None if a bracketing cell is off-chart (null) — that column can't be evaluated here.
export const hoursAt = (
  table: FermentationTable,
  tempF: number,
  colIndex: number,
): Option.Option<number> => {
  const temps = table.temperaturesF
  if (tempF < temps[0]! || tempF > temps[temps.length - 1]!) return Option.none()
  let hi = 1
  while (hi < temps.length && temps[hi]! < tempF) hi++
  const lo = hi - 1
  const tLo = temps[lo]!
  const tHi = temps[hi]!
  const hLo = table.hours[lo]![colIndex]
  const hHi = table.hours[hi]![colIndex]
  if (hLo === null || hLo === undefined || hHi === null || hHi === undefined) {
    return Option.none()
  }
  if (tHi === tLo) return Option.some(hLo)
  const frac = (tempF - tLo) / (tHi - tLo)
  return Option.some(hLo + frac * (hHi - hLo))
}

type PhaseF = { readonly tempF: number; readonly hours: number }

// Σ duration_i / F(temp_i, col); None if any phase is unevaluable in this column.
export const fractionForColumn = (
  table: FermentationTable,
  phases: ReadonlyArray<PhaseF>,
  colIndex: number,
): Option.Option<number> => {
  let total = 0
  for (const p of phases) {
    const f = hoursAt(table, p.tempF, colIndex)
    if (Option.isNone(f) || f.value <= 0) return Option.none()
    total += p.hours / f.value
  }
  return Option.some(total)
}

export type DerivedYeast = {
  readonly pct: Percentage
  readonly phaseFractions: ReadonlyArray<number>
}

// Solve Σ duration_i / F(temp_i, yeast) = 1 for the yeast amount, returning the
// baker's % expressed in the chosen yeast type. Uses full interpolation:
// temperature inside each column, then the yeast % at the fraction=1 crossing.
export const deriveYeast = (
  table: FermentationTable,
  type: YeastType,
  phases: ReadonlyArray<FermentationPhase>,
): Either.Either<DerivedYeast, DomainError> => {
  if (phases.length === 0) {
    return Either.left(new FermentationUnreachable({ kind: "underfermented" }))
  }

  // °C↔°F rounding (e.g. 26.7 °C = 80.06 °F) can land a hair outside the °F
  // grid; clamp that, but reject anything clearly out of the table with a
  // friendly error (kept tight so it never accepts a temp the Celsius brand
  // would later reject at encode).
  const TOLERANCE_F = 0.5
  const phasesF: PhaseF[] = []
  for (let i = 0; i < phases.length; i++) {
    const raw = celsiusToF(phases[i]!.temperatureC)
    if (raw < FERMENTATION_MIN_F - TOLERANCE_F || raw > FERMENTATION_MAX_F + TOLERANCE_F) {
      return Either.left(
        new FermentationTempOutOfRange({
          phaseIndex: i,
          temperatureC: phases[i]!.temperatureC,
          minC: 1.7,
          maxC: 26.7,
        }),
      )
    }
    const tempF = Math.min(FERMENTATION_MAX_F, Math.max(FERMENTATION_MIN_F, raw))
    phasesF.push({ tempF, hours: phases[i]!.hours })
  }

  const headers = headersFor(table, type)
  const nCols = headers.length

  // fraction is monotone increasing in yeast (column index). Evaluate per column.
  const fractions: Array<number | null> = []
  for (let c = 0; c < nCols; c++) {
    const f = fractionForColumn(table, phasesF, c)
    fractions.push(Option.isSome(f) ? f.value : null)
  }

  // Need a bracket where fraction crosses 1 between two evaluable adjacent columns.
  for (let c = 0; c < nCols - 1; c++) {
    const fa = fractions[c]
    const fb = fractions[c + 1]
    if (fa === null || fa === undefined || fb === null || fb === undefined) continue
    if (fa <= 1 && 1 <= fb) {
      const span = fb - fa
      const t = span === 0 ? 0 : (1 - fa) / span
      const pct = headers[c]! + t * (headers[c + 1]! - headers[c]!)
      const solvedCol = c + t
      const phaseFractions = phasesF.map((p) => {
        const lo = Math.floor(solvedCol)
        const hiF = hoursAt(table, p.tempF, Math.min(lo + 1, nCols - 1))
        const loF = hoursAt(table, p.tempF, lo)
        const fHours =
          Option.isSome(loF) && Option.isSome(hiF)
            ? loF.value + (solvedCol - lo) * (hiF.value - loF.value)
            : Option.isSome(loF)
              ? loF.value
              : 1
        return round(p.hours / fHours, 4)
      })
      return Either.right({ pct: round(pct, 4) as Percentage, phaseFractions })
    }
  }

  // No crossing: the lowest-yeast evaluable column already exceeds 1 → over-fermented.
  const firstEval = fractions.find((f) => f !== null && f !== undefined) ?? null
  if (firstEval !== null && firstEval > 1) {
    return Either.left(new FermentationUnreachable({ kind: "overfermented" }))
  }
  return Either.left(new FermentationUnreachable({ kind: "underfermented" }))
}

export const deriveYeastDefault = (
  type: YeastType,
  phases: ReadonlyArray<FermentationPhase>,
): Either.Either<DerivedYeast, DomainError> =>
  deriveYeast(FERMENTATION_TABLE, type, phases)
