import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import express from 'express'
import session from 'express-session'
import { LocalAuthProvider } from './auth/LocalAuthProvider.js'
import { createAuthRouter, requireAuth } from './auth/routes.js'
import { createHighlightingRouter } from './highlighting/routes.js'
import { createUserRouter } from './users/routes.js'
import { userStore } from './users/store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PORT = Number(process.env.PORT ?? 3001)
const isProd = process.env.NODE_ENV === 'production'
// Verzeichnis der gebauten Frontend-Dateien (im Docker-Image gesetzt).
const WEB_DIR = process.env.WEB_DIR ?? path.resolve(__dirname, '../../web/dist')

async function main() {
  await seedInitialAdmin()

  const app = express()
  const provider = new LocalAuthProvider()

  // Hinter einem Reverse-Proxy (z. B. nginx/Traefik) für korrekte Secure-Cookies.
  if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1)

  app.use(express.json({ limit: '1mb' }))

  app.use(
    session({
      name: 'jlv.sid',
      secret: process.env.SESSION_SECRET ?? 'dev-secret-bitte-in-produktion-setzen',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.COOKIE_SECURE === 'true',
        maxAge: 1000 * 60 * 60 * 8, // 8 Stunden
      },
    }),
  )

  app.get('/api/health', (_req, res) => res.json({ ok: true }))
  app.use('/api', createAuthRouter(provider))
  app.use('/api/highlighting-profiles', createHighlightingRouter())
  app.use('/api/users', createUserRouter())

  // Beispiel für einen später geschützten API-Bereich (z. B. serverseitiger
  // Log-Abruf). Schon jetzt hinter requireAuth, damit die Erweiterung einfach ist.
  app.get('/api/protected/ping', requireAuth, (_req, res) => res.json({ ok: true }))

  // Frontend ausliefern (Produktion). Im Dev übernimmt das der Vite-Dev-Server.
  if (isProd) {
    app.use(express.static(WEB_DIR))
    app.get('*', (_req, res) => res.sendFile(path.join(WEB_DIR, 'index.html')))
  }

  app.listen(PORT, () => {
    console.log(`[jlv] API läuft auf http://localhost:${PORT} (prod=${isProd})`)
  })
}

/**
 * Legt beim ersten Start einen Admin an, falls noch kein Nutzer existiert.
 * Quelle: ADMIN_USER/ADMIN_PASSWORD; ohne diese wird als Notbehelf admin/admin
 * angelegt (mit deutlicher Warnung).
 */
async function seedInitialAdmin() {
  const users = await userStore.list()
  if (users.length > 0) return

  const username = process.env.ADMIN_USER ?? 'admin'
  const password = process.env.ADMIN_PASSWORD ?? 'admin'
  await userStore.upsert(username, password, 'Administrator', 'admin')

  if (!process.env.ADMIN_PASSWORD) {
    console.warn(
      '\n[jlv] ACHTUNG: Kein ADMIN_PASSWORD gesetzt – Standardkonto "admin/admin" angelegt.\n' +
        '      Bitte umgehend ändern: npm run create-user -- --username admin --password <neu>\n',
    )
  } else {
    console.log(`[jlv] Initiales Admin-Konto "${username}" angelegt.`)
  }
}

// Sicherstellen, dass das Datenverzeichnis existiert (für Docker-Volume).
await fs.mkdir(process.env.DATA_DIR ?? path.resolve(process.cwd(), 'data'), { recursive: true }).catch(() => {})

main().catch((err) => {
  console.error('[jlv] Startfehler:', err)
  process.exit(1)
})
