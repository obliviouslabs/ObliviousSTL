import 'katex/dist/katex.min.css'

import Markdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'

export function MathFormula({ formula }: { formula: string }) {
  return (
    <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
      {formula}
    </Markdown>
  )
}