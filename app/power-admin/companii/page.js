'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function PowerAdminCompanii() {
  const [user, setUser] = useState(null)
  const [companii, setCompanii] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editCompanie, setEditCompanie] = useState(null)
  const [form, setForm] = useState({ nume: '', descriere: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const router = useRouter()

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (!u) { router.push('/'); return }
    const parsed = JSON.parse(u)
    if (parsed.tip !== 'power_admin') { router.push('/dashboard'); return }
    setUser(parsed)
    fetchCompanii()
  }, [])

  async function fetchCompanii() {
    setLoading(true)
    const { data } = await supabase
      .from('companii')
      .select('*')
      .order('nume')
    setCompanii(data || [])
    setLoading(false)
  }

  function deschideForm(c = null) {
    if (c) {
      setEditCompanie(c)
      setForm({ nume: c.nume, descriere: c.descriere || '' })
    } else {
      setEditCompanie(null)
      setForm({ nume: '', descriere: '' })
    }
    setShowForm(true)
    setMsg('')
  }

  async function salveaza() {
    setSaving(true)
    setMsg('')
    if (!form.nume) {
      setMsg('Numele companiei este obligatoriu!')
      setSaving(false)
      return
    }
    if (editCompanie) {
      const { error } = await supabase
        .from('companii')
        .update({ nume: form.nume, descriere: form.descriere })
        .eq('id', editCompanie.id)
      if (error) { setMsg('Eroare: ' + error.message); setSaving(false); return }
      setMsg('✅ Companie actualizată!')
    } else {
      const { error } = await supabase
        .from('companii')
        .insert({ nume: form.nume, descriere: form.descriere, activ: true })
      if (error) { setMsg('Eroare: ' + error.message); setSaving(false); return }
      setMsg('✅ Companie adăugată!')
    }
    fetchCompanii()
    setSaving(false)
    setTimeout(() => { setShowForm(false); setMsg('') }, 1500)
  }

  async function toggleActiv(c) {
    await supabase.from('companii').update({ activ: !c.activ }).eq('id', c.id)
    fetchCompanii()
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">⚡ Power Admin</h1>
            <p className="text-sm text-gray-500 mt-0.5">{user.nume || user.email}</p>
          </div>
          <button
            onClick={() => { localStorage.removeItem('user'); router.push('/') }}
            className="text-red-500 hover:text-red-700 font-medium text-sm"
          >
            Ieși din cont
          </button>
        </div>

        {/* Nav */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => router.push('/power-admin/companii')}
            className="bg-blue-600 text-white p-3 rounded-xl text-center font-medium text-sm"
          >
            🏢 Companii
          </button>
          <button
            onClick={() => router.push('/power-admin/useri')}
            className="bg-gray-100 text-gray-700 p-3 rounded-xl text-center font-medium text-sm hover:bg-gray-200"
          >
            👥 Useri & Admini
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">🏢 Companii</h2>
            <button
              onClick={() => deschideForm()}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700"
            >
              + Adaugă
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
              <h3 className="font-semibold text-gray-700 mb-3">
                {editCompanie ? '✏️ Editează companie' : '➕ Companie nouă'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Nume companie *</label>
                  <input
                    value={form.nume}
                    onChange={e => setForm({ ...form, nume: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: Acme SRL"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Descriere</label>
                  <input
                    value={form.descriere}
                    onChange={e => setForm({ ...form, descriere: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="descriere opțională"
                  />
                </div>
              </div>
              {msg && (
                <p className={`mt-2 text-sm ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
                  {msg}
                </p>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={salveaza}
                  disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Se salvează...' : 'Salvează'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm hover:bg-gray-300"
                >
                  Anulează
                </button>
              </div>
            </div>
          )}

          {/* Tabel */}
          {loading ? (
            <p className="text-gray-400 text-sm">Se încarcă...</p>
          ) : (
            <div className="space-y-3">
              {companii.map(c => (
                <div key={c.id}
                  className="flex justify-between items-center p-4 border border-gray-100 rounded-xl hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-800">🏢 {c.nume}</p>
                    {c.descriere && <p className="text-xs text-gray-400 mt-0.5">{c.descriere}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      c.activ ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {c.activ ? 'Activă' : 'Inactivă'}
                    </span>
                    <button
                      onClick={() => deschideForm(c)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => toggleActiv(c)}
                      className="text-yellow-600 hover:text-yellow-800 text-xs font-medium"
                    >
                      {c.activ ? '🔴 Inactivează' : '🟢 Activează'}
                    </button>
                  </div>
                </div>
              ))}
              {companii.length === 0 && (
                <p className="text-center text-gray-400 py-8">Nicio companie adăugată încă</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}