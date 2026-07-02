// This is the program builder — creates a new program or edits an existing one

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const DAY_TYPES = {
  'rest':     'Rest day',
  'lift':     'Lift only',
  'run':      'Run only',
  'run+lift': 'Run + Lift',
  'run+opt':  'Run + optional Lift',
}

export default function ProgramBuilder() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [existingProgramId, setExistingProgramId] = useState(null)
  const [existingDayIds, setExistingDayIds] = useState({})
  const [library, setLibrary] = useState([])
  const [pickerOpen, setPickerOpen] = useState(null) // { dayIndex, exIndex }

  const [days, setDays] = useState(
    DAYS.map((name, index) => ({
      day_name: name,
      day_type: 'rest',
      order_index: index,
      exercises: [],
    }))
  )

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)

      // Check if the user already has a program
      const { data: programs } = await supabase
        .from('programs')
        .select('id')
        .eq('user_id', session.user.id)
        .limit(1)

      if (programs && programs.length > 0) {
        const programId = programs[0].id
        setExistingProgramId(programId)

        // Load existing days
        const { data: programDays } = await supabase
          .from('program_days')
          .select('id, day_name, day_type, order_index')
          .eq('program_id', programId)
          .order('order_index')

        if (programDays) {
          // Track existing day IDs so we can update instead of insert
          const dayIdMap = {}
          programDays.forEach(d => { dayIdMap[d.day_name] = d.id })
          setExistingDayIds(dayIdMap)

          // Load exercises and movements for each day
          const daysWithExercises = await Promise.all(
            programDays.map(async (day) => {
              const { data: exercises } = await supabase
                .from('exercises')
                .select('id, name, is_complex, is_hold, order_index')
                .eq('program_day_id', day.id)
                .order('order_index')

              const exWithMovements = await Promise.all(
                (exercises || []).map(async (ex) => {
                  const { data: movements } = await supabase
                    .from('movements')
                    .select('name, order_index')
                    .eq('exercise_id', ex.id)
                    .order('order_index')
                  return { ...ex, movements: movements || [] }
                })
              )

              return {
                day_name: day.day_name,
                day_type: day.day_type,
                order_index: day.order_index,
                exercises: exWithMovements,
              }
            })
          )

          // Merge loaded days into the full 7-day template so new days (e.g. Sunday) appear
          const loadedMap = {}
          daysWithExercises.forEach(d => { loadedMap[d.day_name] = d })
          setDays(DAYS.map((name, index) => loadedMap[name] || {
            day_name: name,
            day_type: 'rest',
            order_index: index,
            exercises: [],
          }))
        }
      }

      const { data: libraryData } = await supabase
        .from('movement_library')
        .select('id, name, category, description')
        .order('category')
        .order('name')
      setLibrary(libraryData || [])

      setLoading(false)
    }

    load()
  }, [])

  function updateDayType(index, type) {
    setDays(prev => prev.map((day, i) =>
      i === index ? { ...day, day_type: type } : day
    ))
  }

  function pickFromLibrary(dayIndex, exIndex, movement) {
    updateExercise(dayIndex, exIndex, 'name', movement.name)
    setPickerOpen(null)
  }

  function addExercise(dayIndex) {
    setDays(prev => prev.map((day, i) => {
      if (i !== dayIndex) return day
      return {
        ...day,
        exercises: [
          ...day.exercises,
          { name: '', is_complex: false, is_hold: false, order_index: day.exercises.length, movements: [] }
        ]
      }
    }))
  }

  function removeExercise(dayIndex, exIndex) {
    setDays(prev => prev.map((day, i) => {
      if (i !== dayIndex) return day
      return { ...day, exercises: day.exercises.filter((_, ei) => ei !== exIndex) }
    }))
  }

  function updateExercise(dayIndex, exIndex, field, value) {
    setDays(prev => prev.map((day, i) => {
      if (i !== dayIndex) return day
      return {
        ...day,
        exercises: day.exercises.map((ex, ei) =>
          ei === exIndex ? { ...ex, [field]: value } : ex
        )
      }
    }))
  }

  function addMovement(dayIndex, exIndex) {
    setDays(prev => prev.map((day, i) => {
      if (i !== dayIndex) return day
      return {
        ...day,
        exercises: day.exercises.map((ex, ei) => {
          if (ei !== exIndex) return ex
          return {
            ...ex,
            is_complex: true,
            movements: [...ex.movements, { name: '', order_index: ex.movements.length }]
          }
        })
      }
    }))
  }

  function updateMovement(dayIndex, exIndex, mvIndex, value) {
    setDays(prev => prev.map((day, i) => {
      if (i !== dayIndex) return day
      return {
        ...day,
        exercises: day.exercises.map((ex, ei) => {
          if (ei !== exIndex) return ex
          return {
            ...ex,
            movements: ex.movements.map((mv, mi) =>
              mi === mvIndex ? { ...mv, name: value } : mv
            )
          }
        })
      }
    }))
  }

  function removeMovement(dayIndex, exIndex, mvIndex) {
    setDays(prev => prev.map((day, i) => {
      if (i !== dayIndex) return day
      return {
        ...day,
        exercises: day.exercises.map((ex, ei) => {
          if (ei !== exIndex) return ex
          const newMovements = ex.movements.filter((_, mi) => mi !== mvIndex)
          return { ...ex, movements: newMovements, is_complex: newMovements.length > 0 }
        })
      }
    }))
  }

  async function saveProgram() {
    setSaving(true)
    setError(null)

    try {
      let programId = existingProgramId

      // Create program if it doesn't exist yet
      if (!programId) {
        const { data: program, error: programError } = await supabase
          .from('programs')
          .insert({ user_id: user.id, name: 'My Program' })
          .select()
          .single()
        if (programError) throw programError
        programId = program.id
      }

      for (const day of days) {
        let dayId = existingDayIds[day.day_name]

        if (dayId) {
          // Update existing day type
          await supabase
            .from('program_days')
            .update({ day_type: day.day_type })
            .eq('id', dayId)

          // Delete movements first (they reference exercises), then exercises
          const { data: existingExercises } = await supabase
            .from('exercises')
            .select('id')
            .eq('program_day_id', dayId)
          if (existingExercises && existingExercises.length > 0) {
            const exIds = existingExercises.map(e => e.id)
            await supabase.from('movements').delete().in('exercise_id', exIds)
            await supabase.from('exercises').delete().eq('program_day_id', dayId)
          }

        } else {
          // Insert new day
          const { data: savedDay, error: dayError } = await supabase
            .from('program_days')
            .insert({
              program_id: programId,
              day_name: day.day_name,
              day_type: day.day_type,
              order_index: day.order_index,
            })
            .select()
            .single()
          if (dayError) throw dayError
          dayId = savedDay.id
        }

        // Save exercises for this day
        for (const ex of day.exercises) {
          const { data: savedEx, error: exError } = await supabase
            .from('exercises')
            .insert({
              program_day_id: dayId,
              name: ex.name,
              is_complex: ex.is_complex,
              is_hold: ex.is_hold,
              order_index: ex.order_index,
            })
            .select()
            .single()
          if (exError) throw exError

          // Save movements
          for (const mv of ex.movements) {
            await supabase.from('movements').insert({
              exercise_id: savedEx.id,
              name: mv.name,
              order_index: mv.order_index,
            })
          }
        }
      }

      router.push('/dashboard')

    } catch (err) {
      setError('Something went wrong saving your program. Please try again.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <span className="text-zinc-500 text-sm">Loading your program...</span>
    </main>
  )

  return (
    <main className="min-h-screen bg-zinc-950 text-white">

      <nav className="flex items-center justify-between px-8 py-5 border-b border-zinc-800">
        <span className="text-xl font-semibold tracking-tight">Kraft</span>
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          ← Back to dashboard
        </button>
      </nav>

      <div className="max-w-3xl mx-auto px-8 py-12">
        <h1 className="text-2xl font-semibold mb-2">
          {existingProgramId ? 'Edit your program' : 'Build your program'}
        </h1>
        <p className="text-zinc-400 text-sm mb-10">
          {existingProgramId
            ? 'Make changes to your weekly training plan below.'
            : 'Set up your weekly training plan. You can always edit this later.'}
        </p>

        <div className="flex flex-col gap-6">
          {days.map((day, dayIndex) => (
            <div key={day.day_name} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">

              <div className="flex items-center justify-between mb-4">
                <span className="font-medium">{day.day_name}</span>
                <select
                  value={day.day_type}
                  onChange={e => updateDayType(dayIndex, e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm outline-none"
                >
                  {Object.entries(DAY_TYPES).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {(day.day_type === 'run' || day.day_type === 'run+lift' || day.day_type === 'run+opt') && (
                <div className="flex items-start gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 mb-3 text-sm text-zinc-400">
                  <span className="mt-0.5">ℹ️</span>
                  <span>Run details like pace, distance, and intervals are logged when you record each session - not set up here.</span>
                </div>
              )}

              {day.day_type !== 'rest' && day.day_type !== 'run' && (
                <div className="flex flex-col gap-3 mt-2">
                  {day.exercises.map((ex, exIndex) => (
                    <div key={exIndex} className="bg-zinc-800 rounded-xl p-4">

                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          placeholder="Exercise name (e.g. KB Goblet Squat)"
                          value={ex.name}
                          onChange={e => updateExercise(dayIndex, exIndex, 'name', e.target.value)}
                          className="flex-1 bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-400"
                        />
                        <button
                          onClick={() => removeExercise(dayIndex, exIndex)}
                          className="text-zinc-500 hover:text-red-400 transition-colors text-sm px-2"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="relative mb-3">
                        <button
                          onClick={() => setPickerOpen(pickerOpen?.dayIndex === dayIndex && pickerOpen?.exIndex === exIndex ? null : { dayIndex, exIndex })}
                          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          Choose from library ▾
                        </button>
                        {pickerOpen?.dayIndex === dayIndex && pickerOpen?.exIndex === exIndex && (
                          <div className="absolute left-0 top-6 z-10 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl w-72 max-h-64 overflow-y-auto">
                            {['complex', 'single'].map(cat => {
                              const items = library.filter(m => m.category === cat)
                              if (items.length === 0) return null
                              return (
                                <div key={cat}>
                                  <div className="px-3 py-2 text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-700">
                                    {cat === 'complex' ? 'Complexes' : 'Single movements'}
                                  </div>
                                  {items.map(m => (
                                    <button
                                      key={m.id}
                                      onClick={() => pickFromLibrary(dayIndex, exIndex, m)}
                                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-700 transition-colors"
                                    >
                                      <span className="text-zinc-200">{m.name}</span>
                                      {m.description && <p className="text-zinc-500 text-xs mt-0.5 truncate">{m.description}</p>}
                                    </button>
                                  ))}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mb-3">
                        <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ex.is_hold}
                            onChange={e => updateExercise(dayIndex, exIndex, 'is_hold', e.target.checked)}
                            className="accent-white"
                          />
                          Timed hold (e.g. plank)
                        </label>
                      </div>

                      {ex.movements.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {ex.movements.map((mv, mvIndex) => (
                            <div key={mvIndex} className="flex items-center gap-1">
                              <input
                                type="text"
                                placeholder="Movement"
                                value={mv.name}
                                onChange={e => updateMovement(dayIndex, exIndex, mvIndex, e.target.value)}
                                className="bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1 text-xs outline-none w-32 focus:border-zinc-400"
                              />
                              <button
                                onClick={() => removeMovement(dayIndex, exIndex, mvIndex)}
                                className="text-zinc-600 hover:text-red-400 text-xs"
                              >
                                ✕
                              </button>
                              {mvIndex < ex.movements.length - 1 && (
                                <span className="text-zinc-600 text-xs">→</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => addMovement(dayIndex, exIndex)}
                        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        + Add movement step
                      </button>

                    </div>
                  ))}

                  <button
                    onClick={() => addExercise(dayIndex)}
                    className="border border-dashed border-zinc-700 rounded-xl py-3 text-sm text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors"
                  >
                    + Add exercise
                  </button>
                </div>
              )}

            </div>
          ))}
        </div>

        {error && <p className="text-red-400 text-sm mt-6">{error}</p>}

        <button
          onClick={saveProgram}
          disabled={saving}
          className="w-full mt-8 bg-white text-zinc-950 rounded-xl py-3 font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : existingProgramId ? 'Save changes' : 'Save program and go to dashboard'}
        </button>

      </div>
    </main>
  )
}