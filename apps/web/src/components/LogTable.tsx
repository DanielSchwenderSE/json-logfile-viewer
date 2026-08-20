import { useEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Row } from '../lib/rows'
import type { FieldMapping } from '../lib/types'
import { LEVEL_BADGE, LEVEL_BAR, LEVEL_LABEL } from '../lib/levels'
import { formatTimestamp } from '../lib/time'
import Highlight from './Highlight'
import RowDetails from './RowDetails'

interface Props {
  rows: Row[]
  mapping: FieldMapping
  extraColumns: string[]
  terms: string[]
  highlightRowId?: number | null
}

function cellText(v: unknown): string {
  if (v == null) return ''
  return typeof v === 'object' ? JSON.stringify(v) : String(v)
}

/**
 * Virtualisierte Tabelle: nur sichtbare Zeilen liegen im DOM, damit auch
 * Dateien mit zehntausenden Einträgen flüssig bleiben. Zeilen sind aufklappbar
 * und zeigen dann den vollständigen JSON-Baum.
 */
export default function LogTable({ rows, mapping, extraColumns, terms, highlightRowId }: Props) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [flashRowId, setFlashRowId] = useState<number | null>(null)
  const autoExpandedRef = useRef<number | null>(null)
  const pendingScrollRef = useRef<number | null>(null)

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 34,
    overscan: 14,
  })

  // Der Virtualizer cached gemessene Höhen; nach jeder Änderung des
  // Aufklapp-Zustands erzwingen wir eine frische Neuberechnung, damit keine
  // veralteten Höhen zu überlappenden Zeilen führen.
  useEffect(() => {
    virtualizer.measure()
  }, [expanded, virtualizer])

  // Bei Auswahl eines Suchtreffers: zur Zeile scrollen, aufklappen und kurz hervorheben.
  // Nur die zuletzt per Suche aufgeklappte Zeile bleibt offen, sonst stapeln sich bei
  // mehreren Klicks hintereinander viele JSON-Bäume gleichzeitig auf und die
  // virtualisierte Positionierung der Zeilen überlappt sich.
  useEffect(() => {
    if (highlightRowId == null) return
    const index = rows.findIndex((r) => r.id === highlightRowId)
    if (index === -1) return

    setExpanded((prev) => {
      const next = new Set(prev)
      if (autoExpandedRef.current != null && autoExpandedRef.current !== highlightRowId) {
        next.delete(autoExpandedRef.current)
      }
      next.add(highlightRowId)
      return next
    })
    autoExpandedRef.current = highlightRowId
    setFlashRowId(highlightRowId)

    // Erst scrollen, nachdem der Browser das Layout mit dem neuen
    // Aufklapp-Zustand tatsächlich gezeichnet hat – sonst rechnet der
    // Virtualizer mit den alten (veralteten) Zeilenhöhen und die Zielposition
    // stimmt nicht mehr, was zu überlappenden Zeilen führt.
    //
    // Die Zielzeile wird beim ersten scrollToIndex erst ins DOM gemountet;
    // ihre echte (hohe) Größe misst der Virtualizer asynchron per
    // ResizeObserver, also einen weiteren Frame später. Ohne einen zweiten
    // Korrektur-Scroll bleibt der Scroll-Offset auf der anhand der
    // Schätzgröße (34px) berechneten Position stehen, während sich der
    // Inhalt darunter/darüber bereits verschoben hat – das erzeugt eine
    // Lücke bzw. optisch "hängenbleibende" Inhalte.
    if (pendingScrollRef.current != null) cancelAnimationFrame(pendingScrollRef.current)
    pendingScrollRef.current = requestAnimationFrame(() => {
      pendingScrollRef.current = requestAnimationFrame(() => {
        virtualizer.scrollToIndex(index, { align: 'center' })
        pendingScrollRef.current = requestAnimationFrame(() => {
          pendingScrollRef.current = requestAnimationFrame(() => {
            virtualizer.scrollToIndex(index, { align: 'center' })
            pendingScrollRef.current = null
          })
        })
      })
    })

    const timer = setTimeout(() => setFlashRowId(null), 2000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightRowId])

  useEffect(() => {
    return () => {
      if (pendingScrollRef.current != null) cancelAnimationFrame(pendingScrollRef.current)
    }
  }, [])

  function toggle(id: number) {
    if (autoExpandedRef.current === id) autoExpandedRef.current = null
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Spalten-Template: Aufklapp-Icon, Zeit, Level, Zusatzspalten, Nachricht.
  const cols = [
    '28px',
    mapping.timestamp ? '190px' : null,
    mapping.level ? '92px' : null,
    ...extraColumns.map(() => 'minmax(120px, 1fr)'),
    'minmax(240px, 3fr)',
  ].filter(Boolean) as string[]
  const template = cols.join(' ')

  if (rows.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-500">
        Keine Einträge für die aktuellen Filter.
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Kopfzeile */}
      <div
        className="sticky top-0 z-10 border-b border-l-2 border-transparent border-b-slate-200 bg-slate-100 text-xs font-medium text-slate-500 dark:border-b-slate-800 dark:bg-slate-900"
        style={{ display: 'grid', gridTemplateColumns: template }}
      >
        <div />
        {mapping.timestamp && <div className="px-2 py-1.5">Zeit</div>}
        {mapping.level && <div className="px-2 py-1.5">Level</div>}
        {extraColumns.map((c) => (
          <div key={c} className="truncate px-2 py-1.5" title={c}>
            {c}
          </div>
        ))}
        <div className="px-2 py-1.5">Nachricht</div>
      </div>

      {/* Scrollbereich */}
      <div ref={parentRef} className="min-h-0 flex-1 overflow-auto">
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
          {virtualizer.getVirtualItems().map((vi) => {
            const row = rows[vi.index]
            const isOpen = expanded.has(row.id)
            return (
              <div
                key={row.id}
                data-index={vi.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${vi.start}px)`,
                }}
                className="border-b border-slate-100 dark:border-slate-800/70"
              >
                <div
                  style={{ display: 'grid', gridTemplateColumns: template }}
                  className={
                    'cursor-pointer border-l-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors duration-500 ' +
                    LEVEL_BAR[row.levelKey] +
                    (flashRowId === row.id ? ' bg-yellow-200/70 dark:bg-yellow-500/20' : '')
                  }
                  onClick={() => toggle(row.id)}
                >
                  <div className="flex items-center justify-center text-slate-400">
                    {isOpen ? '▾' : '▸'}
                  </div>
                  {mapping.timestamp && (
                    <div className="mono truncate px-2 py-1.5 text-xs text-slate-500">
                      {row.tsMs != null ? formatTimestamp(row.tsMs) : cellText(row.raw[mapping.timestamp])}
                    </div>
                  )}
                  {mapping.level && (
                    <div className="px-2 py-1.5">
                      <span className={'rounded border px-1.5 py-0.5 text-[11px] font-medium ' + LEVEL_BADGE[row.levelKey]}>
                        {cellText(row.levelRaw) || LEVEL_LABEL[row.levelKey]}
                      </span>
                    </div>
                  )}
                  {extraColumns.map((c) => (
                    <div key={c} className="mono truncate px-2 py-1.5 text-xs" title={cellText(row.raw[c])}>
                      {cellText(row.raw[c])}
                    </div>
                  ))}
                  <div className="truncate px-2 py-1.5">
                    <Highlight text={row.message} terms={terms} />
                  </div>
                </div>
                {isOpen && <RowDetails raw={row.raw} />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
