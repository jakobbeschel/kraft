'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Nav from '../components/Nav'

const PREFS = [
  {
    key: 'kraft_unit',
    label: 'Weight unit',
    description: 'Used when logging sets in your workouts.',
    options: [
      { value: 'lbs', label: 'lbs' },
      { value: 'kg', label: 'kg' },
    ],
    default: 'lbs',
  },
  {
    key: 'kraft_dist_unit',
    label: 'Distance unit',
    description: 'Used when logging runs.',
    options: [
      { value: 'mi', label: 'Miles (mi)' },
      { value: 'km', label: 'Kilometres (km)' },
    ],
    default: 'mi',
  },
]

export default function Settings() {
  const router = useRouter()
  const [prefs, setPrefs] = useState({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
    }
    check()

    const loaded = {}
    PREFS.forEach(p => {
      loaded[p.key] = localStorage.getItem(p.key) || p.default
    })
    setPrefs(loaded)
  }, [])

  function setPref(key, value) {
    localStorage.setItem(key, value)
    setPrefs(prev => ({ ...prev, [key]: value }))
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Nav current="Settings" />

      <div className="max-w-2xl mx-auto px-8 py-12">
        <h1 className="text-2xl font-semibold mb-1">Settings</h1>
        <p className="text-zinc-500 text-sm mb-10">Your preferences are saved automatically.</p>

        <div className="flex flex-col gap-4">
          {PREFS.map(pref => (
            <div key={pref.key} className="bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-sm">{pref.label}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">{pref.description}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {pref.options.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setPref(pref.key, opt.value)}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        prefs[pref.key] === opt.value
                          ? 'bg-white text-zinc-900 font-medium'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {saved && (
          <p className="text-xs text-green-500 mt-6 text-center">Saved</p>
        )}
      </div>
    </main>
  )
}
