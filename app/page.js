'use client'

import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Nav from './components/Nav'

function IconComplex() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="14" r="3" stroke="#a1a1aa" strokeWidth="1.5"/>
      <circle cx="22" cy="14" r="3" stroke="#a1a1aa" strokeWidth="1.5"/>
      <rect x="9" y="12.5" width="10" height="3" rx="1.5" stroke="#a1a1aa" strokeWidth="1.5"/>
      <path d="M3 14H1M27 14H25" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function IconRun() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="17" cy="5" r="2" stroke="#a1a1aa" strokeWidth="1.5"/>
      <path d="M13 9l4-2 3 4-4 2" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 24l3-6 4 2 3-5" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 16l4-3 2 3" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconLibrary() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="6" width="6" height="16" rx="1" stroke="#a1a1aa" strokeWidth="1.5"/>
      <rect x="12" y="6" width="6" height="16" rx="1" stroke="#a1a1aa" strokeWidth="1.5"/>
      <path d="M20 7l3.5 15" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function IconProgress() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 22l6-7 5 4 9-12" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}


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
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-28 pb-24 overflow-hidden">

        {/* Ghosted photo backgrounds */}
        <div
          className="absolute left-0 top-0 h-full w-64 bg-no-repeat bg-contain bg-bottom opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: "url('/pullup.jpg.avif')" }}
        />
        <div
          className="absolute right-0 top-0 h-full w-72 bg-no-repeat bg-contain bg-bottom opacity-[0.07] pointer-events-none"
          style={{ backgroundImage: "url('/kb-swing.jpg.jpg')" }}
        />

        <span className="relative text-xs text-zinc-500 uppercase tracking-[0.2em] mb-6">
          Built for functional fitness
        </span>
        <h1 className="relative text-6xl font-bold tracking-tight max-w-2xl leading-[1.1] mb-6">
          Train with purpose.<br />Track with precision.
        </h1>
        <p className="relative text-zinc-400 text-lg max-w-lg mb-10 leading-relaxed">
          Kraft is a training tracker built for kettlebell athletes and calisthenics practitioners. No fluff, no barbell bias.
        </p>
        <div className="relative flex items-center gap-4">
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

          <div className="bg-zinc-800 rounded-2xl p-6 border border-zinc-700">
            <div className="mb-4"><IconComplex /></div>
            <h3 className="font-semibold mb-2">Complex tracking</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Log multi-movement sequences as a single rep. Built for the way kettlebell training actually works.
            </p>
          </div>

          <div className="bg-zinc-800 rounded-2xl p-6 border border-zinc-700">
            <div className="mb-4"><IconRun /></div>
            <h3 className="font-semibold mb-2">Run + lift days</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Track runs and lifts in the same session. Log pace, distance, intervals, and weights all in one place.
            </p>
          </div>

          <div className="bg-zinc-800 rounded-2xl p-6 border border-zinc-700">
            <div className="mb-4"><IconLibrary /></div>
            <h3 className="font-semibold mb-2">Movement library</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Browse kettlebell and calisthenics movements with descriptions. Pick directly when building your program.
            </p>
          </div>

          <div className="bg-zinc-800 rounded-2xl p-6 border border-zinc-700">
            <div className="mb-4"><IconProgress /></div>
            <h3 className="font-semibold mb-2">Progress tracking</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              See your weights and volume trend over 1, 3, 6, or 12 months. Know exactly how far you've come.
            </p>
          </div>

        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-8">
        <div className="border-t border-zinc-800" />
      </div>

      {/* Quote */}
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
