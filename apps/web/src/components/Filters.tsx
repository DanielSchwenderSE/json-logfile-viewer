import type { LevelKey } from '../lib/types'
import { LEVEL_BADGE, LEVEL_LABEL, LEVEL_ORDER } from '../lib/levels'

interface Props {
  levelCounts: Record<LevelKey, number>
  activeLevels: Set<LevelKey>
  onToggleLevel: (level: LevelKey) => void
  search: string
  onSearch: (value: string) => void
  timeFrom: string
  timeTo: string
  onTimeFrom: (value: string) => void
  onTimeTo: (value: string) => void
  hasTimestamp: boolean
}

/** Bedienleiste: Level-Filter, Volltextsuche, Zeitraum. */
export default function Filters({
  levelCounts,
  activeLevels,
  onToggleLevel,
  search,
  onSearch,
  timeFrom,
  timeTo,
  onTimeFrom,
  onTimeTo,
  hasTimestamp,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-2 dark:border-slate-800">
      {/* Level-Chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {LEVEL_ORDER.filter((l) => levelCounts[l] > 0).map((level) => {
          const active = activeLevels.has(level)
          return (
            <button
              key={level}
              onClick={() => onToggleLevel(level)}
              className={
                'rounded-full border px-2.5 py-1 text-xs font-medium transition ' +
                LEVEL_BADGE[level] +
                (active ? '' : ' opacity-35')
              }
              title={active ? 'Ausblenden' : 'Einblenden'}
            >
              {LEVEL_LABEL[level]} {levelCounts[level].toLocaleString('de-DE')}
            </button>
          )
        })}
      </div>

      {/* Volltextsuche */}
      <div className="relative min-w-[16rem] flex-1">
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder='Suche … (z. B. timeout  oder  level:error  oder  msg:"disk full")'
          className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700"
        />
        {search && (
          <button
            onClick={() => onSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            title="Suche leeren"
          >
            ✕
          </button>
        )}
      </div>

      {/* Zeitraum */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500" title={hasTimestamp ? '' : 'Kein Zeitstempel-Feld erkannt'}>
        <span>Von</span>
        <input
          type="datetime-local"
          step="1"
          value={timeFrom}
          disabled={!hasTimestamp}
          onChange={(e) => onTimeFrom(e.target.value)}
          className="rounded-md border border-slate-300 bg-transparent px-1.5 py-1 disabled:opacity-40 dark:border-slate-700"
        />
        <span>Bis</span>
        <input
          type="datetime-local"
          step="1"
          value={timeTo}
          disabled={!hasTimestamp}
          onChange={(e) => onTimeTo(e.target.value)}
          className="rounded-md border border-slate-300 bg-transparent px-1.5 py-1 disabled:opacity-40 dark:border-slate-700"
        />
        {(timeFrom || timeTo) && (
          <button
            onClick={() => {
              onTimeFrom('')
              onTimeTo('')
            }}
            className="text-slate-400 hover:text-slate-600"
            title="Zeitraum zurücksetzen"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
