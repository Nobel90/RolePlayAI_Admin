import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ArrowRight, Loader2, Shield } from 'lucide-react'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err: any) {
      console.error("Login error:", err)
      setError('Failed to log in. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-shell flex min-h-screen items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none opacity-70">
        <div className="absolute left-10 top-20 h-72 w-72 rounded-full bg-foreground/5 blur-3xl" />
        <div className="absolute bottom-12 right-12 h-80 w-80 rounded-full bg-foreground/4 blur-3xl" />
      </div>
      <Card className="relative z-10 w-full max-w-md border-border/80 bg-card/90 shadow-[0_30px_80px_rgba(0,0,0,0.12)] animate-fade-in">
        <CardHeader className="space-y-4 pb-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/80 bg-background">
              <Shield className="h-6 w-6" />
            </div>
            <div className="text-right">
              <p className="admin-kicker">RolePlayAI</p>
              <CardTitle className="text-2xl">Admin Console</CardTitle>
            </div>
          </div>
          <CardDescription className="max-w-sm">
            Sign in to manage launcher settings, DLC workflows, and catalog publishing.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="admin@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-3">
                <p className="text-center text-sm text-red-600">{error}</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Authorized access only. Activity is audited.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
