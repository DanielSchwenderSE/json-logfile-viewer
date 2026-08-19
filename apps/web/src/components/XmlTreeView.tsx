import type { RawRecord } from '../lib/types'
import JsonTree from './JsonTree'

interface Props {
  entry: RawRecord
}

/** XML-Baum-Ansicht mit erweiterbarem JsonTree. */
export default function XmlTreeView({ entry }: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50 dark:bg-slate-900/50">
      <div className="overflow-auto p-4 text-sm">
        <JsonTree value={entry} defaultOpen={true} />
      </div>
    </div>
  )
}
