interface Props {
  text: string
}

/** Einfache Plain-Text-Ansicht ohne Tabelle, Filter oder Suche. */
export default function PlainTextView({ text }: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50 dark:bg-slate-900/50">
      <div className="overflow-auto p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words text-slate-700 dark:text-slate-300">
        {text}
      </div>
    </div>
  )
}
