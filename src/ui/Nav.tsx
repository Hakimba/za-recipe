import { Link, useRouterState } from "@tanstack/react-router"
import type { ReactNode } from "react"

type NavItem = { to: string; label: string; icon: ReactNode }

const navItems: ReadonlyArray<NavItem> = [
  { to: "/", label: "Accueil", icon: "🏠" },
  { to: "/generate", label: "Générer", icon: "🍕" },
  { to: "/library", label: "Recettes", icon: "📚" },
  { to: "/templates", label: "Templates", icon: "📐" },
  { to: "/docs", label: "Doc", icon: "📖" },
]

export const BottomNav = (): JSX.Element => {
  const location = useRouterState({ select: (s) => s.location.pathname })
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-dough-300 z-10 pb-[env(safe-area-inset-bottom)]">
      <ul className="flex justify-around max-w-screen-sm mx-auto">
        {navItems.map((item) => {
          const active =
            item.to === "/" ? location === "/" : location.startsWith(item.to)
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium ${
                  active ? "text-tomato-700" : "text-stone-500"
                }`}
              >
                <span className="text-xl leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
