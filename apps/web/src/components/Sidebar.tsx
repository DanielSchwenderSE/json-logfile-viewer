import { useAppStore } from '../store'
import type { OpenZip } from '../lib/types'
import ZipFileTree from './ZipFileTree'

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
    <div className="flex min-h-0 w-64 flex-col border-r border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="sticky top-0 shrink-0 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-800">
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

      <ZipFileTree
        files={openZip.files}
        onSelect={(f) => onSelectZipFile(f.path, f.name)}
        renderMeta={(f) => `${f.size ? `${(f.size / 1024).toFixed(1)} KB` : '—'} · ${formatDate(f.modDate)}`}
        emptyMessage="Keine Dateien"
      />
    </div>
  )
}
