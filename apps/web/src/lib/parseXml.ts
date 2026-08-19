import type { ParseResult, RawRecord } from './types'

/**
 * Konvertiert eine XML-String in ein Plain-JS-Objekt mittels Browser-API `DOMParser`.
 * Rekursiv: Elemente werden zu Keys, Text-Nodes zu Werte, mehrfache gleiche Elemente zu Array.
 */
export function parseXml(text: string): ParseResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return { entries: [], format: 'empty', fields: [], skipped: 0, skippedSamples: [] }
  }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(trimmed, 'application/xml')

    // Fehlerprüfung: parseError?
    if (doc.documentElement.nodeName === 'parsererror') {
      return { entries: [], format: 'empty', fields: [], skipped: 0, skippedSamples: [] }
    }

    const xmlObject = elementToObject(doc.documentElement) as RawRecord
    return {
      entries: [xmlObject],
      format: 'xml',
      fields: [],
      skipped: 0,
      skippedSamples: [],
    }
  } catch {
    return { entries: [], format: 'empty', fields: [], skipped: 0, skippedSamples: [] }
  }
}

function elementToObject(element: Element): unknown {
  const result: Record<string, unknown> = {}

  // Attribute hinzufügen (unter @attr Key)
  if (element.attributes.length > 0) {
    const attrs: Record<string, string> = {}
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i]
      attrs[attr.name] = attr.value
    }
    if (Object.keys(attrs).length > 0) {
      result['@attributes'] = attrs
    }
  }

  // Child-Elemente und Text
  const childElements = Array.from(element.childNodes).filter(
    (n) => n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && (n.textContent?.trim() ?? '') !== ''),
  )

  const elementsByName = new Map<string, Element[]>()
  for (const child of childElements) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const name = (child as Element).tagName
      if (!elementsByName.has(name)) elementsByName.set(name, [])
      elementsByName.get(name)!.push(child as Element)
    }
  }

  // Text-Content: Falls nur Text-Nodes + eventuell Attribute, als "text" speichern
  let textContent = ''
  for (const child of element.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child.textContent ?? '').trim()
      if (text) textContent += text + ' '
    }
  }
  textContent = textContent.trim()

  if (textContent && elementsByName.size === 0) {
    result['text'] = textContent
  }

  // Elemente verarbeiten
  for (const [name, elements] of elementsByName) {
    if (elements.length === 1) {
      result[name] = elementToObject(elements[0])
    } else {
      result[name] = elements.map((el) => elementToObject(el))
    }
  }

  return Object.keys(result).length === 0 ? textContent || null : result
}
