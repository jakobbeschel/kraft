'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Nav from '../components/Nav'

export default function Library() {
  const router = useRouter()
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('single')
  const [newDescription, setNewDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCategory, setEditCategory] = useState('single')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data } = await supabase
        .from('movement_library')
        .select('*')
        .order('category')
        .order('name')

      setMovements(data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function addMovement() {
    if (!newName.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('movement_library')
      .insert({ name: newName.trim(), category: newCategory, description: newDescription.trim() || null })
      .select()
      .single()
    if (!error) {
      setMovements(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName('')
      setNewDescription('')
      setNewCategory('single')
      setShowAdd(false)
    }
    setSaving(false)
  }

  function startEdit(m) {
    setEditingId(m.id)
    setEditName(m.name)
    setEditDescription(m.description || '')
    setEditCategory(m.category)
  }

  async function saveEdit() {
    setSaving(true)
    const { error } = await supabase
      .from('movement_library')
      .update({ name: editName.trim(), category: editCategory, description: editDescription.trim() || null })
      .eq('id', editingId)
    if (!error) {
      setMovements(prev => prev.map(m => m.id === editingId
        ? { ...m, name: editName.trim(), category: editCategory, description: editDescription.trim() || null }
        : m
      ))
      setEditingId(null)
    }
    setSaving(false)
  }

  async function deleteMovement(id) {
    if (!confirm('Delete this movement?')) return
    await supabase.from('movement_library').delete().eq('id', id)
    setMovements(prev => prev.filter(m => m.id !== id))
  }

  const filtered = activeCategory === 'all'
    ? movements
    : movements.filter(m => m.category === activeCategory)

  const complexes = filtered.filter(m => m.category === 'complex')
  const singles = filtered.filter(m => m.category === 'single')

  if (loading) return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <span className="text-zinc-400 text-sm">Loading library...</span>
    </main>
  )

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Nav current="Library" />

      <div className="max-w-3xl mx-auto px-8 py-12">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold">Movement library</h1>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-sm bg-white text-zinc-950 px-4 py-2 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
          >
            + Add movement
          </button>
        </div>
        <p className="text-zinc-400 text-sm mb-8">Browse kettlebell and calisthenics movements. Use these when building your program.</p>

        {showAdd && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 mb-8">
            <h2 className="font-medium mb-4">Add to library</h2>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Movement name (e.g. KB Clean and Press)"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-400"
              />
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none"
              >
                <option value="single">Single movement</option>
                <option value="complex">Complex</option>
              </select>
              <textarea
                placeholder="Description (optional)"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                rows={2}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-400 resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={addMovement}
                  disabled={saving || !newName.trim()}
                  className="bg-white text-zinc-950 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Category filter */}
        <div className="flex gap-2 mb-8">
          {[['all', 'All'], ['complex', 'Complexes'], ['single', 'Single movements']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setActiveCategory(val)}
              className={`text-sm px-4 py-1.5 rounded-full transition-colors ${
                activeCategory === val
                  ? 'bg-white text-zinc-950 font-medium'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {complexes.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xs text-zinc-400 uppercase tracking-widest mb-4">Complexes</h2>
            <div className="flex flex-col gap-3">
              {complexes.map(m => (
                <MovementCard key={m.id} m={m} editingId={editingId} editName={editName} editDescription={editDescription} editCategory={editCategory} setEditName={setEditName} setEditDescription={setEditDescription} setEditCategory={setEditCategory} startEdit={startEdit} saveEdit={saveEdit} deleteMovement={deleteMovement} setEditingId={setEditingId} saving={saving} />
              ))}
            </div>
          </div>
        )}

        {singles.length > 0 && (
          <div>
            <h2 className="text-xs text-zinc-400 uppercase tracking-widest mb-4">Single movements</h2>
            <div className="flex flex-col gap-3">
              {singles.map(m => (
                <MovementCard key={m.id} m={m} editingId={editingId} editName={editName} editDescription={editDescription} editCategory={editCategory} setEditName={setEditName} setEditDescription={setEditDescription} setEditCategory={setEditCategory} startEdit={startEdit} saveEdit={saveEdit} deleteMovement={deleteMovement} setEditingId={setEditingId} saving={saving} />
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-16">No movements yet. Add one above.</p>
        )}
      </div>
    </main>
  )
}

function MovementCard({ m, editingId, editName, editDescription, editCategory, setEditName, setEditDescription, setEditCategory, startEdit, saveEdit, deleteMovement, setEditingId, saving }) {
  const isEditing = editingId === m.id

  if (isEditing) {
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-5 py-4 flex flex-col gap-3">
        <input
          type="text"
          value={editName}
          onChange={e => setEditName(e.target.value)}
          className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-400"
        />
        <select
          value={editCategory}
          onChange={e => setEditCategory(e.target.value)}
          className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm outline-none"
        >
          <option value="single">Single movement</option>
          <option value="complex">Complex</option>
        </select>
        <textarea
          value={editDescription}
          onChange={e => setEditDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm outline-none resize-none"
        />
        <div className="flex gap-3">
          <button onClick={saveEdit} disabled={saving} className="text-sm bg-white text-zinc-950 px-4 py-1.5 rounded-lg font-medium hover:bg-zinc-200 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={() => setEditingId(null)} className="text-sm text-zinc-400 hover:text-white transition-colors">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 flex items-start justify-between group">
      <div>
        <span className="font-medium text-sm">{m.name}</span>
        {m.description && <p className="text-zinc-400 text-xs mt-1">{m.description}</p>}
      </div>
      <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity ml-4 shrink-0">
        <button onClick={() => startEdit(m)} className="text-xs text-zinc-400 hover:text-white transition-colors">Edit</button>
        <button onClick={() => deleteMovement(m.id)} className="text-xs text-red-800 hover:text-red-400 transition-colors">Delete</button>
      </div>
    </div>
  )
}
