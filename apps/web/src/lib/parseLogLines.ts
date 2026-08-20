import type { ParseResult, RawRecord } from './types'

const MAX_SKIPPED_SAMPLES = 5

interface LogLinePattern {
  name: string
  regex: RegExp
  extract: (match: RegExpMatchArray) => { timestamp: string; level: string; logger?: string; message: string }
}

const PATTERNS: LogLinePattern[] = [
  // Format A: YY.MM.DD HH:MM:SS LEVEL  Logger - message
  {
    name: 'A',
    regex: /^(\d{2}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2})\s+([A-Z]+)\s+(.+?)\s-\s(.*)$/,
    extract: (m) => ({
      timestamp: m[1],
      level: m[2],
      logger: m[3],
      message: m[4],
    }),
  },
  // Format B: YYYY-MM-DD HH:MM:ss,fff [threadId] LEVEL Logger - message
  {
    name: 'B',
    regex: /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3})\s+\[(\d+)\]\s+([A-Z]+)\s+(.+?)\s-\s(.*)$/,
    extract: (m) => ({
      timestamp: m[1],
      level: m[3],
      logger: `[${m[2]}] ${m[4]}`,
      message: m[5],
    }),
  },
  // Format C: LEVEL YYYY-MM-DD HH:MM:ss,fff [threadId] [ClassName] : message
  {
    name: 'C',
    regex: /^([A-Z]+)\s+(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3})\s+\[(\d+)\]\s+\[(.+?)\]\s+:\s(.*)$/,
    extract: (m) => ({
      timestamp: m[2],
      level: m[1],
      logger: `[${m[3]}] ${m[4]}`,
      message: m[5],
    }),
  },
]

interface DetectionResult {
  pattern: LogLinePattern | null
  confidence: number
}

const MAX_DETECTION_SAMPLE = 300

/**
 * Wählt bis zu `MAX_DETECTION_SAMPLE` nicht-leere Zeilen gleichmäßig über die ganze Datei
 * verteilt aus. Ein rein sequenzieller Sample vom Dateianfang wäre anfällig für lokale
 * Cluster aus mehrzeiligem Freitext (z. B. ein langer Report ohne eigene Zeitstempel direkt
 * am Anfang), die die Erkennung fälschlich scheitern lassen, obwohl das Format über die
 * gesamte Datei hinweg klar erkennbar ist.
 */
function sampleLines(lines: string[]): string[] {
  const nonBlank = lines.map((l) => l.trim()).filter((l) => l !== '')
  if (nonBlank.length <= MAX_DETECTION_SAMPLE) return nonBlank

  const step = nonBlank.length / MAX_DETECTION_SAMPLE
  const sample: string[] = []
  for (let i = 0; i < MAX_DETECTION_SAMPLE; i++) {
    sample.push(nonBlank[Math.floor(i * step)])
  }
  return sample
}

function detectPattern(lines: string[]): DetectionResult {
  if (lines.length === 0) return { pattern: null, confidence: 0 }

  const sample = sampleLines(lines)
  if (sample.length === 0) return { pattern: null, confidence: 0 }

  const hits: Record<string, number> = {}
  for (const line of sample) {
    for (const p of PATTERNS) {
      if (p.regex.test(line)) {
        hits[p.name] = (hits[p.name] ?? 0) + 1
      }
    }
  }

  const sorted = Object.entries(hits).sort((a, b) => b[1] - a[1])
  if (sorted.length === 0) return { pattern: null, confidence: 0 }

  const [bestName, bestCount] = sorted[0]
  const confidence = bestCount / sample.length

  const pattern = PATTERNS.find((p) => p.name === bestName) ?? null
  return { pattern, confidence }
}

/**
 * Parsed zeitstempelbasierte Log-Dateien mit Multi-Zeilen-Merging.
 * Unterstützt 3 verschiedene Zeilenformate (Format A/B/C).
 */
export function parseLogLines(text: string): ParseResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return { entries: [], format: 'empty', fields: [], skipped: 0, skippedSamples: [] }
  }

  const lines = trimmed.split(/\r?\n/)
  const detection = detectPattern(lines)

  if (!detection.pattern || detection.confidence < 0.5) {
    return { entries: [], format: 'empty', fields: [], skipped: 0, skippedSamples: [] }
  }

  const entries: RawRecord[] = []
  const skippedSamples: string[] = []
  let skipped = 0
  let currentEntry: RawRecord | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()

    if (!trimmedLine) {
      if (currentEntry) {
        entries.push(currentEntry)
        currentEntry = null
      }
      continue
    }

    const match = trimmedLine.match(detection.pattern.regex)

    if (match) {
      // Neue Log-Zeile — bisheriger Eintrag abschließen
      if (currentEntry) {
        entries.push(currentEntry)
      }

      const extracted = detection.pattern.extract(match)
      currentEntry = {
        timestamp: extracted.timestamp,
        level: extracted.level,
        ...(extracted.logger && { logger: extracted.logger }),
        message: extracted.message,
      }
    } else {
      // Keine Übereinstimmung → Fortsetzungszeile
      if (currentEntry) {
        currentEntry.message = `${currentEntry.message}\n${trimmedLine}`
      } else {
        skipped++
        if (skippedSamples.length < MAX_SKIPPED_SAMPLES) {
          skippedSamples.push(truncate(trimmedLine))
        }
      }
    }
  }

  if (currentEntry) {
    entries.push(currentEntry)
  }

  return {
    entries,
    format: 'lines',
    fields: collectFields(entries),
    skipped,
    skippedSamples,
  }
}

function collectFields(entries: RawRecord[]): string[] {
  const counts = new Map<string, number>()
  const limit = Math.min(entries.length, 2000)
  for (let i = 0; i < limit; i++) {
    for (const key of Object.keys(entries[i])) {
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k)
}

function truncate(s: string, max = 200): string {
  const oneLine = s.replace(/\s+/g, ' ').trim()
  return oneLine.length > max ? oneLine.slice(0, max) + '…' : oneLine
}
