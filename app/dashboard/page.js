// This is the dashboard — loads the user's program and shows their weekly training

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

const DAY_TYPE_LABELS = {
  'rest':     'Rest day',
  'lift':     'Lift only',
  'run':      'Run only',
  'run+lift': 'Run + Lift',
  'run+opt':  'Run + optional Lift',
}

// Get the Monday of the current week + any offset (e.g. -1 = last week)
function getMonday(offset = 0) {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

// Format a date as YYYY-MM-DD for database queries
function toDateString(date) {
  return date.toISOString().split('T')[0]
}

// Format a date nicely for display
function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasProgram, setHasProgram] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [loggedDates, setLoggedDates] = useState([])
  const [expandedLog, setExpandedLog] = useState(null)
  const [logHistory, setLogHistory] = useState({})
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)

      const { data: programs } = await supabase
        .from('programs')
        .select('id')
        .eq('user_id', session.user.id)
        .limit(1)

      if (!programs || programs.length === 0) {
        setHasProgram(false)
        setLoading(false)
        return
      }

      setHasProgram(true)
      const programId = programs[0].id

      const { data: programDays } = await supabase
        .from('program_days')
        .select('id, day_name, day_type, order_index')
        .eq('program_id', programId)
        .order('order_index')

      if (!programDays) { setLoading(false); return }

      const daysWithExercises = await Promise.all(
        programDays.map(async (day) => {
          const { data: exercises } = await supabase
            .from('exercises')
            .select('id, name, is_complex, is_hold, order_index')
            .eq('program_day_id', day.id)
            .order('order_index')

          const exercisesWithMovements = await Promise.all(
            (exercises || []).map(async (ex) => {
              const { data: movements } = await supabase
                .from('movements')
                .select('name, order_index')
                .eq('exercise_id', ex.id)
                .order('order_index')
              return { ...ex, movements: movements || [] }
            })
          )

          return { ...day, exercises: exercisesWithMovements }
        })
      )

      setDays(daysWithExercises)
      setLoading(false)
    }

    load()
  }, [])

  // Load logged workouts whenever the week changes
  useEffect(() => {
    async function loadLogs() {
      if (!user) return

      const monday = getMonday(weekOffset)
      const sunday = new Date(monday)
      sunday.setDate(sunday.getDate() + 6)

      const { data: logs } = await supabase
        .from('workout_logs')
        .select('id, program_day_id, logged_date')
        .eq('user_id', user.id)
        .gte('logged_date', toDateString(monday))
        .lte('logged_date', toDateString(sunday))

      setLoggedDates(logs || [])
    }

    loadLogs()
  }, [user, weekOffset])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function isLogged(dayId) {
    return loggedDates.some(l => l.program_day_id === dayId)
  }

  function getLogId(dayId) {
    return loggedDates.find(l => l.program_day_id === dayId)?.id
  }

  async function deleteLog(dayId) {
    const logId = getLogId(dayId)
    if (!logId) return
    if (!confirm('Delete this workout log?')) return
    await supabase.from('logged_sets').delete().eq('workout_log_id', logId)
    await supabase.from('logged_runs').delete().eq('workout_log_id', logId)
    await supabase.from('workout_logs').delete().eq('id', logId)
    setLoggedDates(prev => prev.filter(l => l.program_day_id !== dayId))
    setExpandedLog(null)
    setLogHistory(prev => { const n = {...prev}; delete n[dayId]; return n })
  }

  async function toggleHistory(dayId) {
    if (expandedLog === dayId) { setExpandedLog(null); return }
    setExpandedLog(dayId)
    if (logHistory[dayId]) return

    const logId = getLogId(dayId)
    if (!logId) return

    const [{ data: sets }, { data: runs }] = await Promise.all([
      supabase.from('logged_sets')
        .select('set_number, reps, weight, notes, exercise_id, exercises(name)')
        .eq('workout_log_id', logId)
        .order('exercise_id')
        .order('set_number'),
      supabase.from('logged_runs')
        .select('run_type, duration, distance, pace, incline, notes')
        .eq('workout_log_id', logId)
    ])

    setLogHistory(prev => ({ ...prev, [dayId]: { sets: sets || [], runs: runs || [] } }))
  }

  const monday = getMonday(weekOffset)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)

  const weekLabel = weekOffset === 0
    ? 'This week'
    : weekOffset === -1
    ? 'Last week'
    : weekOffset === 1
    ? 'Next week'
    : `${formatDate(monday)} – ${formatDate(sunday)}`

  if (loading) return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <span className="text-zinc-500 text-sm">Loading your program...</span>
    </main>
  )

  return (
    <main className="min-h-screen bg-zinc-950 text-white">

      <nav className="flex items-center justify-between px-8 py-5 border-b border-zinc-800">
        <span className="text-xl font-semibold tracking-tight">Kraft</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-400">{user?.email}</span>
          <button onClick={handleSignOut} className="text-sm text-zinc-400 hover:text-white transition-colors">
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-8 py-12">

        {!hasProgram ? (
          <div className="text-center py-24">
            <h1 className="text-2xl font-semibold mb-3">Welcome to Kraft</h1>
            <p className="text-zinc-400 text-sm mb-8">
              You don't have a training program yet. Set one up to get started.
            </p>
            <button
              onClick={() => router.push('/program')}
              className="bg-white text-zinc-950 px-6 py-3 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
            >
              Build my program
            </button>
          </div>
        ) : (
          <>
            {/* Header with week navigator */}
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-semibold">Your training</h1>
              <button
                onClick={() => router.push('/program')}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Edit program
              </button>
            </div>

            {/* Week navigation */}
            <div className="flex items-center justify-between mb-6 bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3">
              <button
                onClick={() => setWeekOffset(w => w - 1)}
                className="text-zinc-400 hover:text-white transition-colors text-sm px-2"
              >
                ← Prev
              </button>
              <div className="text-center">
                <span className="text-sm font-medium">{weekLabel}</span>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {formatDate(monday)} – {formatDate(sunday)}
                </p>
              </div>
              <button
                onClick={() => setWeekOffset(w => w + 1)}
                className="text-zinc-400 hover:text-white transition-colors text-sm px-2"
              >
                Next →
              </button>
            </div>

            {/* Training days */}
            <div className="flex flex-col gap-4">
              {days.map(day => (
                <div
                  key={day.id}
                  className={`bg-zinc-900 border rounded-2xl px-6 py-5 ${isLogged(day.id) ? 'border-green-800' : 'border-zinc-800'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{day.day_name}</span>
                      {/* Green dot if workout was logged this week */}
                      {isLogged(day.id) && (
                        <button
                          onClick={() => toggleHistory(day.id)}
                          className="text-xs bg-green-900 text-green-400 px-2 py-0.5 rounded-full hover:bg-green-800 transition-colors"
                        >
                          Logged {expandedLog === day.id ? '▲' : '▼'}
                        </button>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500 bg-zinc-800 px-3 py-1 rounded-full">
                      {DAY_TYPE_LABELS[day.day_type] || day.day_type}
                    </span>
                  </div>

                  {day.day_type === 'rest' && (
                    <p className="text-zinc-600 text-sm">Rest - no training today</p>
                  )}

                  {day.day_type === 'run' && (
                    <p className="text-zinc-500 text-sm">Running session</p>
                  )}

                  {day.exercises.length > 0 && (
                    <div className="flex flex-col gap-2 mt-1">
                      {day.exercises.map(ex => (
                        <div key={ex.id} className="text-sm">
                          <span className="text-zinc-300">{ex.name}</span>
                          {ex.movements.length > 0 && (
                            <span className="text-zinc-600 text-xs ml-2">
                              {ex.movements.map(m => m.name).join(' → ')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {expandedLog === day.id && logHistory[day.id] && (
                    <div className="mt-4 pt-4 border-t border-zinc-800">
                      {logHistory[day.id].runs.map((run, i) => (
                        <div key={i} className="mb-3 text-sm text-zinc-400">
                          <span className="text-zinc-300 font-medium">{run.run_type} run</span>
                          <div className="flex flex-wrap gap-4 mt-1 text-xs text-zinc-500">
                            {run.duration && <span>Duration: {run.duration}</span>}
                            {run.distance && <span>Distance: {run.distance}</span>}
                            {run.pace && <span>Pace: {run.pace}</span>}
                            {run.incline && <span>Incline: {run.incline}</span>}
                            {run.notes && <span>Notes: {run.notes}</span>}
                          </div>
                        </div>
                      ))}
                      {(() => {
                        const byExercise = {}
                        logHistory[day.id].sets.forEach(s => {
                          const name = s.exercises?.name || 'Unknown'
                          if (!byExercise[name]) byExercise[name] = []
                          byExercise[name].push(s)
                        })
                        return Object.entries(byExercise).map(([name, sets]) => (
                          <div key={name} className="mb-3">
                            <span className="text-sm text-zinc-300 font-medium">{name}</span>
                            <div className="mt-1 flex flex-col gap-1">
                              {sets.map((s, i) => (
                                <div key={i} className="text-xs text-zinc-500 flex gap-4">
                                  <span>Set {s.set_number}</span>
                                  {s.reps && <span>{s.reps} reps</span>}
                                  {s.weight && <span>{s.weight}</span>}
                                  {s.notes && <span>{s.notes}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      })()}
                      {logHistory[day.id].sets.length === 0 && logHistory[day.id].runs.length === 0 && (
                        <p className="text-xs text-zinc-600">No details recorded.</p>
                      )}
                    </div>
                  )}

                  {day.day_type !== 'rest' && (
                    <div className="flex items-center gap-3 mt-4">
                      <button
                        onClick={() => router.push(`/log?dayId=${day.id}`)}
                        className="text-xs text-zinc-500 border border-zinc-700 rounded-lg px-4 py-2 hover:text-white hover:border-zinc-500 transition-colors"
                      >
                        {isLogged(day.id) ? 'Log again' : 'Log workout'}
                      </button>
                      {isLogged(day.id) && (
                        <button
                          onClick={() => deleteLog(day.id)}
                          className="text-xs text-red-800 hover:text-red-400 transition-colors"
                        >
                          Delete log
                        </button>
                      )}
                    </div>
                  )}

                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}