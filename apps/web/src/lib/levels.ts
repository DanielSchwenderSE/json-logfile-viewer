import type { LevelKey } from './types'

// Textuelle Level-Bezeichnungen -> normalisierte Kategorie.
const TEXT_MAP: Record<string, LevelKey> = {
  emerg: 'error', emergency: 'error', alert: 'error', crit: 'error', critical: 'error',
  fatal: 'error', error: 'error', err: 'error', severe: 'error',
  warn: 'warn', warning: 'warn',
  notice: 'info', info: 'info', information: 'info', informational: 'info', log: 'info',
  debug: 'debug', dbg: 'debug', fine: 'debug',
  trace: 'trace', verbose: 'trace', silly: 'trace', finest: 'trace',
}

/**
 * Normalisiert einen beliebigen Level-Wert (Text oder Zahl) auf eine Kategorie.
 * Numerische Level werden nach dem Bunyan-Schema interpretiert (10=trace …
 * 60=fatal), das die meisten JSON-Logger verwenden; Syslog-Severity (0–7) wird
 * ebenfalls sinnvoll zugeordnet.
 */
export function normalizeLevel(value: unknown): LevelKey {
  if (value == null) return 'other'
  if (typeof value === 'number') return numericLevel(value)
  const s = String(value).trim().toLowerCase()
  if (s === '') return 'other'
  if (s in TEXT_MAP) return TEXT_MAP[s]
  // rein numerischer String?
  if (/^\d+$/.test(s)) return numericLevel(Number(s))
  return 'other'
}

function numericLevel(n: number): LevelKey {
  // Bunyan: 10 trace, 20 debug, 30 info, 40 warn, 50 error, 60 fatal
  if (n >= 55) return 'error'
  if (n >= 45) return 'error'
  if (n >= 35) return 'warn'
  if (n >= 25) return 'info'
  if (n >= 15) return 'debug'
  if (n >= 10) return 'trace'
  // Syslog-Severity: 0 emerg … 3 error, 4 warn, 5/6 info, 7 debug
  if (n <= 3) return 'error'
  if (n === 4) return 'warn'
  if (n === 5 || n === 6) return 'info'
  return 'debug'
}

/** Reihenfolge der Level für Filter-Chips. */
export const LEVEL_ORDER: LevelKey[] = ['error', 'warn', 'info', 'debug', 'trace', 'other']

/** Tailwind-Klassen je Level (Chip/Badge) – hell- und dunkeltauglich. */
export const LEVEL_BADGE: Record<LevelKey, string> = {
  error: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  warn: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  info: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  debug: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30',
  trace: 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30',
  other: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20',
}

/** Linker Farbbalken je Zeile nach Level. */
export const LEVEL_BAR: Record<LevelKey, string> = {
  error: 'border-l-red-500',
  warn: 'border-l-amber-500',
  info: 'border-l-blue-500',
  debug: 'border-l-violet-500',
  trace: 'border-l-gray-400',
  other: 'border-l-transparent',
}

export const LEVEL_LABEL: Record<LevelKey, string> = {
  error: 'Error', warn: 'Warn', info: 'Info', debug: 'Debug', trace: 'Trace', other: 'Andere',
}
