import type { Row } from './rows'

export interface Query {
  /** Freitext-Begriffe (UND-verknüpft, über alle Felder). */
  text: string[]
  /** Feldspezifische Begriffe wie level:error oder msg:timeout. */
  fields: { name: string; value: string }[]
}

/**
 * Zerlegt eine Suchanfrage in Freitext- und Feld-Begriffe.
 * Beispiele:  timeout           -> text
 *             level:error       -> field level = error
 *             msg:"disk full"   -> field msg = disk full
 */
export function parseQuery(input: string): Query {
  const text: string[] = []
  const fields: { name: string; value: string }[] = []
  // Tokens: entweder feld:"wert mit space", feld:wert, "freitext", oder wort
  const re = /(\w[\w.@-]*):("([^"]*)"|\S+)|"([^"]*)"|(\S+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(input)) !== null) {
    if (m[1]) {
      const value = (m[3] ?? m[2] ?? '').toLowerCase()
      fields.push({ name: m[1].toLowerCase(), value })
    } else {
      const t = (m[4] ?? m[5] ?? '').toLowerCase()
      if (t) text.push(t)
    }
  }
  return { text, fields }
}

export function isEmptyQuery(q: Query): boolean {
  return q.text.length === 0 && q.fields.length === 0
}

/** Prüft, ob eine Zeile alle Begriffe der Anfrage erfüllt (UND). */
export function matchesQuery(row: Row, q: Query): boolean {
  for (const t of q.text) {
    if (!row.blob.includes(t)) return false
  }
  for (const f of q.fields) {
    if (f.name === 'level') {
      const lvl = row.levelKey + ' ' + String(row.levelRaw ?? '').toLowerCase()
      if (!lvl.includes(f.value)) return false
      continue
    }
    const v = row.raw[f.name]
    if (v == null) return false
    const s = (typeof v === 'object' ? JSON.stringify(v) : String(v)).toLowerCase()
    if (!s.includes(f.value)) return false
  }
  return true
}

/** Begriffe, die in der Nachricht hervorgehoben werden sollen. */
export function highlightTerms(q: Query): string[] {
  const terms = [...q.text]
  for (const f of q.fields) {
    if (f.name !== 'level' && f.value) terms.push(f.value)
  }
  return terms.filter(Boolean)
}
