import { Router } from 'express'
import { requireAuth } from '../auth/routes.js'
import { highlightingProfileStore, type HighlightRule } from './store.js'

export function createHighlightingRouter(): Router {
  const router = Router()

  // Alle Profile auflisten
  router.get('/', requireAuth, async (_req, res) => {
    try {
      const profiles = await highlightingProfileStore.list()
      res.json({ profiles })
    } catch (err) {
      res.status(500).json({ error: 'Fehler beim Abrufen der Profile' })
    }
  })

  // Einzelnes Profil abrufen
  router.get('/:id', requireAuth, async (req, res) => {
    try {
      const profile = await highlightingProfileStore.find(req.params.id)
      if (!profile) return res.status(404).json({ error: 'Profil nicht gefunden' })
      res.json({ profile })
    } catch (err) {
      res.status(500).json({ error: 'Fehler beim Abrufen des Profils' })
    }
  })

  // Neues Profil erstellen
  router.post('/', requireAuth, async (req, res) => {
    const { name } = req.body ?? {}
    if (typeof name !== 'string' || !name.trim())
      return res.status(400).json({ error: 'Profilname erforderlich' })
    try {
      const profile = await highlightingProfileStore.create(name.trim())
      res.status(201).json({ profile })
    } catch (err) {
      res.status(500).json({ error: 'Fehler beim Erstellen des Profils' })
    }
  })

  // Profil aktualisieren
  router.put('/:id', requireAuth, async (req, res) => {
    const { name, rules } = req.body ?? {}
    if (typeof name !== 'string' || !name.trim())
      return res.status(400).json({ error: 'Profilname erforderlich' })
    if (!Array.isArray(rules)) return res.status(400).json({ error: 'Rules erforderlich' })
    try {
      const profile = await highlightingProfileStore.find(req.params.id)
      if (!profile) return res.status(404).json({ error: 'Profil nicht gefunden' })
      await highlightingProfileStore.update({ ...profile, name: name.trim(), rules })
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: 'Fehler beim Aktualisieren des Profils' })
    }
  })

  // Profil löschen
  router.delete('/:id', requireAuth, async (req, res) => {
    try {
      const ok = await highlightingProfileStore.delete(req.params.id)
      if (!ok) return res.status(404).json({ error: 'Profil nicht gefunden' })
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: 'Fehler beim Löschen des Profils' })
    }
  })

  // Regel zu Profil hinzufügen
  router.post('/:id/rules', requireAuth, async (req, res) => {
    const rule = req.body as Omit<HighlightRule, 'id'> | undefined
    if (!rule || typeof rule.pattern !== 'string')
      return res.status(400).json({ error: 'Ungültige Regel' })
    try {
      const newRule = await highlightingProfileStore.addRule(req.params.id, rule)
      res.status(201).json({ rule: newRule })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fehler'
      res.status(400).json({ error: msg })
    }
  })

  // Regel aktualisieren
  router.put('/:id/rules/:ruleId', requireAuth, async (req, res) => {
    const rule = req.body as HighlightRule | undefined
    if (!rule) return res.status(400).json({ error: 'Ungültige Regel' })
    try {
      await highlightingProfileStore.updateRule(req.params.id, rule)
      res.json({ ok: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fehler'
      res.status(400).json({ error: msg })
    }
  })

  // Regel löschen
  router.delete('/:id/rules/:ruleId', requireAuth, async (req, res) => {
    try {
      const ok = await highlightingProfileStore.deleteRule(req.params.id, req.params.ruleId)
      if (!ok) return res.status(404).json({ error: 'Regel nicht gefunden' })
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: 'Fehler beim Löschen der Regel' })
    }
  })

  return router
}
