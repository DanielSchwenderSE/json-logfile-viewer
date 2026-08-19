import type { LogFormat, ParseResult, RawRecord } from './types'

// Häufige Schlüssel, unter denen ein Log-Array in einem Wrapper-Objekt steckt.
const WRAPPER_KEYS = ['logs', 'entries', 'records', 'items', 'events', 'data', 'lines']

const MAX_SKIPPED_SAMPLES = 5

/**
 * Parst den Textinhalt einer Logdatei und erkennt das Format automatisch:
 *  - großes JSON-Array          [ {...}, {...} ]
 *  - Wrapper-Objekt             { "logs": [ ... ] }
 *  - JSON Lines (NDJSON)        ein Objekt je Zeile
 *  - gemischt / pretty-printed  mehrere JSON-Werte hintereinander, auch über
 *                               mehrere Zeilen, optional durch Kommata getrennt
 *
 * Nicht parsebare Fragmente werden übersprungen und gezählt, statt den ganzen
 * Vorgang abzubrechen.
 */
export function parseLogs(text: string): ParseResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return { entries: [], format: 'empty', fields: [], skipped: 0, skippedSamples: [] }
  }

  // 1) Versuch: die gesamte Datei als ein einziger JSON-Wert.
  const whole = tryParse(trimmed)
  if (whole.ok) {
    const value = whole.value
    if (Array.isArray(value)) {
      const entries = value.filter(isRecord)
      return finalize(entries, 'array', 0, [])
    }
    if (isRecord(value)) {
      // Wrapper-Objekt mit eingebettetem Log-Array?
      for (const key of WRAPPER_KEYS) {
        const inner = (value as RawRecord)[key]
        if (Array.isArray(inner)) {
          return finalize(inner.filter(isRecord), 'array', 0, [])
        }
      }
      // Einzelnes Objekt.
      return finalize([value], 'single', 0, [])
    }
  }

  // 2) Zeilenweise als JSON Lines.
  const jsonl = parseLines(trimmed)
  // Wenn zeilenweise nichts (oder kaum etwas) herauskommt, ist es vermutlich
  // pretty-printed / gemischt -> Streaming-Extraktor über den ganzen Text.
  if (jsonl.entries.length === 0 || jsonl.skipped > jsonl.entries.length) {
    const streamed = extractJsonValues(trimmed)
    if (streamed.entries.length >= jsonl.entries.length) {
      const format: LogFormat = streamed.entries.length > 1 ? 'mixed' : 'single'
      return finalize(streamed.entries, format, streamed.skipped, streamed.skippedSamples)
    }
  }
  return finalize(jsonl.entries, 'jsonl', jsonl.skipped, jsonl.skippedSamples)
}

function parseLines(text: string): {
  entries: RawRecord[]
  skipped: number
  skippedSamples: string[]
} {
  const entries: RawRecord[] = []
  const skippedSamples: string[] = []
  let skipped = 0
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    const t = line.trim().replace(/,\s*$/, '') // optionales trailing-Komma entfernen
    if (!t) continue
    const r = tryParse(t)
    if (r.ok) {
      pushValue(r.value, entries)
    } else {
      skipped++
      if (skippedSamples.length < MAX_SKIPPED_SAMPLES) skippedSamples.push(truncate(t))
    }
  }
  return { entries, skipped, skippedSamples }
}

/**
 * Extrahiert nacheinander alle Top-Level-JSON-Objekte aus einem Text – robust
 * gegenüber Zeilenumbrüchen, Einrückung und trennenden Kommata. Deckt gemischte
 * und pretty-printed Logs ab. Nicht-JSON-Inhalt wird zeilenweise übersprungen
 * (eine defekte Zeile zählt als ein übersprungenes Fragment).
 */
function extractJsonValues(text: string): {
  entries: RawRecord[]
  skipped: number
  skippedSamples: string[]
} {
  const entries: RawRecord[] = []
  const skippedSamples: string[] = []
  let skipped = 0
  let i = 0
  const n = text.length

  const skipLine = (from: number) => {
    const eol = indexOfLineEnd(text, from)
    const frag = text.slice(from, eol).trim()
    if (frag) {
      skipped++
      if (skippedSamples.length < MAX_SKIPPED_SAMPLES) skippedSamples.push(truncate(frag))
    }
    return eol
  }

  while (i < n) {
    // Whitespace, Kommata und äußere Array-Klammern überspringen.
    while (i < n && (isWhitespace(text[i]) || text[i] === ',' || text[i] === '[' || text[i] === ']')) {
      i++
    }
    if (i >= n) break

    // Log-Datensätze sind Objekte. Alles andere ist Nicht-Log-Inhalt und wird
    // zeilenweise übersprungen.
    if (text[i] !== '{') {
      i = skipLine(i)
      continue
    }

    const end = findValueEnd(text, i)
    if (end <= i) {
      // Unvollständiges/kaputtes Objekt – bis Zeilenende überspringen.
      i = skipLine(i)
      continue
    }

    const slice = text.slice(i, end)
    const r = tryParse(slice)
    if (r.ok) {
      pushValue(r.value, entries)
      i = end
    } else {
      i = skipLine(i)
    }
  }

  return { entries, skipped, skippedSamples }
}

/**
 * Findet das Ende des JSON-Werts, der bei `start` beginnt. Für Objekte/Arrays
 * wird die Klammertiefe unter Beachtung von Strings/Escapes gezählt; für
 * primitive Werte wird bis zum nächsten Trennzeichen gelesen.
 */
function findValueEnd(text: string, start: number): number {
  const c = text[start]
  if (c === '{' || c === '[') {
    let depth = 0
    let inStr = false
    let escaped = false
    for (let i = start; i < text.length; i++) {
      const ch = text[i]
      if (inStr) {
        if (escaped) escaped = false
        else if (ch === '\\') escaped = true
        else if (ch === '"') inStr = false
        continue
      }
      if (ch === '"') inStr = true
      else if (ch === '{' || ch === '[') depth++
      else if (ch === '}' || ch === ']') {
        depth--
        if (depth === 0) return i + 1
      }
    }
    return -1 // unvollständig
  }
  if (c === '"') {
    let escaped = false
    for (let i = start + 1; i < text.length; i++) {
      const ch = text[i]
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') return i + 1
    }
    return -1
  }
  // primitiver Wert (Zahl, true/false/null)
  let i = start
  while (i < text.length && !isWhitespace(text[i]) && text[i] !== ',' && text[i] !== '}' && text[i] !== ']') {
    i++
  }
  return i
}

function indexOfLineEnd(text: string, from: number): number {
  const nl = text.indexOf('\n', from)
  return nl === -1 ? text.length : nl
}

/** Nimmt einen geparsten Wert an; Arrays werden eine Ebene flachgeklopft. */
function pushValue(value: unknown, out: RawRecord[]): void {
  if (Array.isArray(value)) {
    for (const el of value) if (isRecord(el)) out.push(el)
  } else if (isRecord(value)) {
    out.push(value)
  }
}

function finalize(
  entries: RawRecord[],
  format: LogFormat,
  skipped: number,
  skippedSamples: string[],
): ParseResult {
  return { entries, format: entries.length === 0 ? 'empty' : format, fields: collectFields(entries), skipped, skippedSamples }
}

/** Sammelt Top-Level-Felder über alle Datensätze, sortiert nach Häufigkeit. */
function collectFields(entries: RawRecord[]): string[] {
  const counts = new Map<string, number>()
  const limit = Math.min(entries.length, 2000) // Stichprobe für große Dateien
  for (let i = 0; i < limit; i++) {
    for (const key of Object.keys(entries[i])) {
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k)
}

function tryParse(s: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(s) }
  } catch {
    return { ok: false }
  }
}

function isRecord(v: unknown): v is RawRecord {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isWhitespace(c: string): boolean {
  return c === ' ' || c === '\t' || c === '\n' || c === '\r'
}

function truncate(s: string, max = 200): string {
  const oneLine = s.replace(/\s+/g, ' ').trim()
  return oneLine.length > max ? oneLine.slice(0, max) + '…' : oneLine
}
