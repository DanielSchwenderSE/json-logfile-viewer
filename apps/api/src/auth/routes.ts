import { Router, type RequestHandler } from 'express'
import type { AuthProvider, AuthUser } from './AuthProvider.js'
import { userStore } from '../users/store.js'

// Session um das Nutzerobjekt erweitern.
declare module 'express-session' {
  interface SessionData {
    user?: AuthUser
  }
}

/** Blockt nicht angemeldete Anfragen mit 401. */
export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.session.user) return next()
  res.status(401).json({ error: 'Nicht angemeldet' })
}

/** Blockt Anfragen von Nicht-Admins mit 403 (setzt eine bestehende Session voraus). */
export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ error: 'Nicht angemeldet' })
  if (req.session.user.role !== 'admin') return res.status(403).json({ error: 'Nur für Administratoren' })
  next()
}

export function createAuthRouter(provider: AuthProvider): Router {
  const router = Router()

  router.post('/login', async (req, res) => {
    const { username, password } = req.body ?? {}
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return res.status(400).json({ error: 'Benutzername und Passwort erforderlich' })
    }
    try {
      const user = await provider.verify(username, password)
      if (!user) return res.status(401).json({ error: 'Ungültige Anmeldedaten' })

      // Session-Fixation vermeiden: Session-ID nach Login erneuern.
      req.session.regenerate((err) => {
        if (err) return res.status(500).json({ error: 'Session-Fehler' })
        req.session.user = user
        res.json({ user })
      })
    } catch {
      res.status(500).json({ error: 'Interner Fehler bei der Anmeldung' })
    }
  })

  router.post('/logout', (req, res) => {
    req.session.destroy(() => {
      res.clearCookie('jlv.sid')
      res.json({ ok: true })
    })
  })

  router.get('/me', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Nicht angemeldet' })
    res.json({ user: req.session.user })
  })

  // Eigenes Passwort ändern — verlangt das aktuelle Passwort, damit eine
  // gekaperte Session allein nicht ausreicht, um das Konto zu übernehmen.
  router.post('/me/password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body ?? {}
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !newPassword) {
      return res.status(400).json({ error: 'Aktuelles und neues Passwort erforderlich' })
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Neues Passwort muss mindestens 8 Zeichen lang sein' })
    }
    const username = req.session.user!.username
    const user = await userStore.find(username)
    if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' })
    const ok = await userStore.verifyPassword(user, currentPassword)
    if (!ok) return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' })
    await userStore.setPassword(username, newPassword)
    res.json({ ok: true })
  })

  return router
}
