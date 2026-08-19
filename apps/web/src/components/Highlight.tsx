interface Props {
  text: string
  terms: string[]
}

/** Hebt alle Vorkommen der Suchbegriffe im Text mit <mark> hervor. */
export default function Highlight({ text, terms }: Props) {
  const active = terms.filter((t) => t.length > 0)
  if (active.length === 0) return <>{text}</>

  // Regex aus den Begriffen (escaped), case-insensitive.
  const escaped = active.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(re)

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>,
      )}
    </>
  )
}
