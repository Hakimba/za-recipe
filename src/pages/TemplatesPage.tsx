import { Link } from "@tanstack/react-router"
import { Effect, Option } from "effect"
import type { TemplateYeast } from "../domain/Yeast.ts"
import { TemplateRepository } from "../persistence/TemplateRepository.ts"
import { Button, Card, PageHeader } from "../ui/primitives.tsx"
import { useEffectQuery } from "../ui/hooks.ts"

export const TemplatesPage = (): JSX.Element => {
  const { state } = useEffectQuery(
    () => Effect.flatMap(TemplateRepository, (repo) => repo.list),
    [],
  )

  return (
    <>
      <PageHeader
        title="Templates"
        subtitle="Baker's percentages réutilisables"
        action={
          <Link to="/templates/new">
            <Button>+ Nouveau</Button>
          </Link>
        }
      />

      {state.status === "loading" ? (
        <p className="text-stone-500">Chargement…</p>
      ) : state.status === "error" ? (
        <Card className="bg-red-50 border-red-200">
          <p className="text-red-800">Erreur de chargement.</p>
        </Card>
      ) : state.data.length === 0 ? (
        <Card>
          <p className="text-stone-600">
            Aucun template pour l'instant. Crée-en un pour générer rapidement
            des recettes (ex: Napoletana 60% hydratation).
          </p>
        </Card>
      ) : (
        <ul className="grid gap-2">
          {state.data.map((t) => (
            <li key={t.id}>
              <Link to="/templates/$id" params={{ id: t.id }}>
                <Card className="active:bg-dough-100">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-stone-800">{t.name}</h2>
                      <p className="text-sm text-stone-600">
                        {t.hydrationPct}% hydratation · {yeastSummary(t.yeast)}
                        {Option.match(t.saltPct, {
                          onNone: () => null,
                          onSome: (s) => ` · ${s}% sel`,
                        })}
                      </p>
                    </div>
                    <span className="text-stone-400">›</span>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

const labelYeast = (t: "fresh" | "active-dry" | "instant-dry"): string =>
  t === "fresh" ? "fraîche" : t === "active-dry" ? "sèche active" : "sèche instantanée"

const yeastSummary = (y: TemplateYeast): string =>
  y._tag === "Manual"
    ? `${y.pct}% levure (${labelYeast(y.type)})`
    : `protocole · ${y.phases.length} phase(s) (${labelYeast(y.type)})`
