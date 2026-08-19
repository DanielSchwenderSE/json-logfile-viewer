import { useState } from 'react'

interface Props {
  value: unknown
  name?: string
  /** Anfangs aufgeklappt bis zu dieser Tiefe. */
  defaultOpen?: boolean
  depth?: number
}

function isCollapsible(v: unknown): v is object {
  return v !== null && typeof v === 'object'
}

/** Rekursive, auf-/zuklappbare JSON-Darstellung (Stacktraces, Kontextobjekte). */
export default function JsonTree({ value, name, defaultOpen = true, depth = 0 }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  if (!isCollapsible(value)) {
    return (
      <div className="flex gap-2 py-0.5">
        {name !== undefined && <span className="text-slate-500">{name}:</span>}
        <span className={valueClass(value)}>{formatPrimitive(value)}</span>
      </div>
    )
  }

  const entries = Array.isArray(value)
    ? value.map((v, i) => [String(i), v] as const)
    : Object.entries(value)
  const bracket = Array.isArray(value) ? ['[', ']'] : ['{', '}']

  return (
    <div style={{ marginLeft: depth === 0 ? 0 : 12 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 py-0.5 text-left hover:opacity-80"
      >
        <span className="w-3 text-slate-400">{open ? '▾' : '▸'}</span>
        {name !== undefined && <span className="text-slate-500">{name}:</span>}
        <span className="text-slate-400">
          {bracket[0]}
          {!open && ` … ${entries.length} `}
          {!open && bracket[1]}
        </span>
      </button>
      {open && (
        <div className="border-l border-slate-200 pl-2 dark:border-slate-700">
          {entries.map(([k, v]) => (
            <JsonTree key={k} name={k} value={v} depth={depth + 1} defaultOpen={depth < 1} />
          ))}
          <div className="text-slate-400">{bracket[1]}</div>
        </div>
      )}
    </div>
  )
}

function formatPrimitive(v: unknown): string {
  if (typeof v === 'string') return `"${v}"`
  return String(v)
}

function valueClass(v: unknown): string {
  if (typeof v === 'string') return 'text-emerald-600 dark:text-emerald-400 whitespace-pre-wrap break-words'
  if (typeof v === 'number') return 'text-blue-600 dark:text-blue-400'
  if (typeof v === 'boolean') return 'text-purple-600 dark:text-purple-400'
  return 'text-slate-400'
}
