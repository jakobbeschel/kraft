'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

const PAGES = [
  { label: 'Home', href: '/' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Progress', href: '/progress' },
  { label: 'Library', href: '/library' },
  { label: 'Program', href: '/program' },
  { label: 'Settings', href: '/settings' },
]

export default function Nav({ current }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    async function getUser() {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
    }
    getUser()
  }, [])

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const others = PAGES.filter(p => p.label !== current)

  return (
    <nav className="flex items-center justify-between px-8 py-5 border-b border-zinc-800">
      <a href="/" className="text-xl font-semibold tracking-tight hover:text-zinc-300 transition-colors">Kraft</a>

      <div className="flex items-center gap-4">
        {user && (
          <span className="text-sm text-zinc-500 hidden sm:block">{user.email}</span>
        )}

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white transition-colors bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2"
          >
            {current}
            <span className="text-zinc-500 text-xs">{open ? '▲' : '▼'}</span>
          </button>

          {open && (
            <div className="absolute right-0 top-11 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl w-44 z-50 overflow-hidden">
              {others.map(page => (
                <a
                  key={page.href}
                  href={page.href}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  {page.label}
                </a>
              ))}
              {user && (
                <>
                  <div className="border-t border-zinc-800 my-1" />
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-3 text-sm text-red-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                  >
                    Sign out
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
