import type { AuthProvider, AuthUser } from './AuthProvider.js'
import { userStore } from '../users/store.js'

/**
 * Prüft Anmeldedaten gegen den lokalen, dateibasierten Benutzer-Store.
 * (Platzhalter für einen späteren AdAuthProvider mit gleicher Schnittstelle.)
 */
export class LocalAuthProvider implements AuthProvider {
  async verify(username: string, password: string): Promise<AuthUser | null> {
    const user = await userStore.find(username)
    if (!user) return null
    const ok = await userStore.verifyPassword(user, password)
    if (!ok) return null
    return { username: user.username, displayName: user.displayName, role: user.role }
  }
}
