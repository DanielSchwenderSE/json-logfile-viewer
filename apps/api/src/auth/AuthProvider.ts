// Auth-Abstraktion: Das Backend spricht nur gegen dieses Interface. Aktuell gibt
// es den LocalAuthProvider (Benutzer aus einer JSON-Datei). Später kann ein
// AdAuthProvider (LDAP/Entra ID) ergänzt werden, ohne die Routen zu ändern.

export interface AuthUser {
  username: string
  displayName?: string
  role: 'user' | 'admin'
}

export interface AuthProvider {
  /**
   * Prüft Anmeldedaten. Gibt den Nutzer bei Erfolg zurück, sonst null.
   */
  verify(username: string, password: string): Promise<AuthUser | null>
}
