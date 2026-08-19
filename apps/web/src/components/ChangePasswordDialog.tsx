import { FormEvent, useState } from 'react'
import { changeOwnPassword } from '../lib/api'

interface Props {
  onClose: () => void
}

export default function ChangePasswordDialog({ onClose }: Props) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (newPassword !== confirmPassword) {
      setError('Neue Passwörter stimmen nicht überein')
      return
    }
    setBusy(true)
    try {
      await changeOwnPassword(currentPassword, newPassword)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passwort konnte nicht geändert werden')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900"
      >
        <h3 className="mb-3 text-sm font-semibold">Passwort ändern</h3>

        {success ? (
          <>
            <p className="mb-4 text-sm text-green-600 dark:text-green-400">Passwort wurde geändert.</p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Schließen
            </button>
          </>
        ) : (
          <>
            <label className="mb-1 block text-sm font-medium">Aktuelles Passwort</label>
            <input
              type="password"
              autoFocus
              autoComplete="current-password"
              className="mb-3 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 outline-none focus:border-blue-500 dark:border-slate-700"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <label className="mb-1 block text-sm font-medium">Neues Passwort</label>
            <input
              type="password"
              minLength={8}
              autoComplete="new-password"
              className="mb-3 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 outline-none focus:border-blue-500 dark:border-slate-700"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <label className="mb-1 block text-sm font-medium">Neues Passwort bestätigen</label>
            <input
              type="password"
              minLength={8}
              autoComplete="new-password"
              className="mb-4 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 outline-none focus:border-blue-500 dark:border-slate-700"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            {error && (
              <div className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={busy || !currentPassword || newPassword.length < 8}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {busy ? 'Speichert …' : 'Speichern'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
