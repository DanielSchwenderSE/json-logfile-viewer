import type { FieldMapping, LevelKey, RawRecord } from './types'
import { normalizeLevel } from './levels'
import { parseTimestamp } from './time'

/** Aufbereitete Zeile für Anzeige und Filterung. */
export interface Row {
  id: number
  raw: RawRecord
  levelKey: LevelKey
  levelRaw: unknown
  tsMs: number | null
  message: string
  /** Kleingeschriebener, durchsuchbarer Text aller Felder. */
  blob: string
}

function toMessage(raw: RawRecord, field: string | null): string {
  if (field && field in raw) {
    const v = raw[field]
    if (typeof v === 'string') return v
    if (v != null) return typeof v === 'object' ? JSON.stringify(v) : String(v)
  }
  // Fallback: kompakte JSON-Darstellung, damit die Spalte nie leer ist.
  return JSON.stringify(raw)
}

/** Baut aus den geparsten Datensätzen anzeigefertige Zeilen. */
export function buildRows(entries: RawRecord[], mapping: FieldMapping): Row[] {
  const rows: Row[] = new Array(entries.length)
  for (let i = 0; i < entries.length; i++) {
    const raw = entries[i]
    const levelRaw = mapping.level ? raw[mapping.level] : undefined
    const tsRaw = mapping.timestamp ? raw[mapping.timestamp] : undefined
    rows[i] = {
      id: i,
      raw,
      levelRaw,
      levelKey: normalizeLevel(levelRaw),
      tsMs: parseTimestamp(tsRaw),
      message: toMessage(raw, mapping.message),
      blob: JSON.stringify(raw).toLowerCase(),
    }
  }
  return rows
}
