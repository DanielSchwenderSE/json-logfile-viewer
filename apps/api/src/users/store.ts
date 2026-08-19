import { promises as fs } from 'node:fs'
import path from 'node:path'
import bcrypt from 'bcryptjs'

// Speicherort der Benutzerdatei (über Umgebungsvariable überschreibbar, z. B.
// für ein Docker-Volume).
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')

export type UserRole = 'user' | 'admin'

export interface StoredUser {
  username: string
  displayName?: string
  passwordHash: string
  role: UserRole
}

interface UsersFile {
  users: StoredUser[]
}

async function readFile(): Promise<UsersFile> {
  try {
    const raw = await fs.readFile(USERS_FILE, 'utf8')
    const data = JSON.parse(raw) as UsersFile
    if (!Array.isArray(data.users)) return { users: [] }
    // Migration: Konten aus einer Zeit vor Rollen hatten faktisch alle
    // Admin-Rechte (es gab nur eine Nutzerklasse) — ohne diesen Fallback
    // würde ein Upgrade das bestehende Admin-Konto aussperren.
    data.users = data.users.map((u) => ({ ...u, role: u.role ?? 'admin' }))
    return data
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { users: [] }
    throw err
  }
}

async function writeFile(data: UsersFile): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2), 'utf8')
}

/**
 * Einfacher, dateibasierter Benutzer-Store für manuell angelegte Konten.
 * Bewusst ohne Datenbank – bei einer Handvoll Helpdesk-Konten ausreichend und
 * ohne native Abhängigkeiten. Bei Bedarf später gegen eine echte DB tauschbar.
 */
export const userStore = {
  async list(): Promise<StoredUser[]> {
    return (await readFile()).users
  },

  async find(username: string): Promise<StoredUser | undefined> {
    const uname = username.trim().toLowerCase()
    return (await readFile()).users.find((u) => u.username.toLowerCase() === uname)
  },

  /** Legt ein neues Konto an oder ändert Passwort/Anzeigename eines bestehenden. */
  async upsert(username: string, password: string, displayName?: string, role: UserRole = 'user'): Promise<void> {
    const data = await readFile()
    const passwordHash = await bcrypt.hash(password, 10)
    const uname = username.trim()
    const existing = data.users.find((u) => u.username.toLowerCase() === uname.toLowerCase())
    if (existing) {
      existing.passwordHash = passwordHash
      if (displayName !== undefined) existing.displayName = displayName
      existing.role = role
    } else {
      data.users.push({ username: uname, displayName, passwordHash, role })
    }
    await writeFile(data)
  },

  /** Legt ein neues Konto an; wirft, falls die E-Mail/der Benutzername bereits existiert. */
  async create(username: string, password: string, role: UserRole, displayName?: string): Promise<StoredUser> {
    const data = await readFile()
    const uname = username.trim()
    const existing = data.users.find((u) => u.username.toLowerCase() === uname.toLowerCase())
    if (existing) throw new Error('Benutzer existiert bereits')
    const passwordHash = await bcrypt.hash(password, 10)
    const user: StoredUser = { username: uname, displayName, passwordHash, role }
    data.users.push(user)
    await writeFile(data)
    return user
  },

  async updateRole(username: string, role: UserRole): Promise<boolean> {
    const data = await readFile()
    const user = data.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase())
    if (!user) return false
    user.role = role
    await writeFile(data)
    return true
  },

  async updateDisplayName(username: string, displayName: string): Promise<boolean> {
    const data = await readFile()
    const user = data.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase())
    if (!user) return false
    user.displayName = displayName
    await writeFile(data)
    return true
  },

  async setPassword(username: string, password: string): Promise<boolean> {
    const data = await readFile()
    const user = data.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase())
    if (!user) return false
    user.passwordHash = await bcrypt.hash(password, 10)
    await writeFile(data)
    return true
  },

  async remove(username: string): Promise<boolean> {
    const data = await readFile()
    const before = data.users.length
    data.users = data.users.filter((u) => u.username.toLowerCase() !== username.trim().toLowerCase())
    if (data.users.length === before) return false
    await writeFile(data)
    return true
  },

  async verifyPassword(user: StoredUser, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash)
  },
}

export { USERS_FILE, DATA_DIR }
