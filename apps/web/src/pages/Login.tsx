import { FormEvent, useState } from 'react'
import { login } from '../lib/api'
import { useAppStore } from '../store'

export default function Login() {
  const setUser = useAppStore((s) => s.setUser)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const user = await login(username.trim(), password)
      setUser(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold">JSON Log Viewer</h1>
          <p className="text-sm text-slate-500">Helpdesk-Anmeldung</p>
        </div>

        <label className="mb-1 block text-sm font-medium">E-Mail-Adresse</label>
        <input
          type="email"
          className="mb-4 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 outline-none focus:border-blue-500 dark:border-slate-700"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          autoComplete="email"
        />

        <label className="mb-1 block text-sm font-medium">Passwort</label>
        <input
          type="password"
          className="mb-4 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 outline-none focus:border-blue-500 dark:border-slate-700"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy || !username || !password}
          className="w-full rounded-lg bg-blue-600 px-3 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? 'Anmelden …' : 'Anmelden'}
        </button>
      </form>
    </div>
  )
}
