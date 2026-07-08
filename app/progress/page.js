'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Nav from '../components/Nav'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const TIME_RANGES = [
  { label: '1M', months: 1 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '12M', months: 12 },
]

const METRICS = [
  { label: 'Best weight', value: 'weight' },
  { label: 'Total volume', value: 'volume' },
]

function getYTicks(data, unit) {
  if (!data || data.length === 0) return []
  const max = Math.max(...data.map(d => d.value || 0))
  const step = unit === 'kg' ? 2.5 : 5
  const ceil = Math.ceil(max / step) * step
  const ticks = []
  for (let v = 0; v <= ceil; v += step) ticks.push(v)
  return ticks
}

export default function Progress() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [unit, setUnit] = useState('lbs')
  const [exercises, setExercises] = useState([])
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [timeRange, setTimeRange] = useState(3)
  const [metric, setMetric] = useState('weight')
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingChart, setLoadingChart] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      setUnit(localStorage.getItem('kraft_unit') || 'lbs')

      // Get all workout logs for this user
      const { data: logs } = await supabase
        .from('workout_logs')
        .select('id')
        .eq('user_id', session.user.id)

      if (!logs || logs.length === 0) { setLoading(false); return }

      const logIds = logs.map(l => l.id)

      // Get all logged sets with exercise names
      const { data: loggedSets } = await supabase
        .from('logged_sets')
        .select('exercise_id, exercises(name)')
        .in('workout_log_id', logIds)

      // Get unique exercises
      const seen = {}
      const uniqueExercises = []
      ;(loggedSets || []).forEach(s => {
        if (s.exercises && !seen[s.exercise_id]) {
          seen[s.exercise_id] = true
          uniqueExercises.push({ id: s.exercise_id, name: s.exercises.name })
        }
      })
      uniqueExercises.sort((a, b) => a.name.localeCompare(b.name))
      setExercises(uniqueExercises)
      if (uniqueExercises.length > 0) setSelectedExercise(uniqueExercises[0].id)

      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedExercise || !user) return
    loadChartData()
  }, [selectedExercise, timeRange, metric, user])

  async function loadChartData() {
    setLoadingChart(true)

    const since = new Date()
    since.setMonth(since.getMonth() - timeRange)
    const sinceStr = since.toISOString().split('T')[0]

    // Get workout logs for this user within time range
    const { data: logs } = await supabase
      .from('workout_logs')
      .select('id, logged_date')
      .eq('user_id', user.id)
      .gte('logged_date', sinceStr)
      .order('logged_date')

    if (!logs || logs.length === 0) { setChartData([]); setLoadingChart(false); return }

    const logIds = logs.map(l => l.id)
    const logDateMap = {}
    logs.forEach(l => { logDateMap[l.id] = l.logged_date })

    // Get sets for the selected exercise within those logs
    const { data: sets } = await supabase
      .from('logged_sets')
      .select('workout_log_id, reps, weight')
      .eq('exercise_id', selectedExercise)
      .in('workout_log_id', logIds)

    if (!sets || sets.length === 0) { setChartData([]); setLoadingChart(false); return }

    // Group by date and calculate metric
    const byDate = {}
    sets.forEach(s => {
      const date = logDateMap[s.workout_log_id]
      if (!date) return
      if (!byDate[date]) byDate[date] = []
      byDate[date].push(s)
    })

    const data = Object.entries(byDate).map(([date, sets]) => {
      let value
      if (metric === 'weight') {
        // Best weight lifted that session
        const weights = sets.map(s => parseFloat(s.weight)).filter(w => !isNaN(w))
        value = weights.length > 0 ? Math.max(...weights) : null
      } else {
        // Total volume: sum of reps * weight
        value = sets.reduce((sum, s) => {
          const r = parseFloat(s.reps) || 0
          const w = parseFloat(s.weight) || 0
          return sum + r * w
        }, 0)
        if (value === 0) value = null
      }

      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value,
      }
    }).filter(d => d.value !== null)

    setChartData(data)
    setLoadingChart(false)
  }

  const selectedName = exercises.find(e => e.id === selectedExercise)?.name

  if (loading) return (
    <main className="min-h-screen bg-zinc-900 text-white flex items-center justify-center">
      <span className="text-zinc-500 text-sm">Loading...</span>
    </main>
  )

  return (
    <main className="min-h-screen bg-zinc-900 text-white">
      <Nav current="Progress" />

      <div className="max-w-4xl mx-auto px-8 py-12">
        <h1 className="text-2xl font-semibold mb-1">Progress</h1>
        <p className="text-zinc-500 text-sm mb-10">Track how your lifts have improved over time.</p>

        {exercises.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-24">No logged workouts yet. Start logging to see your progress.</p>
        ) : (
          <>
            {/* Controls */}
            <div className="flex flex-wrap gap-4 mb-8">
              <div className="flex-1 min-w-48">
                <label className="text-xs text-zinc-500 block mb-1.5">Exercise</label>
                <select
                  value={selectedExercise || ''}
                  onChange={e => setSelectedExercise(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none"
                >
                  {exercises.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1.5">Metric</label>
                <div className="flex gap-1">
                  {METRICS.map(m => (
                    <button
                      key={m.value}
                      onClick={() => setMetric(m.value)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${metric === m.value ? 'bg-white text-zinc-900 font-medium' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1.5">Time range</label>
                <div className="flex gap-1">
                  {TIME_RANGES.map(r => (
                    <button
                      key={r.months}
                      onClick={() => setTimeRange(r.months)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${timeRange === r.months ? 'bg-white text-zinc-900 font-medium' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="font-medium">{selectedName}</span>
                  <span className="text-zinc-500 text-sm ml-2">
                    {metric === 'weight' ? 'Best weight per session' : 'Volume per session (reps × weight)'}
                  </span>
                </div>
              </div>

              {loadingChart ? (
                <div className="flex items-center justify-center h-48">
                  <span className="text-zinc-500 text-sm">Loading...</span>
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex items-center justify-center h-48">
                  <span className="text-zinc-600 text-sm">No data for this exercise in the selected time range.</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis ticks={getYTicks(chartData, unit)} tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: '13px' }}
                      labelStyle={{ color: '#a1a1aa' }}
                      itemStyle={{ color: '#ffffff' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#ffffff"
                      strokeWidth={2}
                      dot={{ fill: '#ffffff', r: 4 }}
                      activeDot={{ r: 6 }}
                      name={metric === 'weight' ? 'Weight' : 'Volume'}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
