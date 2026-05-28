import { Effect, Exit } from "effect"
import { useCallback, useEffect, useState } from "react"
import { RepoError } from "../persistence/RepoError.ts"
import { runtime, type AppServices } from "../runtime/Runtime.ts"

export type QueryState<A, E> =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly data: A }
  | { readonly status: "error"; readonly error: E }

export const useEffectQuery = <A, E>(
  makeEffect: () => Effect.Effect<A, E, AppServices>,
  deps: ReadonlyArray<unknown>,
): { state: QueryState<A, E | RepoError>; refetch: () => void } => {
  const [state, setState] = useState<QueryState<A, E | RepoError>>({ status: "loading" })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: "loading" })
    runtime
      .runPromiseExit(makeEffect())
      .then((exit) => {
        if (cancelled) return
        if (Exit.isSuccess(exit)) {
          setState({ status: "ready", data: exit.value })
        } else {
          const failureOption = exit.cause as unknown as {
            readonly _tag?: string
            readonly failure?: E | RepoError
          }
          setState({
            status: "error",
            error: (failureOption.failure ?? exit.cause) as E | RepoError,
          })
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  return { state, refetch }
}

export const useEffectAction = <A, E, Args extends ReadonlyArray<unknown>>(
  makeEffect: (...args: Args) => Effect.Effect<A, E, AppServices>,
): {
  run: (...args: Args) => Promise<Exit.Exit<A, E | RepoError>>
  pending: boolean
} => {
  const [pending, setPending] = useState(false)
  const run = useCallback(
    async (...args: Args): Promise<Exit.Exit<A, E | RepoError>> => {
      setPending(true)
      try {
        return await runtime.runPromiseExit(makeEffect(...args))
      } finally {
        setPending(false)
      }
    },
    [makeEffect],
  )
  return { run, pending }
}
