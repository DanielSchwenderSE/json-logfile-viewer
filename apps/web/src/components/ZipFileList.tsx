import type { ZipLogFile } from '../lib/unzip'
import ZipFileTree from './ZipFileTree'

interface Props {
  zipName: string
  files: ZipLogFile[]
  onSelect: (file: ZipLogFile) => void
  onCancel: () => void
}

function humanSize(bytes: number): string {
  if (!bytes) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let n = bytes
  let u = 0
  while (n >= 1024 && u < units.length - 1) {
    n /= 1024
    u++
  }
  return `${n.toFixed(n < 10 && u > 0 ? 1 : 0)} ${units[u]}`
}

/** Auswahlliste der in einem ZIP-Paket enthaltenen Logdateien. */
export default function ZipFileList({ zipName, files, onSelect, onCancel }: Props) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-medium">Datei aus Paket wählen</h2>
            <p className="text-sm text-slate-500">📦 {zipName}</p>
          </div>
          <button
            onClick={onCancel}
            className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Abbrechen
          </button>
        </div>

        <div className="flex h-[28rem] flex-col">
          <ZipFileTree
            files={files}
            onSelect={onSelect}
            renderMeta={(f) => humanSize(f.size)}
            emptyMessage="Keine Logdateien im Paket gefunden (.json, .jsonl, .ndjson, .log, .txt, .xml)."
          />
        </div>
      </div>
    </div>
  )
}
