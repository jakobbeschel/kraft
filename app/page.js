'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './lib/supabase'

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      setLoading(false)
    }
    checkSession()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">

      <nav className="flex items-center justify-between px-8 py-5 border-b border-zinc-800">
        <a href="/" className="text-xl font-semibold tracking-tight hover:text-zinc-300 transition-colors">Kraft</a>
        <div className="flex items-center gap-4">
          {!loading && (
            user ? (
              <>
                <a href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors">Dashboard</a>
                <a href="/library" className="text-sm text-zinc-400 hover:text-white transition-colors">Library</a>
                <a href="/program" className="text-sm text-zinc-400 hover:text-white transition-colors">Program</a>
                <span className="text-sm text-zinc-600">|</span>
                <span className="text-sm text-zinc-500">{user.email}</span>
                <button onClick={handleSignOut} className="text-sm text-zinc-400 hover:text-white transition-colors">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <a href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors">Log in</a>
                <a href="/signup" className="text-sm bg-white text-zinc-950 px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors font-medium">
                  Get started
                </a>
              </>
            )
          )}
        </div>
      </nav>

      <section className="flex flex-col items-center justify-center text-center px-6 py-32">
        <span className="text-sm text-zinc-500 uppercase tracking-widest mb-6">
          Functional fitness tracking
        </span>
        <h1 className="text-5xl font-bold tracking-tight max-w-2xl leading-tight mb-6">
          Built for kettlebells,<br />calisthenics, and real movement
        </h1>
        <p className="text-zinc-400 text-lg max-w-xl mb-10">
          Kraft is a training tracker designed for the way you actually train -
          complexes, bodyweight flows, and runs. Not just sets and barbells.
        </p>
        <div className="flex items-center gap-4">
          {user ? (
            <a href="/dashboard" className="bg-white text-zinc-950 px-6 py-3 rounded-lg font-medium hover:bg-zinc-200 transition-colors">
              Go to dashboard
            </a>
          ) : (
            <>
              <a href="/signup" className="bg-white text-zinc-950 px-6 py-3 rounded-lg font-medium hover:bg-zinc-200 transition-colors">
                Start for free
              </a>
              <a href="#features" className="text-zinc-400 hover:text-white transition-colors text-sm">
                See how it works →
              </a>
            </>
          )}
        </div>
      </section>

      <section id="features" className="px-8 py-24 max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold text-center mb-16">Everything your training needs</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
            <div className="text-2xl mb-4">🔗</div>
            <h3 className="font-semibold mb-2">Complex tracking</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Log multi-movement sequences as a single rep. Built for the way kettlebell training actually works.
            </p>
          </div>

          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
            <div className="text-2xl mb-4">🏃</div>
            <h3 className="font-semibold mb-2">Run + lift days</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Track runs and strength in the same session. Log pace, distance, intervals, and weights all in one place.
            </p>
          </div>

          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
            <div className="text-2xl mb-4">📚</div>
            <h3 className="font-semibold mb-2">Movement library</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Every exercise explained with descriptions and visuals. Perfect for learning new movements and complexes.
            </p>
          </div>

        </div>
      </section>

      <footer className="border-t border-zinc-800 px-8 py-6 text-center text-zinc-600 text-sm">
        © 2026 Kraft. All rights reserved.
      </footer>

    </main>
  )
}
