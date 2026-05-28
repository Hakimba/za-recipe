import { RouterProvider } from "@tanstack/react-router"
import { router } from "./router.tsx"

export const App = (): JSX.Element => <RouterProvider router={router} />
