import { Router } from 'express'
import { requireAdmin } from '../auth/routes.js'
import { userStore, type UserRole, type StoredUser } from './store.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function toPublicUser(u: StoredUser) {
  return { username: u.username, displayName: u.displayName, role: u.role }
}

function isValidRole(role: unknown): role is UserRole {
  return role === 'user' || role === 'admin'
}

export function createUserRouter(): Router {
  const router = Router()

  router.get('/', requireAdmin, async (_req, res) => {
    const users = await userStore.list()
    res.json({ users: users.map(toPublicUser) })
  })

  router.post('/', requireAdmin, async (req, res) => {
    const { email, password, role, displayName } = req.body ?? {}
    if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ error: 'Gültige E-Mail-Adresse erforderlich' })
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' })
    }
    if (!isValidRole(role)) {
      return res.status(400).json({ error: 'Rolle muss "user" oder "admin" sein' })
    }
    try {
      const user = await userStore.create(
        email.trim(),
        password,
        role,
        typeof displayName === 'string' && displayName.trim() ? displayName.trim() : undefined,
      )
      res.status(201).json({ user: toPublicUser(user) })
    } catch (err) {
      res.status(409).json({ error: err instanceof Error ? err.message : 'Benutzer existiert bereits' })
    }
  })

  router.patch('/:email', requireAdmin, async (req, res) => {
    const email = req.params.email
    const { role, displayName, password } = req.body ?? {}
    const user = await userStore.find(email)
    if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' })

    if (role !== undefined) {
      if (!isValidRole(role)) return res.status(400).json({ error: 'Rolle muss "user" oder "admin" sein' })
      if (user.role === 'admin' && role === 'user') {
        const admins = (await userStore.list()).filter((u) => u.role === 'admin')
        if (admins.length <= 1) {
          return res.status(400).json({ error: 'Der letzte Administrator kann nicht degradiert werden' })
        }
      }
      await userStore.updateRole(email, role)
    }
    if (displayName !== undefined) {
      if (typeof displayName !== 'string') return res.status(400).json({ error: 'Ungültiger Anzeigename' })
      await userStore.updateDisplayName(email, displayName.trim())
    }
    if (password !== undefined) {
      if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' })
      }
      await userStore.setPassword(email, password)
    }
    const updated = await userStore.find(email)
    res.json({ user: toPublicUser(updated!) })
  })

  router.delete('/:email', requireAdmin, async (req, res) => {
    const email = req.params.email
    const user = await userStore.find(email)
    if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' })

    if (req.session.user!.username.toLowerCase() === user.username.toLowerCase()) {
      return res.status(400).json({ error: 'Das eigene Konto kann nicht gelöscht werden' })
    }
    if (user.role === 'admin') {
      const admins = (await userStore.list()).filter((u) => u.role === 'admin')
      if (admins.length <= 1) {
        return res.status(400).json({ error: 'Der letzte Administrator kann nicht gelöscht werden' })
      }
    }
    await userStore.remove(email)
    res.json({ ok: true })
  })

  return router
}
