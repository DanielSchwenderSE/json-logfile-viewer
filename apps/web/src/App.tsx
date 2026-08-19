import { useEffect } from 'react'
import { useAppStore } from './store'
import { fetchCurrentUser } from './lib/api'
import Login from './pages/Login'
import Viewer from './pages/Viewer'
import UserManagement from './pages/UserManagement'

export default function App() {
  const { user, authChecked, setUser, setAuthChecked, activeView } = useAppStore()

  // Beim Start prüfen, ob bereits eine gültige Session besteht.
  useEffect(() => {
    fetchCurrentUser()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setAuthChecked(true))
  }, [setUser, setAuthChecked])

  if (!authChecked) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Lädt …
      </div>
    )
  }

  if (!user) return <Login />
  if (activeView === 'users' && user.role === 'admin') return <UserManagement />
  return <Viewer />
}
