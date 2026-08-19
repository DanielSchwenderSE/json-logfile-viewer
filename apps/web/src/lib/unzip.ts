import JSZip from 'jszip'

/** Eine Logdatei innerhalb eines geladenen ZIP-Pakets. */
export interface ZipLogFile {
  /** Vollständiger Pfad im ZIP (z. B. "logs/app-2026-08-07.json"). */
  path: string
  /** Anzeigename (letztes Pfadsegment). */
  name: string
  /** Entpackte Größe in Bytes. */
  size: number
  /** Liest den Textinhalt dieses Eintrags bei Bedarf (nicht alle vorab). */
  text: () => Promise<string>
}

// Als Log interpretierte Endungen innerhalb eines ZIP.
const LOG_EXTENSIONS = ['.json', '.jsonl', '.ndjson', '.log', '.txt', '.xml']

export function isZipFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip'
}

/**
 * Lädt ein ZIP im Browser (clientseitig, kein Upload) und listet die enthaltenen
 * Logdateien. Der Inhalt einzelner Dateien wird erst beim Auswählen gelesen.
 */
export async function loadZip(file: File): Promise<ZipLogFile[]> {
  const zip = await JSZip.loadAsync(file)
  const files: ZipLogFile[] = []

  zip.forEach((path, entry) => {
    if (entry.dir) return
    const lower = path.toLowerCase()
    // macOS-Metadaten und versteckte Dateien ausblenden.
    if (lower.includes('__macosx/') || path.split('/').pop()?.startsWith('.')) return
    if (!LOG_EXTENSIONS.some((ext) => lower.endsWith(ext))) return

    files.push({
      path,
      name: path.split('/').pop() || path,
      // _data.uncompressedSize ist bei JSZip verfügbar; Fallback 0.
      size: (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0,
      text: () => entry.async('string'),
    })
  })

  files.sort((a, b) => a.path.localeCompare(b.path))
  return files
}
