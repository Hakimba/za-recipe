import { Effect } from "effect"

export const downloadTextFile = (
  filename: string,
  content: string,
  mimeType = "application/json",
): Effect.Effect<void> =>
  Effect.sync(() => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  })

export const readFileText = (file: File): Effect.Effect<string, Error> =>
  Effect.tryPromise({
    try: () => file.text(),
    catch: (cause) =>
      cause instanceof Error ? cause : new Error("Lecture du fichier impossible"),
  })
