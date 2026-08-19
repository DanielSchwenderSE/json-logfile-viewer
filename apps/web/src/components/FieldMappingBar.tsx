import type { FieldMapping, LogFormat } from '../lib/types'

interface Props {
  fields: string[]
  mapping: FieldMapping
  onChange: (mapping: FieldMapping) => void
  format: LogFormat
  total: number
  shown: number
  skipped: number
}

const FORMAT_LABEL: Record<LogFormat, string> = {
  array: 'JSON-Array',
  jsonl: 'JSON Lines',
  mixed: 'gemischt',
  single: 'Einzelobjekt',
  lines: 'Zeilen-Log',
  xml: 'XML',
  empty: 'leer',
}

function Select({
  label,
  value,
  fields,
  onChange,
}: {
  label: string
  value: string | null
  fields: string[]
  onChange: (v: string | null) => void
}) {
  return (
    <label className="flex items-center gap-1 text-xs text-slate-500">
      {label}
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="rounded-md border border-slate-300 bg-transparent px-1.5 py-1 text-xs text-slate-800 dark:border-slate-700 dark:text-slate-100"
      >
        <option value="">– keins –</option>
        {fields.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Zeigt Format/Statistik und erlaubt manuelles Feld-Mapping. */
export default function FieldMappingBar({
  fields,
  mapping,
  onChange,
  format,
  total,
  shown,
  skipped,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 bg-slate-100/60 px-4 py-2 text-xs dark:border-slate-800 dark:bg-slate-900/60">
      <span className="text-slate-500">
        Format: <span className="font-medium text-slate-700 dark:text-slate-300">{FORMAT_LABEL[format]}</span>
      </span>
      <span className="text-slate-500">
        {shown.toLocaleString('de-DE')} / {total.toLocaleString('de-DE')} Einträge
      </span>
      {skipped > 0 && (
        <span
          className="text-amber-600 dark:text-amber-400"
          title="Nicht parsebare Fragmente wurden übersprungen."
        >
          ⚠ {skipped.toLocaleString('de-DE')} übersprungen
        </span>
      )}

      <div className="ml-auto flex flex-wrap items-center gap-3">
        <span className="text-slate-400">Feld-Zuordnung:</span>
        <Select label="Zeit" value={mapping.timestamp} fields={fields} onChange={(v) => onChange({ ...mapping, timestamp: v })} />
        <Select label="Level" value={mapping.level} fields={fields} onChange={(v) => onChange({ ...mapping, level: v })} />
        <Select label="Nachricht" value={mapping.message} fields={fields} onChange={(v) => onChange({ ...mapping, message: v })} />
      </div>
    </div>
  )
}
