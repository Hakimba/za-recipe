import "katex/dist/katex.min.css"
import ReactMarkdown from "react-markdown"
import rehypeKatex from "rehype-katex"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import methodsMarkdown from "../docs/methods.md?raw"
import { PageHeader } from "../ui/primitives.tsx"

const tableHref = `${import.meta.env.BASE_URL}bareme_fermentation_etendu_corrige.xlsx`

export const DocsPage = (): JSX.Element => (
  <>
    <PageHeader title="Documentation" subtitle="Méthodes de calcul utilisées" />
    <article className="prose-pizza">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {methodsMarkdown}
      </ReactMarkdown>
    </article>
    <a
      href={tableHref}
      download
      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-dough-100 border border-dough-300 px-4 py-2.5 text-sm font-medium text-stone-800 active:scale-[0.98]"
    >
      ⬇ Télécharger la table de fermentation (.xlsx)
    </a>
  </>
)
