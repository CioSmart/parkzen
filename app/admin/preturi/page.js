'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function AdminPreturi() {
  const [user, setUser] = useState(null)
  const [preturi, setPreturi] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editPret, setEditPret] = useState(null)
  const [form, setForm] = useState({ nume: '', durata_minute: '', pret: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const router = useRouter()

  const intervale = [
    { label: '30 minute', minute: 30 },
    { label: '1 oră', minute: 60 },
    { label: '2 ore', minute: 120 },
    { label: '3 ore', minute: 180 },
    { label: '5 ore', minute: 300 },
    { label: '8 ore', minute: 480 },
    { label: '12 ore', minute: 720 },
    { label: '1 zi', minute: 1440 },
    { label: '3 zile', minute: 4320 },
  ]

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (!u) { router.push('/'); return }
    const parsed = JSON.parse(u)
    if (parsed.tip !== 'admin' && parsed.tip !== 'power_admin') {
      router.push('/dashboard'); return
    }
    setUser(parsed)
    fetchPreturi(parsed)
  }, [])

  async function fetchPreturi(u) {
    setLoading(true)
    const { data } = await supabase
      .from('preturi')
      .select('*')
      .eq('companie_id', u.companie_id)
      .order('durata_minute')
    setPreturi(data || [])
    setLoading(false)
  }

  function deschideForm(p = null) {
    if (p) {
      setEditPret(p)
      setForm({ nume: p.nume, durata_minute: String(p.durata_minute), pret: String(p.pret) })
    } else {
      setEditPret(null)
      setForm({ nume: '', durata_minute: '', pret: '' })
    }
    setShowForm(true)
    setMsg('')
  }

  function selecteazaInterval(minute) {
    const interval = intervale.find(i => i.minute === minute)
    setForm({ ...form, durata_minute: String(minute), nume: interval?.label || '' })
  }

  async function salveaza() {
    setSaving(true)
    setMsg('')
    if (!form.durata_minute || !form.pret) {
      setMsg('Durata și prețul sunt obligatorii!')
      setSaving(false)
      return
    }
    const payload = {
      nume: form.nume,
      durata_minute: parseInt(form.durata_minute),
      pret: parseFloat(form.pret),
      companie_id: user.companie_id,
      activ: true
    }
    if (editPret) {
      const { error } = await supabase
        .from('preturi')
        .update(payload)
        .eq('id', editPret.id)
      if (error) { setMsg('Eroare: ' + error.message); setSaving(false); return }
      setMsg('✅ Preț actualizat!')
    } else {
      const { error } = await supabase
        .from('preturi')
        .insert(payload)
      if (error) { setMsg('Eroare: ' + error.message); setSaving(false); return }
      setMsg('✅ Preț adăugat!')
    }
    fetchPreturi(user)
    setSaving(false)
    setTimeout(() => { setShowForm(false); setMsg('') }, 1500)
  }

  async function toggleActiv(p) {
    await supabase.from('preturi').update({ activ: !p.activ }).eq('id', p.id)
    fetchPreturi(user)
  }

  async function sterge(p) {
    if (!confirm(`Ștergi prețul "${p.nume}"?`)) return
    await supabase.from('preturi').delete().eq('id', p.id)
    fetchPreturi(user)
  }

  function formatDurata(minute) {
    if (minute < 60) return `${minute} min`
    if (minute < 1440) return `${minute / 60} ${minute / 60 === 1 ? 'oră' : 'ore'}`
    return `${minute / 1440} ${minute / 1440 === 1 ? 'zi' : 'zile'}`
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">🅿️ ParkZen Admin</h1>
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
        <div className="grid grid-cols-5 gap-2 mb-6">
          <button onClick={() => router.push('/admin/locatii')}
            className="bg-gray-100 text-gray-700 p-2.5 rounded-xl text-center font-medium text-xs hover:bg-gray-200">
            📍 Locații
          </button>
          <button onClick={() => router.push('/admin/locuri')}
            className="bg-gray-100 text-gray-700 p-2.5 rounded-xl text-center font-medium text-xs hover:bg-gray-200">
            🅿️ Locuri
          </button>
          <button onClick={() => router.push('/admin/useri')}
            className="bg-gray-100 text-gray-700 p-2.5 rounded-xl text-center font-medium text-xs hover:bg-gray-200">
            👥 Useri
          </button>
          <button onClick={() => router.push('/admin/preturi')}
            className="bg-blue-600 text-white p-2.5 rounded-xl text-center font-medium text-xs">
            💰 Prețuri
          </button>
          <button onClick={() => router.push('/admin/rezervari')}
            className="bg-gray-100 text-gray-700 p-2.5 rounded-xl text-center font-medium text-xs hover:bg-gray-200">
            📋 Rezervări
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">💰 Tarife parcare</h2>
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
                {editPret ? '✏️ Editează tarif' : '➕ Tarif nou'}
              </h3>

              {/* Intervale rapide */}
              <p className="text-xs text-gray-500 font-medium mb-2">Selectează interval rapid:</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {intervale.map(i => (
                  <button
                    key={i.minute}
                    onClick={() => selecteazaInterval(i.minute)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                      form.durata_minute === String(i.minute)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {i.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Nume tarif</label>
                  <input
                    value={form.nume}
                    onChange={e => setForm({ ...form, nume: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: 1 oră"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Durata (minute) *</label>
                  <input
                    type="number"
                    value={form.durata_minute}
                    onChange={e => setForm({ ...form, durata_minute: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: 60"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Preț (RON) *</label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.pret}
                    onChange={e => setForm({ ...form, pret: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: 10.00"
                  />
                </div>
              </div>

              {msg && (
                <p className={`mt-2 text-sm ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
                  {msg}
                </p>
              )}
              <div className="flex gap-2 mt-3">
                <button onClick={salveaza} disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Se salvează...' : 'Salvează'}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm hover:bg-gray-300">
                  Anulează
                </button>
              </div>
            </div>
          )}

          {/* Lista preturi */}
          {loading ? (
            <p className="text-gray-400 text-sm">Se încarcă...</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {preturi.map(p => (
                <div key={p.id}
                  className={`border-2 rounded-xl p-4 ${
                    p.activ ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
                  }`}>
                  <div className="text-2xl font-bold text-blue-600">{p.pret} RON</div>
                  <div className="text-sm font-medium text-gray-800 mt-1">{p.nume}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{formatDurata(p.durata_minute)}</div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => deschideForm(p)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                      ✏️
                    </button>
                    <button onClick={() => toggleActiv(p)}
                      className="text-yellow-600 hover:text-yellow-800 text-xs font-medium">
                      {p.activ ? '🔴' : '🟢'}
                    </button>
                    <button onClick={() => sterge(p)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium">
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
              {preturi.length === 0 && (
                <p className="col-span-4 text-center text-gray-400 py-8">
                  Niciun tarif definit încă
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}