import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from './firebase'
import { Login } from './components/Login'
import { Dashboard } from './components/Dashboard'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(
        auth, 
        (currentUser) => {
      setUser(currentUser)
          setLoading(false)
        },
        (err) => {
          console.error('Auth error:', err)
          setError(err.message)
          setLoading(false)
        }
      )
      return () => unsubscribe()
    } catch (err: any) {
      console.error('App initialization error:', err)
      setError(err.message || 'Failed to initialize app')
      setLoading(false)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 max-w-md">
          <h2 className="text-red-400 text-xl font-bold mb-2">Error</h2>
          <p className="text-red-300 mb-4">{error}</p>
          <p className="text-sm text-slate-400">
            Check the browser console (F12) for more details.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {user ? <Dashboard /> : <Login />}
    </>
  )
}

export default App
