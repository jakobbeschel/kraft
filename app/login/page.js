// This is the log in page — existing users sign in to Kraft here

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function Login() {
  // These hold whatever the user types into the form fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  // Router lets us send the user to a different page after logging in
  const router = useRouter()

  // This runs when the user clicks "Log in"
  async function handleLogin() {
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
    } else {
      // Send the user to the dashboard after successful login
      router.push('/dashboard')
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <a href="/" className="block text-xl font-semibold tracking-tight text-center mb-8">
          Kraft
        </a>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <h1 className="text-lg font-semibold mb-1">Welcome back</h1>
          <p className="text-zinc-400 text-sm mb-6">Log in to your Kraft account</p>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-zinc-400 block mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-zinc-500"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                // Allow login by pressing Enter instead of clicking the button
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-zinc-500"
              />
            </div>

            {/* Show error message if login fails */}
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              onClick={handleLogin}
              className="w-full bg-white text-zinc-950 rounded-lg py-2.5 text-sm font-medium hover:bg-zinc-200 transition-colors"
            >
              Log in
            </button>
          </div>

          <p className="text-center text-zinc-400 text-sm mt-6">
            Don't have an account?{' '}
            <a href="/signup" className="text-white hover:underline">Sign up</a>
          </p>
        </div>

      </div>
    </main>
  )
}
