import { Effect, Exit } from "effect"
import { useRef, useState } from "react"
import { buildBackup, importBackup, type ImportSummary } from "../backup/Backup.ts"
import { downloadTextFile, readFileText } from "../backup/download.ts"
import { runPromiseExit } from "../runtime/Runtime.ts"
import { Button, Card, PageHeader } from "../ui/primitives.tsx"

type Status =
  | { readonly kind: "idle" }
  | { readonly kind: "working" }
  | { readonly kind: "exported" }
  | { readonly kind: "imported"; readonly summary: ImportSummary }
  | { readonly kind: "error"; readonly message: string }

const isoFilename = (): string => {
  const now = new Date()
  const stamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19)
  return `za-recipe-backup-${stamp}.json`
}

export const BackupPage = (): JSX.Element => {
  const [status, setStatus] = useState<Status>({ kind: "idle" })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onExport = async (): Promise<void> => {
    setStatus({ kind: "working" })
    const exit = await runPromiseExit(
      buildBackup.pipe(Effect.flatMap((json) => downloadTextFile(isoFilename(), json))),
    )
    if (Exit.isSuccess(exit)) setStatus({ kind: "exported" })
    else setStatus({ kind: "error", message: "Échec de l'export" })
  }

  const onPickFile = (): void => fileInputRef.current?.click()

  const onImport = async (file: File): Promise<void> => {
    setStatus({ kind: "working" })
    const exit = await runPromiseExit(
      readFileText(file).pipe(
        Effect.mapError((e) => ({ _tag: "Read" as const, error: e })),
        Effect.flatMap((text) =>
          importBackup(text).pipe(
            Effect.mapError((e) => ({ _tag: "Parse" as const, error: e })),
          ),
        ),
      ),
    )
    if (Exit.isSuccess(exit)) {
      setStatus({ kind: "imported", summary: exit.value })
    } else {
      setStatus({ kind: "error", message: "Échec de l'import — fichier invalide ou corrompu" })
    }
  }

  return (
    <>
      <PageHeader title="Sauvegarde" subtitle="Export / Import JSON" back />

      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold text-stone-800">Exporter</h2>
        <p className="text-sm text-stone-600">
          Télécharge un fichier JSON contenant <strong>toutes</strong> tes recettes et templates.
          Garde-le précieusement pour transférer entre versions ou appareils.
        </p>
        <Button onClick={onExport} disabled={status.kind === "working"}>
          {status.kind === "working" ? "…" : "Télécharger le backup"}
        </Button>
      </Card>

      <Card className="mt-3 flex flex-col gap-3">
        <h2 className="font-semibold text-stone-800">Importer</h2>
        <p className="text-sm text-stone-600">
          Charge un fichier JSON exporté précédemment. Les recettes et templates avec le même
          identifiant sont <strong>écrasés</strong>, les autres sont ajoutés.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file !== undefined) void onImport(file)
            e.target.value = ""
          }}
        />
        <Button variant="secondary" onClick={onPickFile} disabled={status.kind === "working"}>
          {status.kind === "working" ? "…" : "Choisir un fichier JSON"}
        </Button>
      </Card>

      {status.kind === "exported" ? (
        <Card className="mt-3 bg-basil-500/10 border-basil-500/30">
          <p className="text-sm text-stone-800">✅ Backup téléchargé.</p>
        </Card>
      ) : status.kind === "imported" ? (
        <Card className="mt-3 bg-basil-500/10 border-basil-500/30">
          <p className="text-sm text-stone-800">
            ✅ Import réussi : {status.summary.recipes} recette(s),{" "}
            {status.summary.templates} template(s) importé(s).
          </p>
        </Card>
      ) : status.kind === "error" ? (
        <Card className="mt-3 bg-red-50 border-red-200">
          <p className="text-sm text-red-800">{status.message}</p>
        </Card>
      ) : null}
    </>
  )
}
