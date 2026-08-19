// Verifikationsskript für die Parser-/Mapping-Logik (ohne Browser).
// Ausführen mit:  npx tsx scripts/parseCheck.ts
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { parseLogs } from '../src/lib/parseLogs'
import { autoDetectMapping } from '../src/lib/fieldMapping'
import { buildRows } from '../src/lib/rows'

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../samples')

const files = ['app-jsonl.log', 'app-array.json', 'mixed-with-errors.log']

let failures = 0
function check(cond: boolean, label: string) {
  console.log(`${cond ? '  ✓' : '  ✗ FEHLER:'} ${label}`)
  if (!cond) failures++
}

for (const file of files) {
  const text = readFileSync(path.join(dir, file), 'utf8')
  const parse = parseLogs(text)
  const mapping = autoDetectMapping(parse.fields, parse.entries)
  const rows = buildRows(parse.entries, mapping)
  const levels = rows.reduce<Record<string, number>>((a, r) => {
    a[r.levelKey] = (a[r.levelKey] ?? 0) + 1
    return a
  }, {})

  console.log(`\n=== ${file} ===`)
  console.log(`  Format:   ${parse.format}`)
  console.log(`  Einträge: ${parse.entries.length} (übersprungen: ${parse.skipped})`)
  console.log(`  Mapping:  ts=${mapping.timestamp} level=${mapping.level} msg=${mapping.message}`)
  console.log(`  Level:    ${JSON.stringify(levels)}`)
  const withTs = rows.filter((r) => r.tsMs != null).length
  console.log(`  mit Zeitstempel: ${withTs}/${rows.length}`)

  if (file === 'app-jsonl.log') {
    check(parse.format === 'jsonl', 'Format als JSON Lines erkannt')
    check(parse.entries.length === 8, '8 Einträge geparst')
    check(mapping.timestamp === 'timestamp' && mapping.level === 'level' && mapping.message === 'message', 'Mapping korrekt erkannt')
    check(levels.error === 2, '2 Error-Einträge')
    check(withTs === rows.length, 'alle Zeitstempel geparst (inkl. Unix-Sekunden)')
  }
  if (file === 'app-array.json') {
    check(parse.format === 'array', 'Format als JSON-Array erkannt')
    check(parse.entries.length === 4, '4 Einträge geparst')
    check(mapping.timestamp === 'ts' && mapping.level === 'severity' && mapping.message === 'msg', 'Mapping (ts/severity/msg) erkannt')
    check(levels.warn === 1 && levels.error === 1 && levels.info === 2, 'Level (INFO/WARNING/ERROR) normalisiert')
  }
  if (file === 'mixed-with-errors.log') {
    check(parse.entries.length === 3, '3 Einträge trotz defekter Zeile')
    check(parse.skipped === 1, '1 defekte Zeile übersprungen')
    check(mapping.level === 'lvl', 'numerisches Level-Feld erkannt')
    check(levels.error === 1 && levels.info === 1 && levels.warn === 1, 'numerische Bunyan-Level normalisiert')
    check(withTs === 3, 'Unix-ms-Zeitstempel geparst')
  }
}

console.log(`\n${failures === 0 ? '✅ Alle Prüfungen bestanden.' : `❌ ${failures} Prüfung(en) fehlgeschlagen.`}`)
process.exit(failures === 0 ? 0 : 1)
