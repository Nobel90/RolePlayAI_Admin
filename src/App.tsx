import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from './firebase'
import { Login } from './components/Login'
import { Dashboard } from './components/Dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, ShieldCheck, TriangleAlert } from 'lucide-react'

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
      <div className="admin-shell flex h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md animate-fade-in">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/80 bg-background">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <CardTitle>Loading Admin</CardTitle>
            <CardDescription>Checking session and restoring your workspace.</CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            The dashboard will appear once authentication is ready.
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="admin-shell flex h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-500/30 bg-background/95 animate-fade-in">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-500">
              <TriangleAlert className="h-6 w-6" />
            </div>
            <CardTitle>Admin Error</CardTitle>
            <CardDescription>We could not initialize the dashboard session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-600">
              {error}
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Check the browser console for a stack trace and verify your Firebase configuration.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      {user ? <Dashboard /> : <Login />}
    </div>
  )
}

export default App
