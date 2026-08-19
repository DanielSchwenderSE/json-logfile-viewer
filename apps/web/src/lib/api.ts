// Schmaler Client für die Auth-Endpunkte des Backends.

import type { HighlightingProfile } from './types'

export interface CurrentUser {
  username: string
  displayName?: string
  role: 'user' | 'admin'
}

export interface ManagedUser {
  username: string
  displayName?: string
  role: 'user' | 'admin'
}

async function json<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`)
  return data
}

/** Aktuell angemeldeten Nutzer abfragen (null wenn nicht angemeldet). */
export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const res = await fetch('/api/me', { credentials: 'include' })
  if (res.status === 401) return null
  const data = await json<{ user: CurrentUser }>(res)
  return data.user
}

export async function login(username: string, password: string): Promise<CurrentUser> {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  })
  const data = await json<{ user: CurrentUser }>(res)
  return data.user
}

export async function logout(): Promise<void> {
  await fetch('/api/logout', { method: 'POST', credentials: 'include' })
}

/** Eigenes Passwort ändern (verlangt das aktuelle Passwort). */
export async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetch('/api/me/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  await json(res)
}

/** Alle Benutzerkonten abrufen (nur Admins). */
export async function fetchUsers(): Promise<ManagedUser[]> {
  const res = await fetch('/api/users', { credentials: 'include' })
  const data = await json<{ users: ManagedUser[] }>(res)
  return data.users
}

/** Neuen Benutzer anlegen (nur Admins). */
export async function createUser(
  email: string,
  password: string,
  role: 'user' | 'admin',
  displayName?: string,
): Promise<ManagedUser> {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password, role, displayName }),
  })
  const data = await json<{ user: ManagedUser }>(res)
  return data.user
}

/** Rolle, Anzeigename und/oder Passwort eines Benutzers ändern (nur Admins). */
export async function updateUser(
  email: string,
  changes: { role?: 'user' | 'admin'; displayName?: string; password?: string },
): Promise<ManagedUser> {
  const res = await fetch(`/api/users/${encodeURIComponent(email)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(changes),
  })
  const data = await json<{ user: ManagedUser }>(res)
  return data.user
}

/** Benutzer löschen (nur Admins). */
export async function deleteUser(email: string): Promise<void> {
  const res = await fetch(`/api/users/${encodeURIComponent(email)}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  await json(res)
}

/** Alle Highlighting-Profile abrufen. */
export async function fetchHighlightingProfiles(): Promise<HighlightingProfile[]> {
  const res = await fetch('/api/highlighting-profiles', { credentials: 'include' })
  const data = await json<{ profiles: HighlightingProfile[] }>(res)
  return data.profiles
}

/** Neues Highlighting-Profil erstellen. */
export async function createHighlightingProfile(name: string): Promise<HighlightingProfile> {
  const res = await fetch('/api/highlighting-profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name }),
  })
  const data = await json<{ profile: HighlightingProfile }>(res)
  return data.profile
}

/** Highlighting-Profil aktualisieren. */
export async function updateHighlightingProfile(profile: HighlightingProfile): Promise<void> {
  const res = await fetch(`/api/highlighting-profiles/${profile.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(profile),
  })
  if (!res.ok) throw new Error('Fehler beim Aktualisieren des Profils')
}

/** Highlighting-Profil löschen. */
export async function deleteHighlightingProfile(profileId: string): Promise<void> {
  const res = await fetch(`/api/highlighting-profiles/${profileId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Fehler beim Löschen des Profils')
}

