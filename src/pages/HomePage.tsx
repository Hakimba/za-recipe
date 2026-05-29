import { Link } from "@tanstack/react-router"
import { Card, PageHeader } from "../ui/primitives.tsx"

type Tile = { to: string; emoji: string; title: string; desc: string }

const tiles: ReadonlyArray<Tile> = [
  {
    to: "/generate",
    emoji: "🍕",
    title: "Générer une recette",
    desc: "Depuis un template, avec preferment auto",
  },
  {
    to: "/direct",
    emoji: "✍️",
    title: "Saisie directe",
    desc: "Entrer une recette en grammes",
  },
  {
    to: "/templates",
    emoji: "📐",
    title: "Templates de recette",
    desc: "Via baker's percentages",
  },
  {
    to: "/library",
    emoji: "📚",
    title: "Bibliothèque",
    desc: "Recettes sauvegardées, favoris, notes",
  },
  {
    to: "/docs",
    emoji: "📖",
    title: "Documentation",
    desc: "Méthodes de calcul utilisées",
  },
  {
    to: "/backup",
    emoji: "💾",
    title: "Sauvegarde",
    desc: "Export / import JSON de tes données",
  },
]

export const HomePage = (): JSX.Element => (
  <>
    <PageHeader title="Za recipe" subtitle="Compagnon de recettes pizza" />
    <div className="grid grid-cols-1 gap-3">
      {tiles.map((t) => (
        <Link key={t.to} to={t.to} className="block">
          <Card className="flex items-center gap-4 active:bg-dough-100 transition">
            <span className="text-3xl">{t.emoji}</span>
            <div className="min-w-0">
              <h2 className="font-semibold text-stone-800">{t.title}</h2>
              <p className="text-sm text-stone-600">{t.desc}</p>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  </>
)
