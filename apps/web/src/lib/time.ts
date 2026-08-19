// Zeitstempel-Erkennung und -Formatierung.

/**
 * Wandelt einen Wert in einen Zeitstempel (ms seit Epoch) um oder gibt null
 * zurück. Unterstützt:
 *  - ISO-8601-Strings ("2026-08-07T12:34:56.789Z")
 *  - Unix-Zeit in Sekunden oder Millisekunden (Zahl oder numerischer String)
 *  - übliche Datums-Strings, die Date parsen kann
 */
export function parseTimestamp(value: unknown): number | null {
  if (value == null) return null

  if (typeof value === 'number') return fromEpoch(value)

  if (typeof value === 'string') {
    const s = value.trim()
    if (s === '') return null
    if (/^\d+(\.\d+)?$/.test(s)) return fromEpoch(Number(s))
    const t = Date.parse(s)
    return Number.isNaN(t) ? null : t
  }

  return null
}

/** Interpretiert eine Zahl als Epoch – heuristisch Sekunden vs. Millisekunden. */
function fromEpoch(n: number): number | null {
  if (!Number.isFinite(n)) return null
  // ~1e12 entspricht dem Jahr 2001 in ms bzw. Jahr 33658 in Sekunden.
  // Werte darunter interpretieren wir als Sekunden.
  if (n < 1e12) return n * 1000
  return n
}

/** Formatiert einen ms-Zeitstempel lokal, kompakt und sortierbar. */
export function formatTimestamp(ms: number): string {
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (x: number, l = 2) => String(x).padStart(l, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
  )
}

/** Wandelt einen <input type="datetime-local">-Wert in ms um. */
export function localInputToMs(value: string): number | null {
  if (!value) return null
  const t = Date.parse(value)
  return Number.isNaN(t) ? null : t
}
