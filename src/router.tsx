import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router"
import { lazy, Suspense } from "react"
import { BottomNav } from "./ui/Nav.tsx"
import { HomePage } from "./pages/HomePage.tsx"
import { DirectEntryPage } from "./pages/DirectEntryPage.tsx"
import { TemplatesPage } from "./pages/TemplatesPage.tsx"
import { TemplateEditPage } from "./pages/TemplateEditPage.tsx"
import { GeneratePage } from "./pages/GeneratePage.tsx"
import { LibraryPage } from "./pages/LibraryPage.tsx"
import { RecipeDetailPage } from "./pages/RecipeDetailPage.tsx"
import { BackupPage } from "./pages/BackupPage.tsx"

const DocsPageLazy = lazy(() =>
  import("./pages/DocsPage.tsx").then((m) => ({ default: m.DocsPage })),
)

const DocsRoute = (): JSX.Element => (
  <Suspense fallback={<p className="text-stone-500">Chargement de la documentation…</p>}>
    <DocsPageLazy />
  </Suspense>
)

const rootRoute = createRootRoute({
  component: () => (
    <>
      <div className="min-h-dvh pb-20 max-w-screen-sm mx-auto px-4 pt-4">
        <Outlet />
      </div>
      <BottomNav />
    </>
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
})

const directRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/direct",
  component: DirectEntryPage,
})

const templatesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/templates",
  component: TemplatesPage,
})

const templateNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/templates/new",
  component: TemplateEditPage,
})

const templateEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/templates/$id",
  component: TemplateEditPage,
})

const generateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/generate",
  component: GeneratePage,
})

const libraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/library",
  component: LibraryPage,
})

const recipeDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/library/$id",
  component: RecipeDetailPage,
})

const docsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/docs",
  component: DocsRoute,
})

const backupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/backup",
  component: BackupPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  directRoute,
  templatesRoute,
  templateNewRoute,
  templateEditRoute,
  generateRoute,
  libraryRoute,
  recipeDetailRoute,
  docsRoute,
  backupRoute,
])

export const router = createRouter({
  routeTree,
  basepath: import.meta.env.BASE_URL,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
