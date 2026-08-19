import type { FieldMapping, RawRecord } from './types'
import { parseTimestamp } from './time'
import { normalizeLevel } from './levels'

// Kandidaten-Feldnamen (klein geschrieben), nach Priorität.
const TIME_NAMES = ['timestamp', 'time', '@t', 'ts', 'datetime', 'date', 'eventtime', 'event_time', '_time', 'occurred', 'created', 'createdat', 'logtime']
const LEVEL_NAMES = ['level', 'severity', 'lvl', 'loglevel', 'log_level', '@l', 'levelname', 'level_name', 'priority', 'loglevelname']
const MESSAGE_NAMES = ['message', 'msg', '@m', 'text', 'description', 'body', 'event', 'summary', 'renderedmessage', 'messagetemplate']

/**
 * Errät die wichtigsten Felder anhand von Namen und Stichprobenwerten.
 * Zuerst wird nach bekannten Namen gesucht; bei mehreren Treffern gewinnt der
 * mit plausiblen Werten (parsebares Datum bzw. bekanntes Level).
 */
export function autoDetectMapping(fields: string[], entries: RawRecord[]): FieldMapping {
  const sample = entries.slice(0, 50)
  return {
    timestamp: pickField(fields, sample, TIME_NAMES, (v) => parseTimestamp(v) != null),
    level: pickField(fields, sample, LEVEL_NAMES, (v) => normalizeLevel(v) !== 'other'),
    message: pickField(fields, sample, MESSAGE_NAMES, (v) => typeof v === 'string' && v.length > 0),
  }
}

function pickField(
  fields: string[],
  sample: RawRecord[],
  names: string[],
  isPlausible: (value: unknown) => boolean,
): string | null {
  // Nach Namen passende Felder (in Reihenfolge der Kandidatenliste).
  const named = fields
    .filter((f) => names.includes(f.toLowerCase()))
    .sort((a, b) => names.indexOf(a.toLowerCase()) - names.indexOf(b.toLowerCase()))

  // Erstes Namensfeld mit plausiblen Werten bevorzugen.
  for (const f of named) {
    if (fractionPlausible(sample, f, isPlausible) >= 0.5) return f
  }
  if (named.length > 0) return named[0]

  // Kein Namenstreffer: Feld mit dem höchsten Plausibilitätsanteil suchen.
  let best: string | null = null
  let bestScore = 0
  for (const f of fields) {
    const score = fractionPlausible(sample, f, isPlausible)
    if (score > bestScore && score >= 0.6) {
      bestScore = score
      best = f
    }
  }
  return best
}

function fractionPlausible(
  sample: RawRecord[],
  field: string,
  isPlausible: (value: unknown) => boolean,
): number {
  let present = 0
  let ok = 0
  for (const r of sample) {
    if (field in r && r[field] != null) {
      present++
      if (isPlausible(r[field])) ok++
    }
  }
  return present === 0 ? 0 : ok / present
}
