'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Nav from '../components/Nav'

export default function LogWorkoutPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <span className="text-zinc-500 text-sm">Loading...</span>
      </main>
    }>
      <LogWorkout />
    </Suspense>
  )
}

function LogWorkout() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dayId = searchParams.get('dayId')

  const [user, setUser] = useState(null)
  const [day, setDay] = useState(null)
  const [exercises, setExercises] = useState([])
  const [sets, setSets] = useState({})
  const [run, setRun] = useState({
    run_type: 'Easy',
    duration: '',
    distance: '',
    pace: '',
    incline: '',
    notes: '',
  })
  const [splits, setSplits] = useState([])
  const [showSplits, setShowSplits] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Check user is logged in
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)

      if (!dayId) { router.push('/dashboard'); return }

      // Load the day details
      const { data: dayData } = await supabase
        .from('program_days')
        .select('id, day_name, day_type')
        .eq('id', dayId)
        .single()

      if (!dayData) { router.push('/dashboard'); return }
      setDay(dayData)

      // Load exercises for this day
      const { data: exData } = await supabase
        .from('exercises')
        .select('id, name, is_complex, is_hold, order_index')
        .eq('program_day_id', dayId)
        .order('order_index')

      // Load movements for each exercise
      const exWithMovements = await Promise.all(
        (exData || []).map(async (ex) => {
          const { data: movements } = await supabase
            .from('movements')
            .select('name, order_index')
            .eq('exercise_id', ex.id)
            .order('order_index')
          return { ...ex, movements: movements || [] }
        })
      )

      setExercises(exWithMovements)

      // Set up one empty set per exercise to start with
      const initialSets = {}
      exWithMovements.forEach(ex => {
        initialSets[ex.id] = [{ reps: '', weight: '', notes: '' }]
      })
      setSets(initialSets)

      setLoading(false)
    }

    load()
  }, [dayId])

  // Add a set to an exercise
  function addSet(exId) {
    setSets(prev => ({
      ...prev,
      [exId]: [...(prev[exId] || []), { reps: '', weight: '', notes: '' }]
    }))
  }

  // Remove a set from an exercise
  function removeSet(exId, setIndex) {
    setSets(prev => ({
      ...prev,
      [exId]: prev[exId].filter((_, i) => i !== setIndex)
    }))
  }

  // Update a field within a set
  function updateSet(exId, setIndex, field, value) {
    setSets(prev => ({
      ...prev,
      [exId]: prev[exId].map((s, i) =>
        i === setIndex ? { ...s, [field]: value } : s
      )
    }))
  }

  // Update a run field
  function updateRun(field, value) {
    setRun(prev => ({ ...prev, [field]: value }))
  }

  // Add an interval split row
  function addSplit() {
    setSplits(prev => [...prev, { split: '', pace: '', notes: '' }])
  }

  // Remove a split row
  function removeSplit(index) {
    setSplits(prev => prev.filter((_, i) => i !== index))
  }

  // Update a split field
  function updateSplit(index, field, value) {
    setSplits(prev => prev.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    ))
  }

  // Save the logged workout to the database
  async function saveWorkout() {
    setSaving(true)

    try {
      // Create the workout log entry for today
      const { data: log, error: logError } = await supabase
        .from('workout_logs')
        .insert({
          user_id: user.id,
          program_day_id: dayId,
          logged_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single()

      if (logError) throw logError

      // Save run data if this day includes a run
      if (day.day_type !== 'lift') {
        await supabase.from('logged_runs').insert({
          workout_log_id: log.id,
          run_type: run.run_type,
          duration: run.duration,
          distance: run.distance,
          pace: run.pace,
          incline: run.incline,
          notes: run.notes,
        })
      }

      // Save each set for each exercise
      for (const ex of exercises) {
        const exSets = sets[ex.id] || []
        for (let i = 0; i < exSets.length; i++) {
          const s = exSets[i]
          if (!s.reps && !s.weight) continue // skip empty sets
          await supabase.from('logged_sets').insert({
            workout_log_id: log.id,
            exercise_id: ex.id,
            set_number: i + 1,
            reps: s.reps,
            weight: s.weight,
            notes: s.notes,
          })
        }
      }

      router.push('/dashboard')

    } catch (err) {
      console.error(err)
      setSaving(false)
    }
  }

  const includesRun = day && ['run', 'run+lift', 'run+opt'].includes(day.day_type)
  const includesLift = day && ['lift', 'run+lift', 'run+opt'].includes(day.day_type)

  if (loading) return null

  return (
    <main className="min-h-screen bg-zinc-950 text-white">

      <Nav current="Log workout" />

      <div className="max-w-3xl mx-auto px-8 py-12">
        <h1 className="text-2xl font-semibold mb-1">{day.day_name}</h1>
        <p className="text-zinc-500 text-sm mb-10">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>

        {/* Run section */}
        {includesRun && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
            <h2 className="font-medium mb-4">Run</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Type</label>
                <select
                  value={run.run_type}
                  onChange={e => updateRun('run_type', e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none"
                >
                  {['Easy', 'Tempo', 'Intervals', 'Long', 'Recovery'].map(t => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Duration</label>
                <input type="text" placeholder="e.g. 35 min" value={run.duration}
                  onChange={e => updateRun('duration', e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Distance</label>
                <input type="text" placeholder="e.g. 5.2 km" value={run.distance}
                  onChange={e => updateRun('distance', e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Avg pace</label>
                <input type="text" placeholder="e.g. 5:30 /km" value={run.pace}
                  onChange={e => updateRun('pace', e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Incline</label>
                <input type="text" placeholder="e.g. 2%" value={run.incline}
                  onChange={e => updateRun('incline', e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Notes</label>
                <input type="text" placeholder="Felt strong..." value={run.notes}
                  onChange={e => updateRun('notes', e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
            </div>

            {/* Interval splits */}
            <button
              onClick={() => setShowSplits(!showSplits)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-3"
            >
              {showSplits ? '− Hide interval splits' : '+ Log interval splits'}
            </button>

            {showSplits && (
              <div>
                <div className="grid grid-cols-3 gap-2 mb-2 text-xs text-zinc-600 px-1">
                  <span>Split / rep</span><span>Pace</span><span>Notes</span>
                </div>
                {splits.map((s, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 mb-2 items-center">
                    <input type="text" placeholder="400m" value={s.split}
                      onChange={e => updateSplit(i, 'split', e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm outline-none" />
                    <input type="text" placeholder="4:50" value={s.pace}
                      onChange={e => updateSplit(i, 'pace', e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm outline-none" />
                    <div className="flex items-center gap-2">
                      <input type="text" placeholder="" value={s.notes}
                        onChange={e => updateSplit(i, 'notes', e.target.value)}
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm outline-none" />
                      <button onClick={() => removeSplit(i)} className="text-zinc-600 hover:text-red-400 text-xs">✕</button>
                    </div>
                  </div>
                ))}
                <button onClick={addSplit} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors mt-1">
                  + Add split
                </button>
              </div>
            )}
          </div>
        )}

        {/* Lift section */}
        {includesLift && exercises.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-medium">Exercises</h2>

            {exercises.map(ex => (
              <div key={ex.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">

                {/* Exercise name and movements */}
                <div className="mb-4">
                  <span className="font-medium text-sm">{ex.name}</span>
                  {ex.movements.length > 0 && (
                    <span className="text-zinc-600 text-xs ml-2">
                      {ex.movements.map(m => m.name).join(' → ')}
                    </span>
                  )}
                </div>

                {/* Set rows */}
                <div className="grid grid-cols-4 gap-2 mb-2 text-xs text-zinc-600 px-1">
                  <span>Set</span>
                  <span>{ex.is_hold ? 'Duration' : 'Reps'}</span>
                  <span>Weight</span>
                  <span>Notes</span>
                </div>

                {(sets[ex.id] || []).map((s, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 mb-2 items-center">
                    <span className="text-xs text-zinc-600 px-1">{i + 1}</span>
                    <input
                      type="text"
                      placeholder={ex.is_hold ? '60 sec' : '—'}
                      value={s.reps}
                      onChange={e => updateSet(ex.id, i, 'reps', e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm outline-none"
                    />
                    <input
                      type="text"
                      placeholder="kg / lbs"
                      value={s.weight}
                      onChange={e => updateSet(ex.id, i, 'weight', e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder=""
                        value={s.notes}
                        onChange={e => updateSet(ex.id, i, 'notes', e.target.value)}
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm outline-none"
                      />
                      {(sets[ex.id] || []).length > 1 && (
                        <button onClick={() => removeSet(ex.id, i)} className="text-zinc-600 hover:text-red-400 text-xs">✕</button>
                      )}
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => addSet(ex.id)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors mt-2"
                >
                  + Add set
                </button>

              </div>
            ))}
          </div>
        )}

        {/* Save button */}
        <button
          onClick={saveWorkout}
          disabled={saving}
          className="w-full mt-8 bg-white text-zinc-950 rounded-xl py-3 font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save workout'}
        </button>

      </div>
    </main>
  )
}