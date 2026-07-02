'use client'

import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Nav from './components/Nav'

export default function Home() {
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

  return (
    <main className="min-h-screen bg-zinc-900 text-white">

      <Nav current="Home" />

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-28 pb-24">
        <span className="text-xs text-zinc-500 uppercase tracking-[0.2em] mb-6">
          Built for functional fitness
        </span>
        <h1 className="text-6xl font-bold tracking-tight max-w-2xl leading-[1.1] mb-6">
          Train with purpose.<br />Track with precision.
        </h1>
        <p className="text-zinc-400 text-lg max-w-lg mb-10 leading-relaxed">
          Kraft is a training tracker built for kettlebell athletes and calisthenics practitioners. No fluff, no barbell bias.
        </p>
        <div className="flex items-center gap-4">
          {!loading && (
            user ? (
              <a href="/dashboard" className="bg-white text-zinc-900 px-7 py-3.5 rounded-xl font-semibold hover:bg-zinc-100 transition-colors">
                Go to dashboard
              </a>
            ) : (
              <>
                <a href="/signup" className="bg-white text-zinc-900 px-7 py-3.5 rounded-xl font-semibold hover:bg-zinc-100 transition-colors">
                  Get started - free
                </a>
                <a href="/login" className="text-zinc-400 hover:text-white transition-colors text-sm">
                  Already have an account →
                </a>
              </>
            )
          )}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-8">
        <div className="border-t border-zinc-800" />
      </div>

      {/* How it works */}
      <section className="px-8 py-24 max-w-5xl mx-auto">
        <span className="block text-xs text-zinc-500 uppercase tracking-[0.2em] text-center mb-4">How it works</span>
        <h2 className="text-2xl font-semibold text-center mb-16">From program to logged in minutes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

          <div className="flex flex-col">
            <span className="text-4xl font-bold text-zinc-700 mb-4">01</span>
            <h3 className="font-semibold mb-2">Build your program</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Set up your weekly training split. Choose day types, add exercises, and pull movements straight from the library.
            </p>
          </div>

          <div className="flex flex-col">
            <span className="text-4xl font-bold text-zinc-700 mb-4">02</span>
            <h3 className="font-semibold mb-2">Log each session</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Record sets, reps, and weight for lifts. Log pace, distance, and interval splits for runs. All in one place.
            </p>
          </div>

          <div className="flex flex-col">
            <span className="text-4xl font-bold text-zinc-700 mb-4">03</span>
            <h3 className="font-semibold mb-2">Track your progress</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              See what you lifted last week. Review past sessions directly from your dashboard. Know exactly where you stand.
            </p>
          </div>

        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-8">
        <div className="border-t border-zinc-800" />
      </div>

      {/* Features */}
      <section id="features" className="px-8 py-24 max-w-5xl mx-auto">
        <span className="block text-xs text-zinc-500 uppercase tracking-[0.2em] text-center mb-4">Features</span>
        <h2 className="text-2xl font-semibold text-center mb-16">Everything your training needs</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <div className="bg-zinc-800 rounded-2xl p-6 border border-zinc-700">
            <div className="text-2xl mb-4">🔗</div>
            <h3 className="font-semibold mb-2">Complex tracking</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Log multi-movement sequences as a single rep. Built for the way kettlebell training actually works.
            </p>
          </div>

          <div className="bg-zinc-800 rounded-2xl p-6 border border-zinc-700">
            <div className="text-2xl mb-4">🏃</div>
            <h3 className="font-semibold mb-2">Run + lift days</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Track runs and strength in the same session. Log pace, distance, intervals, and weights all in one place.
            </p>
          </div>

          <div className="bg-zinc-800 rounded-2xl p-6 border border-zinc-700">
            <div className="text-2xl mb-4">📚</div>
            <h3 className="font-semibold mb-2">Movement library</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Browse kettlebell and calisthenics movements with descriptions. Pick directly from the library when building your program.
            </p>
          </div>

        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-8">
        <div className="border-t border-zinc-800" />
      </div>

      {/* Quote / pull section */}
      <section className="px-8 py-24 max-w-3xl mx-auto text-center">
        <p className="text-2xl font-medium text-zinc-300 leading-relaxed mb-6">
          "Most fitness apps are built for gym-goers with barbells. Kraft is built for people who train differently."
        </p>
        <span className="text-sm text-zinc-600">- Jakob, founder</span>
      </section>

      {/* CTA */}
      {!loading && !user && (
        <>
          <div className="max-w-5xl mx-auto px-8">
            <div className="border-t border-zinc-800" />
          </div>
          <section className="px-8 py-24 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to train smarter?</h2>
            <p className="text-zinc-400 text-sm mb-8">Join Kraft and start tracking your training the right way.</p>
            <a href="/signup" className="bg-white text-zinc-900 px-7 py-3.5 rounded-xl font-semibold hover:bg-zinc-100 transition-colors">
              Get started - free
            </a>
          </section>
        </>
      )}

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-8 py-6 text-center text-zinc-600 text-sm">
        © 2026 Kraft. All rights reserved.
      </footer>

    </main>
  )
}
