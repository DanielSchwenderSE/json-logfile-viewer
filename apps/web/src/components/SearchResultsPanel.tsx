import type { Row } from '../lib/rows'

interface Props {
  query: string
  results: Row[]
  onSelectResult: (rowId: number) => void
}

/**
 * Panel unten: zeigt Such-Treffer als Liste.
 * Bei Klick auf einen Treffer: Viewer scrollt zu der Zeile und hebt sie hervor.
 */
export default function SearchResultsPanel({ query, results, onSelectResult }: Props) {
  if (!query) return null

  // Immer anzeigen, auch wenn keine Treffer
  return (
    <div className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-800">
        <span className="font-medium">Suchergebnisse</span>
        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
          {results.length}
        </span>
      </div>

      {results.length === 0 ? (
        <div className="px-3 py-2 text-xs text-slate-500">Keine Treffer</div>
      ) : (
        <div className="max-h-40 overflow-auto">
          {results.map((row, idx) => (
            <button
              key={row.id}
              onClick={() => onSelectResult(row.id)}
              className="flex w-full items-start gap-2 border-b border-slate-100 px-3 py-1.5 text-left hover:bg-blue-100 dark:border-slate-800 dark:hover:bg-blue-900/20 transition"
            >
              <span className="shrink-0 text-xs text-slate-400">#{idx + 1}</span>
              <span className="truncate text-xs text-slate-600 dark:text-slate-400">
                {row.message}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
