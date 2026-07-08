'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Nav from '../components/Nav'

export default function LogWorkoutPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <span className="text-zinc-400 text-sm">Loading...</span>
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
  const editLogId = searchParams.get('logId')

  const [user, setUser] = useState(null)
  const [day, setDay] = useState(null)
  const [dayName, setDayName] = useState('')
  const [editingName, setEditingName] = useState(false)
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
  const [unit, setUnit] = useState('lbs')
  const [distUnit, setDistUnit] = useState('mi')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)

      if (!dayId) { router.push('/dashboard'); return }

      const { data: dayData } = await supabase
        .from('program_days')
        .select('id, day_name, day_type')
        .eq('id', dayId)
        .single()

      if (!dayData) { router.push('/dashboard'); return }
      setDay(dayData)
      setDayName(dayData.day_name)

      const { data: exData } = await supabase
        .from('exercises')
        .select('id, name, is_complex, is_hold, order_index')
        .eq('program_day_id', dayId)
        .order('order_index')

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

      // If editing an existing log, pre-fill with saved data
      if (editLogId) {
        const [{ data: existingSets }, { data: existingRun }] = await Promise.all([
          supabase.from('logged_sets')
            .select('exercise_id, set_number, reps, weight, notes')
            .eq('workout_log_id', editLogId)
            .order('exercise_id').order('set_number'),
          supabase.from('logged_runs')
            .select('run_type, duration, distance, pace, incline, notes')
            .eq('workout_log_id', editLogId)
            .single(),
        ])

        const prefilled = {}
        exWithMovements.forEach(ex => {
          const exSets = (existingSets || []).filter(s => s.exercise_id === ex.id)
          prefilled[ex.id] = exSets.length > 0
            ? exSets.map(s => ({ reps: s.reps || '', weight: s.weight || '', notes: s.notes || '' }))
            : [{ reps: '', weight: '', notes: '' }]
        })
        setSets(prefilled)

        if (existingRun) {
          setRun({
            run_type: existingRun.run_type || 'Easy',
            duration: existingRun.duration || '',
            distance: existingRun.distance || '',
            pace: existingRun.pace || '',
            incline: existingRun.incline || '',
            notes: existingRun.notes || '',
          })
        }
      } else {
        const initialSets = {}
        exWithMovements.forEach(ex => {
          initialSets[ex.id] = [{ reps: '', weight: '', notes: '' }]
        })
        setSets(initialSets)
      }

      setUnit(localStorage.getItem('kraft_unit') || 'lbs')
      setDistUnit(localStorage.getItem('kraft_dist_unit') || 'mi')
      setLoading(false)
    }

    load()
  }, [dayId, editLogId])

  function toggleUnit() {
    const next = unit === 'lbs' ? 'kg' : 'lbs'
    setUnit(next)
    localStorage.setItem('kraft_unit', next)
  }

  function toggleDistUnit() {
    const next = distUnit === 'mi' ? 'km' : 'mi'
    setDistUnit(next)
    localStorage.setItem('kraft_dist_unit', next)
  }

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

  function calcPace(duration, distance) {
    const d = parseFloat(duration)
    const dist = parseFloat(distance)
    if (!d || !dist || dist === 0) return ''
    const total = d / dist
    const mins = Math.floor(total)
    const secs = Math.round((total - mins) * 60).toString().padStart(2, '0')
    return `${mins}:${secs}`
  }

  function updateRun(field, value) {
    setRun(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'duration' || field === 'distance') {
        const pace = calcPace(
          field === 'duration' ? value : prev.duration,
          field === 'distance' ? value : prev.distance
        )
        if (pace) next.pace = pace
      }
      return next
    })
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

  async function saveWorkout() {
    setSaving(true)

    try {
      let logId

      if (editLogId) {
        // Editing: wipe existing sets/runs and rewrite
        logId = editLogId
        await supabase.from('logged_sets').delete().eq('workout_log_id', logId)
        await supabase.from('logged_runs').delete().eq('workout_log_id', logId)
      } else {
        // New log entry
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
        logId = log.id
      }

      if (day.day_type !== 'lift') {
        await supabase.from('logged_runs').insert({
          workout_log_id: logId,
          run_type: run.run_type,
          duration: run.duration,
          distance: run.distance,
          pace: run.pace,
          incline: run.incline,
          notes: run.notes,
        })
      }

      for (const ex of exercises) {
        const exSets = sets[ex.id] || []
        for (let i = 0; i < exSets.length; i++) {
          const s = exSets[i]
          if (!s.reps && !s.weight) continue
          await supabase.from('logged_sets').insert({
            workout_log_id: logId,
            exercise_id: ex.id,
            set_number: i + 1,
            reps: s.reps,
            weight: s.weight,
            notes: s.notes,
          })
        }
      }

      if (dayName !== day.day_name) {
        await supabase.from('program_days').update({ day_name: dayName }).eq('id', dayId)
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

      <Nav current={editLogId ? 'Edit log' : 'Log workout'} />

      <div className="max-w-3xl mx-auto px-8 py-12">
        <div className="mb-1">
          {editingName ? (
            <input
              autoFocus
              type="text"
              value={dayName}
              onChange={e => setDayName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
              className="text-2xl font-semibold bg-transparent border-b border-zinc-600 outline-none w-full"
            />
          ) : (
            <h1
              className="text-2xl font-semibold cursor-text hover:opacity-80 transition-opacity"
              onClick={() => setEditingName(true)}
              title="Click to edit"
            >
              {dayName}
              <span className="text-zinc-600 text-sm font-normal ml-2">✎</span>
            </h1>
          )}
        </div>
        <p className="text-zinc-400 text-sm mb-10">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>

        {/* Run section */}
        {includesRun && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium">Run</h2>
              <button
                onClick={toggleDistUnit}
                className="text-xs text-zinc-400 border border-zinc-700 rounded-lg px-3 py-1.5 hover:text-white hover:border-zinc-500 transition-colors"
              >
                {distUnit === 'mi' ? 'Switch to km' : 'Switch to mi'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Type</label>
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
                <label className="text-xs text-zinc-400 block mb-1">Duration (min)</label>
                <input type="number" inputMode="numeric" placeholder="35" value={run.duration}
                  onChange={e => updateRun('duration', e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Distance ({distUnit})</label>
                <input type="number" inputMode="decimal" placeholder="3.1" value={run.distance}
                  onChange={e => updateRun('distance', e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Avg pace (/{distUnit})</label>
                <input type="text" placeholder={distUnit === 'mi' ? "e.g. 8:30" : "e.g. 5:15"} value={run.pace}
                  onChange={e => updateRun('pace', e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Incline</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0%"
                  value={run.incline}
                  onChange={e => {
                    const raw = e.target.value.replace('%', '')
                    updateRun('incline', raw ? `${raw}%` : '')
                  }}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Notes</label>
                <input type="text" placeholder="Felt strong..." value={run.notes}
                  onChange={e => updateRun('notes', e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
            </div>

            {/* Interval splits */}
            <button
              onClick={() => setShowSplits(!showSplits)}
              className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors mb-3"
            >
              {showSplits ? 'âˆ’ Hide interval splits' : '+ Log interval splits'}
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
                      <button onClick={() => removeSplit(i)} className="text-zinc-600 hover:text-red-400 text-xs">âœ•</button>
                    </div>
                  </div>
                ))}
                <button onClick={addSplit} className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors mt-1">
                  + Add split
                </button>
              </div>
            )}
          </div>
        )}

        {/* Lift section */}
        {includesLift && exercises.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Exercises</h2>
              <button
                onClick={toggleUnit}
                className="text-xs text-zinc-400 border border-zinc-700 rounded-lg px-3 py-1.5 hover:text-white hover:border-zinc-500 transition-colors"
              >
                {unit === 'lbs' ? 'Switch to kg' : 'Switch to lbs'}
              </button>
            </div>

            {exercises.map(ex => (
              <div key={ex.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">

                {/* Exercise name and movements */}
                <div className="mb-4">
                  <span className="font-medium text-sm">{ex.name}</span>
                  {ex.movements.length > 0 && (
                    <span className="text-zinc-600 text-xs ml-2">
                      {ex.movements.map(m => m.name).join(' â†’ ')}
                    </span>
                  )}
                </div>

                {/* Set rows */}
                <div className="grid grid-cols-[28px_1fr_1fr_20px] gap-2 mb-2 text-xs text-zinc-600 px-1">
                  <span>Set</span>
                  <span>{ex.is_hold ? 'Duration' : 'Reps'}</span>
                  <span>Weight ({unit})</span>
                  <span></span>
                </div>

                {(sets[ex.id] || []).map((s, i) => (
                  <div key={i} className="mb-2">
                    <div className="grid grid-cols-[28px_1fr_1fr_20px] gap-2 items-center">
                      <span className="text-xs text-zinc-600 px-1">{i + 1}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder={ex.is_hold ? 'sec' : 'â€”'}
                        value={s.reps}
                        onChange={e => updateSet(ex.id, i, 'reps', e.target.value)}
                        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm outline-none w-full"
                      />
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        value={s.weight}
                        onChange={e => updateSet(ex.id, i, 'weight', e.target.value)}
                        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm outline-none w-full"
                      />
                      {(sets[ex.id] || []).length > 1 ? (
                        <button onClick={() => removeSet(ex.id, i)} className="text-zinc-600 hover:text-red-400 text-xs">âœ•</button>
                      ) : <span />}
                    </div>
                    <input
                      type="text"
                      placeholder="Notes (optional)"
                      value={s.notes}
                      onChange={e => updateSet(ex.id, i, 'notes', e.target.value)}
                      className="mt-1.5 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 outline-none"
                    />
                  </div>
                ))}

                <button
                  onClick={() => addSet(ex.id)}
                  className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors mt-2"
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
          {saving ? 'Saving...' : editLogId ? 'Update workout' : 'Save workout'}
        </button>

      </div>
    </main>
  )
}
