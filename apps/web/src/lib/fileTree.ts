export interface FileNode<T> {
  type: 'file'
  name: string
  path: string
  file: T
}

export interface FolderNode<T> {
  type: 'folder'
  name: string
  path: string
  children: Array<FolderNode<T> | FileNode<T>>
}

export type TreeNode<T> = FolderNode<T> | FileNode<T>

function sortChildren<T>(children: Array<FolderNode<T> | FileNode<T>>): void {
  children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
}

/** Baut aus flachen ZIP-Pfaden (z. B. "logs/sub/app.log") eine verschachtelte Ordnerstruktur. */
export function buildFileTree<T extends { path: string; name: string }>(files: T[]): FolderNode<T> {
  const root: FolderNode<T> = { type: 'folder', name: '', path: '', children: [] }

  for (const file of files) {
    const segments = file.path.split('/').filter(Boolean)
    let current = root
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i]
      const folderPath = segments.slice(0, i + 1).join('/')
      let next = current.children.find(
        (c): c is FolderNode<T> => c.type === 'folder' && c.path === folderPath,
      )
      if (!next) {
        next = { type: 'folder', name: segment, path: folderPath, children: [] }
        current.children.push(next)
      }
      current = next
    }
    current.children.push({ type: 'file', name: file.name, path: file.path, file })
  }

  function sortTree(node: FolderNode<T>): void {
    sortChildren(node.children)
    for (const child of node.children) {
      if (child.type === 'folder') sortTree(child)
    }
  }
  sortTree(root)

  return root
}

/**
 * Liefert eine gefilterte Kopie des Baums, die nur Ordner enthält, die (direkt oder
 * verschachtelt) mindestens eine Datei enthalten, deren Name den Suchbegriff enthält.
 * Gibt null zurück, wenn nichts passt.
 */
export function filterFileTree<T>(root: FolderNode<T>, term: string): FolderNode<T> | null {
  const needle = term.trim().toLowerCase()
  if (!needle) return root

  function filterFolder(node: FolderNode<T>): FolderNode<T> | null {
    const children: Array<FolderNode<T> | FileNode<T>> = []
    for (const child of node.children) {
      if (child.type === 'file') {
        if (child.name.toLowerCase().includes(needle)) children.push(child)
      } else {
        const filtered = filterFolder(child)
        if (filtered) children.push(filtered)
      }
    }
    if (children.length === 0) return null
    return { ...node, children }
  }

  return filterFolder(root)
}
