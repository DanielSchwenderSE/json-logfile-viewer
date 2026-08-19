import { useAppStore } from '../store'
import type { OpenTab } from '../lib/types'

interface Props {
  tabs: OpenTab[]
  activeTabId: string | null
}

/**
 * Navigations-Bar mit Tabs für offene Logdateien.
 * Jeder Tab zeigt den Dateinamen, Klick aktiviert den Tab, ✕-Button schließt ihn.
 */
export default function TabBar({ tabs, activeTabId }: Props) {
  const { setActiveTab, removeTab } = useAppStore()

  if (tabs.length === 0) return null

  return (
    <div className="flex items-center gap-0 border-b border-slate-200 bg-slate-50 overflow-x-auto dark:border-slate-800 dark:bg-slate-900/50">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={
            'flex items-center gap-2 px-3 py-2 border-r border-slate-200 cursor-pointer hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800 transition ' +
            (activeTabId === tab.id ? 'bg-white dark:bg-slate-800 font-medium' : '')
          }
          onClick={() => setActiveTab(tab.id)}
        >
          <span className="mono truncate max-w-xs text-sm">{tab.logFile.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              removeTab(tab.id)
            }}
            className="ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            title="Schließen"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
