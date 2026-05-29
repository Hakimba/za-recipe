import { useNavigate, useParams } from "@tanstack/react-router"
import { Effect, Exit, Option } from "effect"
import { useEffect, useState } from "react"
import { Either } from "effect"
import type { PositivePercentage, TemplateId } from "../domain/Brands.ts"
import type { Template, TemplateExtra } from "../domain/Template.ts"
import { makeTemplateId, nowIso } from "../persistence/Id.ts"
import { TemplateRepository } from "../persistence/TemplateRepository.ts"
import {
  Button,
  Card,
  FormField,
  NumberInput,
  PageHeader,
  TextInput,
} from "../ui/primitives.tsx"
import {
  draftToTemplateYeast,
  emptyManualDraft,
  FermentationProtocolEditor,
  templateYeastToDraft,
  type YeastDraft,
} from "../ui/FermentationProtocolEditor.tsx"
import { useEffectQuery } from "../ui/hooks.ts"
import { runPromiseExit } from "../runtime/Runtime.ts"

type FormState = {
  name: string
  hydrationPct: number | ""
  yeast: YeastDraft
  saltPct: number | ""
  sugarPct: number | ""
  oliveOilPct: number | ""
  extras: ReadonlyArray<{ name: string; pct: number | "" }>
}

const empty: FormState = {
  name: "",
  hydrationPct: 60,
  yeast: emptyManualDraft("fresh", 0.3),
  saltPct: 2.5,
  sugarPct: "",
  oliveOilPct: "",
  extras: [],
}

const fromTemplate = (t: Template): FormState => ({
  name: t.name,
  hydrationPct: t.hydrationPct,
  yeast: templateYeastToDraft(t.yeast),
  saltPct: Option.getOrElse(t.saltPct, () => "" as const) as number | "",
  sugarPct: Option.getOrElse(t.sugarPct, () => "" as const) as number | "",
  oliveOilPct: Option.getOrElse(t.oliveOilPct, () => "" as const) as number | "",
  extras: t.extras.map((e) => ({ name: e.name, pct: e.pct as number })),
})

const optPositive = (v: number | ""): Option.Option<PositivePercentage> =>
  v === "" || v <= 0 ? Option.none() : Option.some(v as PositivePercentage)

export const TemplateEditPage = (): JSX.Element => {
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { id?: string }
  const isNew = params.id === undefined

  const { state: existing } = useEffectQuery(
    () =>
      isNew
        ? Effect.succeed(Option.none<Template>())
        : Effect.flatMap(TemplateRepository, (r) => r.get(params.id as TemplateId)),
    [params.id],
  )

  const [form, setForm] = useState<FormState>(empty)
  const [error, setError] = useState<string>("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (existing.status === "ready" && Option.isSome(existing.data)) {
      setForm(fromTemplate(existing.data.value))
    }
  }, [existing])

  const onSave = async (): Promise<void> => {
    setError("")
    if (form.name.trim() === "") {
      setError("Le nom est requis")
      return
    }
    if (form.hydrationPct === "") {
      setError("L'hydratation est requise")
      return
    }
    const yeastResult = draftToTemplateYeast(form.yeast)
    if (Either.isLeft(yeastResult)) {
      setError(yeastResult.left)
      return
    }
    const yeast = yeastResult.right
    setSaving(true)
    const exit = await runPromiseExit(
      Effect.gen(function* () {
        const repo = yield* TemplateRepository
        const now = (yield* nowIso) as Template["createdAt"]
        const baseId =
          existing.status === "ready" && Option.isSome(existing.data)
            ? existing.data.value.id
            : yield* makeTemplateId
        const previous =
          existing.status === "ready" && Option.isSome(existing.data)
            ? existing.data.value.createdAt
            : now
        const template: Template = {
          id: baseId,
          name: form.name.trim(),
          hydrationPct: form.hydrationPct as PositivePercentage,
          yeast,
          saltPct: optPositive(form.saltPct),
          sugarPct: optPositive(form.sugarPct),
          oliveOilPct: optPositive(form.oliveOilPct),
          extras: form.extras
            .filter((e) => e.name.trim() !== "" && e.pct !== "" && e.pct > 0)
            .map(
              (e): TemplateExtra => ({
                name: e.name.trim(),
                pct: e.pct as PositivePercentage,
              }),
            ),
          createdAt: previous,
          updatedAt: now,
        }
        yield* repo.save(template)
      }),
    )
    setSaving(false)
    if (Exit.isSuccess(exit)) {
      navigate({ to: "/templates" })
    } else {
      setError("Échec d'enregistrement")
    }
  }

  const onDelete = async (): Promise<void> => {
    if (existing.status !== "ready" || Option.isNone(existing.data)) return
    const id = existing.data.value.id
    setSaving(true)
    const exit = await runPromiseExit(
      Effect.flatMap(TemplateRepository, (r) => r.delete(id)),
    )
    setSaving(false)
    if (Exit.isSuccess(exit)) navigate({ to: "/templates" })
  }

  return (
    <>
      <PageHeader title={isNew ? "Nouveau template" : "Modifier le template"} />

      <Card className="flex flex-col gap-4">
        <FormField label="Nom">
          <TextInput
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Napoletana, NY style…"
          />
        </FormField>

        <FormField label="Hydratation (%)">
          <NumberInput
            value={form.hydrationPct}
            onChange={(v) => setForm({ ...form, hydrationPct: v })}
            step={0.5}
            min={1}
            max={150}
          />
        </FormField>

        <FermentationProtocolEditor
          draft={form.yeast}
          onChange={(yeast) => setForm({ ...form, yeast })}
          manualKind="pct"
        />

        <FormField label="Sel (%) — optionnel">
          <NumberInput
            value={form.saltPct}
            onChange={(v) => setForm({ ...form, saltPct: v })}
            step={0.1}
            min={0}
          />
        </FormField>

        <FormField label="Sucre (%) — optionnel">
          <NumberInput
            value={form.sugarPct}
            onChange={(v) => setForm({ ...form, sugarPct: v })}
            step={0.1}
            min={0}
          />
        </FormField>

        <FormField label="Huile d'olive (%) — optionnel">
          <NumberInput
            value={form.oliveOilPct}
            onChange={(v) => setForm({ ...form, oliveOilPct: v })}
            step={0.1}
            min={0}
          />
        </FormField>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-stone-700 text-sm">Ingrédients personnalisés</span>
            <Button
              variant="secondary"
              onClick={() =>
                setForm({ ...form, extras: [...form.extras, { name: "", pct: "" }] })
              }
            >
              + Ajouter
            </Button>
          </div>
          {form.extras.length === 0 ? (
            <p className="text-xs text-stone-500">Aucun. Ex: malt, semoule…</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {form.extras.map((e, i) => (
                <li key={i} className="flex gap-2 items-center">
                  <TextInput
                    value={e.name}
                    onChange={(ev) => {
                      const next = [...form.extras]
                      next[i] = { ...next[i]!, name: ev.target.value }
                      setForm({ ...form, extras: next })
                    }}
                    placeholder="Nom"
                  />
                  <NumberInput
                    value={e.pct}
                    onChange={(v) => {
                      const next = [...form.extras]
                      next[i] = { ...next[i]!, pct: v }
                      setForm({ ...form, extras: next })
                    }}
                    step={0.1}
                    min={0}
                    placeholder="%"
                  />
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setForm({
                        ...form,
                        extras: form.extras.filter((_, idx) => idx !== i),
                      })
                    }
                  >
                    ✕
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error !== "" ? (
          <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        ) : null}

        <div className="flex gap-2">
          <Button onClick={onSave} disabled={saving} className="flex-1">
            {saving ? "…" : "Enregistrer"}
          </Button>
          {!isNew ? (
            <Button variant="danger" onClick={onDelete} disabled={saving}>
              Supprimer
            </Button>
          ) : null}
        </div>
      </Card>
    </>
  )
}
