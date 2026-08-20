import { useMemo, useState, type ReactNode } from 'react'
import { buildFileTree, filterFileTree, type TreeNode } from '../lib/fileTree'

interface Props<T extends { path: string; name: string; size: number }> {
  files: T[]
  onSelect: (file: T) => void
  renderMeta?: (file: T) => ReactNode
  emptyMessage: string
}

/** Baumansicht mit Live-Suche über eine flache Liste von Dateien mit ZIP-Pfaden. */
export default function ZipFileTree<T extends { path: string; name: string; size: number }>({
  files,
  onSelect,
  renderMeta,
  emptyMessage,
}: Props<T>) {
  const [search, setSearch] = useState('')
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())

  const tree = useMemo(() => buildFileTree(files), [files])
  const searching = search.trim() !== ''
  const filteredTree = useMemo(() => (searching ? filterFileTree(tree, search) : tree), [tree, search, searching])

  function toggleFolder(path: string) {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  function isExpanded(path: string): boolean {
    return searching || expandedPaths.has(path)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative shrink-0 px-2 py-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Datei suchen…"
          className="w-full rounded-lg border border-slate-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700"
        />
        {searching && (
          <button
            onClick={() => setSearch('')}
            title="Suche löschen"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            ✕
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {files.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-slate-500">{emptyMessage}</p>
        ) : !filteredTree ? (
          <p className="px-3 py-6 text-center text-sm text-slate-500">Keine Treffer für „{search.trim()}“.</p>
        ) : (
          filteredTree.children.map((node) => (
            <TreeNodeRow
              key={node.path}
              node={node}
              depth={0}
              isExpanded={isExpanded}
              onToggleFolder={toggleFolder}
              onSelect={onSelect}
              renderMeta={renderMeta}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface TreeNodeRowProps<T extends { path: string; name: string; size: number }> {
  node: TreeNode<T>
  depth: number
  isExpanded: (path: string) => boolean
  onToggleFolder: (path: string) => void
  onSelect: (file: T) => void
  renderMeta?: (file: T) => ReactNode
}

function TreeNodeRow<T extends { path: string; name: string; size: number }>({
  node,
  depth,
  isExpanded,
  onToggleFolder,
  onSelect,
  renderMeta,
}: TreeNodeRowProps<T>) {
  const paddingLeft = 12 + depth * 14

  if (node.type === 'folder') {
    const expanded = isExpanded(node.path)
    return (
      <div>
        <button
          onClick={() => onToggleFolder(node.path)}
          style={{ paddingLeft }}
          className="flex w-full items-center gap-1.5 py-1.5 pr-3 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <span className="w-3 shrink-0 text-slate-400">{expanded ? '▾' : '▸'}</span>
          <span className="truncate font-medium text-slate-600 dark:text-slate-300">{node.name}</span>
        </button>
        {expanded && (
          <div>
            {node.children.map((child) => (
              <TreeNodeRow
                key={child.path}
                node={child}
                depth={depth + 1}
                isExpanded={isExpanded}
                onToggleFolder={onToggleFolder}
                onSelect={onSelect}
                renderMeta={renderMeta}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => onSelect(node.file)}
      style={{ paddingLeft: paddingLeft + 16 }}
      className="flex w-full items-center justify-between gap-3 py-1.5 pr-3 text-left hover:bg-blue-50 dark:hover:bg-slate-800"
    >
      <span className="mono truncate text-sm">{node.name}</span>
      {renderMeta && <span className="shrink-0 text-xs text-slate-400">{renderMeta(node.file)}</span>}
    </button>
  )
}
