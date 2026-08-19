// Gemeinsame Typen für den Log-Viewer.

/** Ein einzelner geparster Log-Datensatz (unbekannte Struktur). */
export type RawRecord = Record<string, unknown>

/** Erkanntes Quellformat einer Logdatei. */
export type LogFormat = 'array' | 'jsonl' | 'mixed' | 'single' | 'lines' | 'xml' | 'empty'

/** Anzeigeformat für Logs. */
export type ViewMode = 'table' | 'tree' | 'text'

/** Ergebnis des Parsens einer Logdatei. */
export interface ParseResult {
  entries: RawRecord[]
  format: LogFormat
  /** Felder (Top-Level-Schlüssel), nach Häufigkeit absteigend sortiert. */
  fields: string[]
  /** Anzahl übersprungener, nicht parsebarer Fragmente. */
  skipped: number
  /** Beispiele übersprungener Fragmente (für Hinweise an den Nutzer). */
  skippedSamples: string[]
}

/** Normalisierte Log-Level-Kategorie. */
export type LevelKey = 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'other'

/** Zuordnung wichtiger Felder (automatisch erkannt, manuell überschreibbar). */
export interface FieldMapping {
  timestamp: string | null
  level: string | null
  message: string | null
}

/** Eine einzelne Logdatei (aus Datei oder ZIP). */
export interface LogFile {
  id: string // UUID
  name: string // Dateiname (z. B. "app-jsonl.log" oder "app.json")
  path: string | null // Vollständiger Pfad im ZIP (z. B. "logs/app.json"), null für einzelne Dateien
  source: 'file' | 'zip' // Quelle
  modificationDate: number | null // ms seit Epoch
  text: string // Dateiinhalt (wird beim Öffnen geladen)
}

/** Ein geöffneter Tab (Datei + geladene Daten). */
export interface OpenTab {
  id: string // UUID, eindeutige ID des Tabs
  logFile: LogFile
  parse: ParseResult
  mapping: FieldMapping
  viewMode?: ViewMode // Anzeigeformat (table/tree/text), optional, abgeleitet aus Dateiendung
}

/** Ein geöffnetes ZIP-Paket (für Sidebar). */
export interface OpenZip {
  id: string // UUID
  name: string // Dateiname des ZIP
  files: Array<{ path: string; name: string; size: number; modDate: number | null }>
}

/** Eine Highlighting-Regel (Farbe, Style für bestimmte Muster). */
export interface HighlightRule {
  id: string // UUID
  pattern: string // Wort oder Regex
  isRegex: boolean
  color: string // Textfarbe (Hex oder CSS-Farb-Name)
  backgroundColor: string // Hintergrund (Hex oder CSS-Farb-Name)
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  textDecoration: 'none' | 'underline'
}

/** Ein Highlighting-Profil (Sammlung von Regeln). */
export interface HighlightingProfile {
  id: string // UUID
  name: string // Profilname (z. B. "Production", "Development")
  rules: HighlightRule[]
  createdAt: number // ms seit Epoch
  updatedAt: number
}

