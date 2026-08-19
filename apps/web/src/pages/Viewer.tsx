import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '../store'
import { logout } from '../lib/api'
import { parseLogs } from '../lib/parseLogs'
import { parseLogLines } from '../lib/parseLogLines'
import { parseXml } from '../lib/parseXml'
import { autoDetectMapping } from '../lib/fieldMapping'
import { buildRows } from '../lib/rows'
import { isEmptyQuery, matchesQuery, parseQuery, highlightTerms } from '../lib/filter'
import { localInputToMs } from '../lib/time'
import { LEVEL_ORDER, normalizeLevel } from '../lib/levels'
import type { LevelKey, LogFormat, RawRecord, OpenTab, LogFile, ViewMode } from '../lib/types'
import { isZipFile, loadZip, type ZipLogFile } from '../lib/unzip'
import FileDropzone from '../components/FileDropzone'
import ZipFileList from '../components/ZipFileList'
import TabBar from '../components/TabBar'
import Sidebar from '../components/Sidebar'
import Filters from '../components/Filters'
import LogTable from '../components/LogTable'
import SearchResultsPanel from '../components/SearchResultsPanel'
import FieldMappingBar from '../components/FieldMappingBar'
import ChangePasswordDialog from '../components/ChangePasswordDialog'
import PlainTextView from '../components/PlainTextView'
import XmlTreeView from '../components/XmlTreeView'

function generateId(): string {
  return 'tab_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9)
}

export default function Viewer() {
  const { user, setUser, theme, toggleTheme, openTabs, activeTabId, addTab, setOpenZip, openZip, setActiveView } = useAppStore()

  const [zipPending, setZipPending] = useState<{ name: string; files: ZipLogFile[] } | null>(null)
  const zipEntriesRef = useRef<Map<string, ZipLogFile>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)

  // Filter-Zustand
  const [search, setSearch] = useState('')
  const [activeLevels, setActiveLevels] = useState<Set<LevelKey>>(new Set())
  const [timeFrom, setTimeFrom] = useState('')
  const [timeTo, setTimeTo] = useState('')
  const [extraColumns, setExtraColumns] = useState<string[]>([])
  const [highlightedRowId, setHighlightedRowId] = useState<number | null>(null)

  const activeTab = openTabs.find((t) => t.id === activeTabId)

  // ---- Datei-Handling ----

  async function handleFile(file: File) {
    setError(null)
    setLoading(true)
    try {
      if (isZipFile(file)) {
        const files = await loadZip(file)
        // Speichere die ZipLogFile-Objekte in einem Map (nicht im State!)
        zipEntriesRef.current = new Map(files.map((f) => [f.path, f]))

        // ZIP sofort zur Sidebar hinzufügen
        setOpenZip({
          id: generateId(),
          name: file.name,
          files: files.map((f) => ({ path: f.path, name: f.name, size: f.size, modDate: null })),
        })

        // Dateiauswahl-Modal anzeigen (nur Metadaten!)
        setZipPending({
          name: file.name,
          files: files.map((f) => ({
            path: f.path,
            name: f.name,
            size: f.size,
            text: () => zipEntriesRef.current.get(f.path)?.text() || Promise.reject('Entry not found'),
          } as ZipLogFile)),
        })

        // Automatisch erste Datei laden wenn nur eine
        if (files.length === 1) {
          await openZipEntry(files[0])
        }
      } else {
        const text = await file.text()
        await addFileAsTab(file.name, text, null, null, 'file')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Datei konnte nicht gelesen werden')
    } finally {
      setLoading(false)
    }
  }

  async function openZipEntry(entry: ZipLogFile) {
    try {
      const text = await entry.text()
      const ext = entry.name.toLowerCase().split('.').pop() ?? ''
      const { parse, viewMode } = parseByExtension(text, ext)
      const mapping = autoDetectMapping(parse.fields, parse.entries)
      const logFile: LogFile = {
        id: generateId(),
        name: entry.name,
        path: entry.path,
        source: 'zip',
        modificationDate: Date.now(),
        text,
      }
      const tab: OpenTab = {
        id: generateId(),
        logFile,
        parse,
        mapping,
        viewMode,
      }
      addTab(tab)
      setZipPending(null)
      setSearch('')
      setTimeFrom('')
      setTimeTo('')
      setActiveLevels(collectPresentLevels(parse.entries, mapping.level))
      setExtraColumns([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Datei konnte nicht gelesen werden')
    }
  }

  async function addFileAsTab(name: string, text: string, _zipName: string | null, _zipPath: string | null, source: 'file' | 'zip') {
    const ext = name.toLowerCase().split('.').pop() ?? ''
    const { parse, viewMode } = parseByExtension(text, ext)
    const mapping = autoDetectMapping(parse.fields, parse.entries)
    const logFile: LogFile = {
      id: generateId(),
      name,
      path: _zipPath,
      source,
      modificationDate: Date.now(),
      text,
    }
    const tab: OpenTab = {
      id: generateId(),
      logFile,
      parse,
      mapping,
      viewMode,
    }
    addTab(tab)
    setSearch('')
    setTimeFrom('')
    setTimeTo('')
    setActiveLevels(collectPresentLevels(parse.entries, mapping.level))
    setExtraColumns([])
  }

  // ---- Filterung & Suche ----

  const rows = useMemo(() => (activeTab ? buildRows(activeTab.parse.entries, activeTab.mapping) : []), [activeTab])

  const levelCounts = useMemo(() => {
    const counts = { error: 0, warn: 0, info: 0, debug: 0, trace: 0, other: 0 } as Record<LevelKey, number>
    for (const r of rows) counts[r.levelKey]++
    return counts
  }, [rows])

  const presentLevels = useMemo(() => LEVEL_ORDER.filter((l) => levelCounts[l] > 0), [levelCounts])

  useEffect(() => {
    setActiveLevels(new Set(presentLevels))
  }, [presentLevels])

  const filtered = useMemo(() => {
    const query = parseQuery(search)
    const emptyQuery = isEmptyQuery(query)
    const fromMs = localInputToMs(timeFrom)
    const toMs = localInputToMs(timeTo)
    const levelActive = (l: LevelKey) => activeLevels.has(l)

    return rows.filter((r) => {
      if (!levelActive(r.levelKey)) return false
      if (fromMs != null && r.tsMs != null && r.tsMs < fromMs) return false
      if (toMs != null && r.tsMs != null && r.tsMs > toMs) return false
      if (!emptyQuery && !matchesQuery(r, query)) return false
      return true
    })
  }, [rows, search, activeLevels, timeFrom, timeTo])

  // Such-Ergebnisse (ungefiltert)
  const allSearchResults = useMemo(() => {
    if (!search) return []
    const query = parseQuery(search)
    if (isEmptyQuery(query)) return []
    return rows.filter((r) => matchesQuery(r, query))
  }, [rows, search])

  const terms = useMemo(() => highlightTerms(parseQuery(search)), [search])

  function toggleLevel(level: LevelKey) {
    setActiveLevels((prev) => {
      const next = new Set(prev)
      if (next.has(level)) next.delete(level)
      else next.add(level)
      return next
    })
  }

  function handleSelectSearchResult(rowId: number) {
    // Wenn Treffer durch Filter verborgen ist → Filter aufgelösen
    const result = rows.find((r) => r.id === rowId)
    if (!result) return
    if (!activeLevels.has(result.levelKey)) {
      setActiveLevels(new Set(presentLevels))
    }
    setHighlightedRowId(rowId)
  }

  async function onLogout() {
    await logout()
    setUser(null)
  }

  const mapping = activeTab?.mapping
  const availableExtraFields = activeTab
    ? activeTab.parse.fields.filter(
        (f) => f !== mapping?.timestamp && f !== mapping?.level && f !== mapping?.message,
      )
    : []

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-2 dark:border-slate-800">
        <span className="font-semibold">JSON Log Viewer</span>
        {activeTab && (
          <span className="mono truncate text-sm text-slate-500" title={activeTab.logFile.name}>
            · {activeTab.logFile.name}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {activeTab && <FileDropzone onFile={handleFile} compact />}
          {activeTab && availableExtraFields.length > 0 && (
            <ColumnPicker fields={availableExtraFields} selected={extraColumns} onChange={setExtraColumns} />
          )}
          <button onClick={toggleTheme} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setActiveView('users')}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Benutzerverwaltung
            </button>
          )}
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-lg border border-slate-300 px-2 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
              {user?.displayName || user?.username}
            </summary>
            <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <button
                onClick={() => setShowPasswordDialog(true)}
                className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Passwort ändern
              </button>
              <button
                onClick={onLogout}
                className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Abmelden
              </button>
            </div>
          </details>
        </div>
      </header>

      {showPasswordDialog && <ChangePasswordDialog onClose={() => setShowPasswordDialog(false)} />}

      {error && <div className="border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-400">{error}</div>}

      {/* TabBar */}
      <TabBar tabs={openTabs} activeTabId={activeTabId} />

      {/* Layout: Sidebar + Content */}
      <div className="flex min-h-0 flex-1">
        {/* Sidebar mit ZIP-Struktur */}
        {!zipPending && openZip && (
          <Sidebar
            openZip={openZip}
            onSelectZipFile={(path) => {
              const entry = zipEntriesRef.current.get(path)
              if (entry) openZipEntry(entry)
            }}
          />
        )}

        <div className="flex min-h-0 flex-1 flex-col">
          {loading ? (
            <div className="flex flex-1 items-center justify-center text-slate-500">Verarbeite …</div>
          ) : zipPending ? (
            <ZipFileList
              zipName={zipPending.name}
              files={zipPending.files}
              onSelect={(f) => openZipEntry(f)}
              onCancel={() => setZipPending(null)}
            />
          ) : !activeTab || !mapping ? (
            <FileDropzone onFile={handleFile} />
          ) : activeTab.viewMode === 'text' ? (
            <PlainTextView text={activeTab.logFile.text} />
          ) : activeTab.viewMode === 'tree' ? (
            activeTab.parse.entries.length > 0 && (
              <XmlTreeView entry={activeTab.parse.entries[0] as RawRecord} />
            )
          ) : (
            <>
              <FieldMappingBar fields={activeTab.parse.fields} mapping={mapping} onChange={() => {}} format={activeTab.parse.format as LogFormat} total={rows.length} shown={filtered.length} skipped={activeTab.parse.skipped} />
              <Filters levelCounts={levelCounts} activeLevels={activeLevels} onToggleLevel={toggleLevel} search={search} onSearch={setSearch} timeFrom={timeFrom} timeTo={timeTo} onTimeFrom={setTimeFrom} onTimeTo={setTimeTo} hasTimestamp={!!mapping.timestamp} />
              <div className="flex min-h-0 flex-1 flex-col">
                <LogTable rows={filtered} mapping={mapping} extraColumns={extraColumns} terms={terms} highlightRowId={highlightedRowId} />
              </div>
              <SearchResultsPanel query={search} results={allSearchResults} onSelectResult={handleSelectSearchResult} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function collectPresentLevels(entries: RawRecord[], levelField: string | null): Set<LevelKey> {
  const set = new Set<LevelKey>()
  for (const e of entries) set.add(levelField ? normalizeLevel(e[levelField]) : 'other')
  return set
}

function parseByExtension(text: string, ext: string): { parse: any; viewMode: ViewMode } {
  if (ext === 'txt') {
    return {
      parse: { entries: [], format: 'empty', fields: [], skipped: 0, skippedSamples: [] },
      viewMode: 'text',
    }
  }
  if (ext === 'log') {
    const parse = parseLogLines(text)
    const viewMode: ViewMode = parse.format === 'empty' ? 'text' : 'table'
    return { parse, viewMode }
  }
  if (ext === 'xml') {
    return {
      parse: parseXml(text),
      viewMode: 'tree',
    }
  }
  return {
    parse: parseLogs(text),
    viewMode: 'table',
  }
}

function ColumnPicker({ fields, selected, onChange }: { fields: string[]; selected: string[]; onChange: (cols: string[]) => void }) {
  function toggle(field: string) {
    onChange(selected.includes(field) ? selected.filter((f) => f !== field) : [...selected, field])
  }
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none rounded-lg border border-slate-300 px-2 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
        Spalten {selected.length > 0 && `(${selected.length})`}
      </summary>
      <div className="absolute right-0 z-20 mt-1 max-h-80 w-56 overflow-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
        {fields.map((f) => (
          <label key={f} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
            <input type="checkbox" checked={selected.includes(f)} onChange={() => toggle(f)} />
            <span className="mono truncate">{f}</span>
          </label>
        ))}
      </div>
    </details>
  )
}
