import "katex/dist/katex.min.css"
import ReactMarkdown from "react-markdown"
import rehypeKatex from "rehype-katex"
import remarkMath from "remark-math"
import methodsMarkdown from "../docs/methods.md?raw"
import { PageHeader } from "../ui/primitives.tsx"

export const DocsPage = (): JSX.Element => (
  <>
    <PageHeader title="Documentation" subtitle="Méthodes de calcul utilisées" />
    <article className="prose-pizza">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {methodsMarkdown}
      </ReactMarkdown>
    </article>
  </>
)
