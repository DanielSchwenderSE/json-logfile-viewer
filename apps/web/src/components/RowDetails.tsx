import { useState } from 'react'
import type { RawRecord } from '../lib/types'
import JsonTree from './JsonTree'

interface Props {
  raw: RawRecord
}

/** Aufgeklappte Detailansicht eines Log-Eintrags mit Kopierfunktion. */
export default function RowDetails({ raw }: Props) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(raw, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      /* Clipboard evtl. nicht verfügbar – still ignorieren */
    }
  }

  return (
    <div className="bg-slate-50 px-4 py-3 dark:bg-slate-900/50">
      <div className="mb-2 flex justify-end">
        <button
          onClick={copy}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          {copied ? '✓ Kopiert' : 'JSON kopieren'}
        </button>
      </div>
      <div className="mono max-h-96 overflow-auto text-xs leading-relaxed">
        <JsonTree value={raw} />
      </div>
    </div>
  )
}
