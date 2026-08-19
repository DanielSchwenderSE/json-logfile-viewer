import { FormEvent, useEffect, useState } from 'react'
import { useAppStore } from '../store'
import { createUser, deleteUser, fetchUsers, updateUser, type ManagedUser } from '../lib/api'

export default function UserManagement() {
  const { user, setActiveView } = useAppStore()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const [creating, setCreating] = useState(false)

  const [busyEmail, setBusyEmail] = useState<string | null>(null)
  const [resetTarget, setResetTarget] = useState<string | null>(null)
  const [resetPassword, setResetPassword] = useState('')

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      setUsers(await fetchUsers())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Benutzer konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setCreating(true)
    try {
      await createUser(email.trim(), password, role, displayName.trim() || undefined)
      setEmail('')
      setPassword('')
      setDisplayName('')
      setRole('user')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Benutzer konnte nicht angelegt werden')
    } finally {
      setCreating(false)
    }
  }

  async function onToggleRole(u: ManagedUser) {
    setError(null)
    setBusyEmail(u.username)
    try {
      const nextRole = u.role === 'admin' ? 'user' : 'admin'
      await updateUser(u.username, { role: nextRole })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rolle konnte nicht geändert werden')
    } finally {
      setBusyEmail(null)
    }
  }

  async function onResetPassword(e: FormEvent) {
    e.preventDefault()
    if (!resetTarget) return
    setError(null)
    setBusyEmail(resetTarget)
    try {
      await updateUser(resetTarget, { password: resetPassword })
      setResetTarget(null)
      setResetPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passwort konnte nicht zurückgesetzt werden')
    } finally {
      setBusyEmail(null)
    }
  }

  async function onDelete(u: ManagedUser) {
    if (!confirm(`Benutzer "${u.username}" wirklich löschen?`)) return
    setError(null)
    setBusyEmail(u.username)
    try {
      await deleteUser(u.username)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Benutzer konnte nicht gelöscht werden')
    } finally {
      setBusyEmail(null)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-2 dark:border-slate-800">
        <span className="font-semibold">Benutzerverwaltung</span>
        <button
          onClick={() => setActiveView('viewer')}
          className="ml-auto rounded-lg border border-slate-300 px-2 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          ← Zurück zum Viewer
        </button>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 overflow-auto p-4">
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form
          onSubmit={onCreate}
          className="mb-6 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
        >
          <h2 className="mb-3 text-sm font-semibold">Neuen Benutzer anlegen</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">E-Mail-Adresse</label>
              <input
                type="email"
                required
                className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 outline-none focus:border-blue-500 dark:border-slate-700"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Anzeigename (optional)</label>
              <input
                className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 outline-none focus:border-blue-500 dark:border-slate-700"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Initiales Passwort</label>
              <input
                type="text"
                required
                minLength={8}
                className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 outline-none focus:border-blue-500 dark:border-slate-700"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">Mind. 8 Zeichen. Der Benutzer kann es später selbst ändern.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Rolle</label>
              <select
                className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900"
                value={role}
                onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
              >
                <option value="user">Benutzer</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={creating || !email || password.length < 8}
            className="mt-4 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Wird angelegt …' : 'Benutzer anlegen'}
          </button>
        </form>

        <h2 className="mb-2 text-sm font-semibold">Bestehende Benutzer</h2>
        {loading ? (
          <div className="text-sm text-slate-500">Lädt …</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs font-medium text-slate-500 dark:bg-slate-900">
                <tr>
                  <th className="px-3 py-2">E-Mail</th>
                  <th className="px-3 py-2">Anzeigename</th>
                  <th className="px-3 py-2">Rolle</th>
                  <th className="px-3 py-2 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.username} className="border-t border-slate-100 dark:border-slate-800/70">
                    <td className="mono px-3 py-2">{u.username}</td>
                    <td className="px-3 py-2">{u.displayName ?? '–'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          'rounded border px-1.5 py-0.5 text-[11px] font-medium ' +
                          (u.role === 'admin'
                            ? 'border-blue-400 text-blue-600 dark:text-blue-400'
                            : 'border-slate-300 text-slate-500 dark:border-slate-700')
                        }
                      >
                        {u.role === 'admin' ? 'Administrator' : 'Benutzer'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          disabled={busyEmail === u.username}
                          onClick={() => onToggleRole(u)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
                        >
                          {u.role === 'admin' ? 'Zu Benutzer machen' : 'Zu Admin machen'}
                        </button>
                        <button
                          onClick={() => {
                            setResetTarget(u.username)
                            setResetPassword('')
                          }}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                        >
                          Passwort zurücksetzen
                        </button>
                        <button
                          disabled={busyEmail === u.username || u.username.toLowerCase() === user?.username.toLowerCase()}
                          onClick={() => onDelete(u)}
                          className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                        >
                          Löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {resetTarget && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/30 p-4">
            <form
              onSubmit={onResetPassword}
              className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900"
            >
              <h3 className="mb-3 text-sm font-semibold">Passwort zurücksetzen für {resetTarget}</h3>
              <input
                type="text"
                required
                minLength={8}
                autoFocus
                placeholder="Neues Passwort (mind. 8 Zeichen)"
                className="mb-3 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 outline-none focus:border-blue-500 dark:border-slate-700"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={resetPassword.length < 8}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
