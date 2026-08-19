import { useAppStore } from '../store'
import type { OpenZip } from '../lib/types'

interface Props {
  openZip: OpenZip | null
  onSelectZipFile: (path: string, name: string) => void
}

function formatDate(ms: number | null): string {
  if (!ms) return '—'
  return new Date(ms).toLocaleDateString('de-DE', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Linke Sidebar: zeigt ZIP-Struktur (wenn ZIP offen) oder kompakte Info.
 */
export default function Sidebar({ openZip, onSelectZipFile }: Props) {
  const { setOpenZip } = useAppStore()

  if (!openZip) {
    return (
      <div className="hidden w-64 shrink-0 border-r border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 md:block">
        —
      </div>
    )
  }

  return (
    <div className="w-64 border-r border-slate-200 bg-slate-50 overflow-auto dark:border-slate-800 dark:bg-slate-900/50">
      <div className="sticky top-0 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-800">
        <div className="flex items-center justify-between gap-2">
          <span className="mono truncate text-xs font-medium" title={openZip.name}>
            {openZip.name}
          </span>
          <button
            onClick={() => setOpenZip(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            title="ZIP schließen"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {openZip.files.map((file) => (
          <button
            key={file.path}
            onClick={() => onSelectZipFile(file.path, file.name)}
            className="w-full px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-slate-800 transition"
          >
            <div className="mono truncate text-xs font-medium text-slate-700 dark:text-slate-300">
              {file.name}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {file.size ? `${(file.size / 1024).toFixed(1)} KB` : '—'} · {formatDate(file.modDate)}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
