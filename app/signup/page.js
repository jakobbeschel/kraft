// This is the sign up page — new users create their Kraft account here

'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function SignUp() {
  // These hold whatever the user types into the form fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // This runs when the user clicks "Create account"
  async function handleSignUp() {
    setError(null)

    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
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
          <h1 className="text-lg font-semibold mb-1">Create your account</h1>
          <p className="text-zinc-400 text-sm mb-6">Start tracking your training for free</p>

          {/* Show this message after successful sign up */}
          {success ? (
            <div className="bg-green-950 border border-green-800 text-green-400 text-sm rounded-lg px-4 py-3">
              Account created! Check your email to confirm, then{' '}
              <a href="/login" className="underline">log in</a>.
            </div>
          ) : (
            <>
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
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-zinc-500"
                  />
                </div>

                {/* Show error message if something goes wrong */}
                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}

                <button
                  onClick={handleSignUp}
                  className="w-full bg-white text-zinc-950 rounded-lg py-2.5 text-sm font-medium hover:bg-zinc-200 transition-colors"
                >
                  Create account
                </button>
              </div>

              <p className="text-center text-zinc-400 text-sm mt-6">
                Already have an account?{' '}
                <a href="/login" className="text-white hover:underline">Log in</a>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
