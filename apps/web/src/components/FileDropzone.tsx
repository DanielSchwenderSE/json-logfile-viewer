import { useRef, useState } from 'react'

interface Props {
  onFile: (file: File) => void
  compact?: boolean
}

const ACCEPT = '.json,.jsonl,.ndjson,.log,.txt,.xml,.zip'

/** Drag-&-Drop-Fläche bzw. kompakter Button zum Laden einer Datei. */
export default function FileDropzone({ onFile, compact }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  function pick(files: FileList | null) {
    if (files && files.length > 0) onFile(files[0])
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPT}
      className="hidden"
      onChange={(e) => pick(e.target.files)}
    />
  )

  if (compact) {
    return (
      <>
        {input}
        <button
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Datei öffnen …
        </button>
      </>
    )
  }

  return (
    <div className="flex h-full items-center justify-center p-6">
      {input}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          pick(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={
          'flex w-full max-w-xl cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-12 text-center transition ' +
          (drag
            ? 'border-blue-500 bg-blue-500/5'
            : 'border-slate-300 hover:border-blue-400 dark:border-slate-700')
        }
      >
        <div className="text-4xl">🗂️</div>
        <div className="text-lg font-medium">Logdatei hierher ziehen</div>
        <div className="text-sm text-slate-500">
          oder klicken zum Auswählen · JSON, JSON Lines, .log und .zip-Pakete
        </div>
        <div className="text-xs text-slate-400">
          Die Datei wird lokal im Browser verarbeitet – kein Upload.
        </div>
      </div>
    </div>
  )
}
