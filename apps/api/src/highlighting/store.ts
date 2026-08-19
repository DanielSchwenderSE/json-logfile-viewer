import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

export interface HighlightRule {
  id: string
  pattern: string
  isRegex: boolean
  color: string
  backgroundColor: string
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  textDecoration: 'none' | 'underline'
}

export interface HighlightingProfile {
  id: string
  name: string
  rules: HighlightRule[]
  createdAt: number
  updatedAt: number
}

interface ProfilesFile {
  profiles: HighlightingProfile[]
}

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(process.cwd(), 'data')
const PROFILES_FILE = path.join(DATA_DIR, 'highlighting-profiles.json')

async function readFile(): Promise<ProfilesFile> {
  try {
    const raw = await fs.readFile(PROFILES_FILE, 'utf8')
    const data = JSON.parse(raw) as ProfilesFile
    if (!Array.isArray(data.profiles)) return { profiles: [] }
    return data
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { profiles: [] }
    throw err
  }
}

async function writeFile(data: ProfilesFile): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(PROFILES_FILE, JSON.stringify(data, null, 2), 'utf8')
}

export const highlightingProfileStore = {
  async list(): Promise<HighlightingProfile[]> {
    return (await readFile()).profiles
  },

  async find(id: string): Promise<HighlightingProfile | undefined> {
    return (await readFile()).profiles.find((p) => p.id === id)
  },

  async create(name: string): Promise<HighlightingProfile> {
    const now = Date.now()
    const profile: HighlightingProfile = {
      id: randomUUID(),
      name,
      rules: [],
      createdAt: now,
      updatedAt: now,
    }
    const data = await readFile()
    data.profiles.push(profile)
    await writeFile(data)
    return profile
  },

  async update(profile: HighlightingProfile): Promise<void> {
    const data = await readFile()
    const idx = data.profiles.findIndex((p) => p.id === profile.id)
    if (idx === -1) throw new Error(`Profile ${profile.id} not found`)
    data.profiles[idx] = { ...profile, updatedAt: Date.now() }
    await writeFile(data)
  },

  async delete(id: string): Promise<boolean> {
    const data = await readFile()
    const before = data.profiles.length
    data.profiles = data.profiles.filter((p) => p.id !== id)
    if (data.profiles.length === before) return false
    await writeFile(data)
    return true
  },

  async addRule(profileId: string, rule: Omit<HighlightRule, 'id'>): Promise<HighlightRule> {
    const data = await readFile()
    const profile = data.profiles.find((p) => p.id === profileId)
    if (!profile) throw new Error(`Profile ${profileId} not found`)
    const newRule: HighlightRule = { ...rule, id: randomUUID() }
    profile.rules.push(newRule)
    profile.updatedAt = Date.now()
    await writeFile(data)
    return newRule
  },

  async updateRule(profileId: string, rule: HighlightRule): Promise<void> {
    const data = await readFile()
    const profile = data.profiles.find((p) => p.id === profileId)
    if (!profile) throw new Error(`Profile ${profileId} not found`)
    const idx = profile.rules.findIndex((r) => r.id === rule.id)
    if (idx === -1) throw new Error(`Rule ${rule.id} not found`)
    profile.rules[idx] = rule
    profile.updatedAt = Date.now()
    await writeFile(data)
  },

  async deleteRule(profileId: string, ruleId: string): Promise<boolean> {
    const data = await readFile()
    const profile = data.profiles.find((p) => p.id === profileId)
    if (!profile) return false
    const before = profile.rules.length
    profile.rules = profile.rules.filter((r) => r.id !== ruleId)
    if (profile.rules.length === before) return false
    profile.updatedAt = Date.now()
    await writeFile(data)
    return true
  },
}
