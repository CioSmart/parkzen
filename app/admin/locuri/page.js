'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function AdminLocuri() {
  const [user, setUser] = useState(null)
  const [locuri, setLocuri] = useState([])
  const [locatii, setLocatii] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editLoc, setEditLoc] = useState(null)
  const [form, setForm] = useState({ numar_loc: '', etaj: '0', zona: '', descriere: '', locatie_id: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [filtruLocatie, setFiltruLocatie] = useState('')
  const router = useRouter()

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (!u) { router.push('/'); return }
    const parsed = JSON.parse(u)
    if (parsed.tip !== 'admin' && parsed.tip !== 'power_admin') {
      router.push('/dashboard'); return
    }
    setUser(parsed)
    fetchDate(parsed)
  }, [])

  async function fetchDate(u) {
    setLoading(true)
    const [{ data: locuriData }, { data: locatiiData }] = await Promise.all([
      supabase
        .from('locuri_parcare')
        .select('*, locatii(nume)')
        .eq('companie_id', u.companie_id)
        .order('etaj')
        .order('zona')
        .order('numar_loc'),
      supabase
        .from('locatii')
        .select('*')
        .eq('companie_id', u.companie_id)
        .eq('activ', true)
        .order('nume')
    ])
    setLocuri(locuriData || [])
    setLocatii(locatiiData || [])
    setLoading(false)
  }

  function deschideForm(l = null) {
    if (l) {
      setEditLoc(l)
      setForm({
        numar_loc: l.numar_loc,
        etaj: String(l.etaj || 0),
        zona: l.zona || '',
        descriere: l.descriere || '',
        locatie_id: l.locatie_id || ''
      })
    } else {
      setEditLoc(null)
      setForm({ numar_loc: '', etaj: '0', zona: '', descriere: '', locatie_id: locatii[0]?.id || '' })
    }
    setShowForm(true)
    setMsg('')
  }

  async function salveaza() {
    setSaving(true)
    setMsg('')
    if (!form.numar_loc || !form.locatie_id) {
      setMsg('Numărul locului și locația sunt obligatorii!')
      setSaving(false)
      return
    }
    const payload = {
      numar_loc: form.numar_loc,
      etaj: parseInt(form.etaj) || 0,
      zona: form.zona.toUpperCase() || null,
      descriere: form.descriere || null,
      locatie_id: form.locatie_id,
      companie_id: user.companie_id,
      activ: true
    }
    if (editLoc) {
      const { error } = await supabase
        .from('locuri_parcare')
        .update(payload)
        .eq('id', editLoc.id)
      if (error) { setMsg('Eroare: ' + error.message); setSaving(false); return }
      setMsg('✅ Loc actualizat!')
    } else {
      const { error } = await supabase
        .from('locuri_parcare')
        .insert(payload)
      if (error) { setMsg('Eroare: ' + error.message); setSaving(false); return }
      setMsg('✅ Loc adăugat!')
    }
    fetchDate(user)
    setSaving(false)
    setTimeout(() => { setShowForm(false); setMsg('') }, 1500)
  }

  async function toggleActiv(l) {
    await supabase.from('locuri_parcare').update({ activ: !l.activ }).eq('id', l.id)
    fetchDate(user)
  }

  async function sterge(l) {
    if (!confirm(`Ștergi locul ${l.numar_loc}?`)) return
    await supabase.from('locuri_parcare').delete().eq('id', l.id)
    fetchDate(user)
  }

  const locuriFiltrate = filtruLocatie
    ? locuri.filter(l => l.locatie_id === filtruLocatie)
    : locuri

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
            className="bg-blue-600 text-white p-2.5 rounded-xl text-center font-medium text-xs">
            🅿️ Locuri
          </button>
          <button onClick={() => router.push('/admin/useri')}
            className="bg-gray-100 text-gray-700 p-2.5 rounded-xl text-center font-medium text-xs hover:bg-gray-200">
            👥 Useri
          </button>
          <button onClick={() => router.push('/admin/preturi')}
            className="bg-gray-100 text-gray-700 p-2.5 rounded-xl text-center font-medium text-xs hover:bg-gray-200">
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
            <h2 className="text-lg font-bold text-gray-800">🅿️ Locuri de parcare</h2>
            <button
              onClick={() => deschideForm()}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700"
            >
              + Adaugă
            </button>
          </div>

          {/* Filtru locatie */}
          <div className="mb-4">
            <select
              value={filtruLocatie}
              onChange={e => setFiltruLocatie(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Toate locațiile</option>
              {locatii.map(l => (
                <option key={l.id} value={l.id}>{l.nume}</option>
              ))}
            </select>
          </div>

          {/* Form */}
          {showForm && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
              <h3 className="font-semibold text-gray-700 mb-3">
                {editLoc ? '✏️ Editează loc' : '➕ Loc nou'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Locație *</label>
                  <select
                    value={form.locatie_id}
                    onChange={e => setForm({ ...form, locatie_id: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Alege locație —</option>
                    {locatii.map(l => (
                      <option key={l.id} value={l.id}>{l.nume}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Număr loc *</label>
                  <input
                    value={form.numar_loc}
                    onChange={e => setForm({ ...form, numar_loc: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: A1, P-01"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Etaj</label>
                  <input
                    type="number"
                    value={form.etaj}
                    onChange={e => setForm({ ...form, etaj: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Zonă</label>
                  <input
                    value={form.zona}
                    onChange={e => setForm({ ...form, zona: e.target.value.toUpperCase() })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: A, B, C"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Descriere</label>
                  <input
                    value={form.descriere}
                    onChange={e => setForm({ ...form, descriere: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: lângă lift"
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

          {/* Lista locuri grupate pe etaj/zona */}
          {loading ? (
            <p className="text-gray-400 text-sm">Se încarcă...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-left">
                    <th className="px-3 py-2 rounded-l-lg">Loc</th>
                    <th className="px-3 py-2">Locație</th>
                    <th className="px-3 py-2">Etaj</th>
                    <th className="px-3 py-2">Zonă</th>
                    <th className="px-3 py-2">Descriere</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 rounded-r-lg">Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {locuriFiltrate.map(l => (
                    <tr key={l.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium text-gray-800">🅿️ {l.numar_loc}</td>
                      <td className="px-3 py-3 text-gray-500">{l.locatii?.nume || '—'}</td>
                      <td className="px-3 py-3 text-gray-500">Etaj {l.etaj}</td>
                      <td className="px-3 py-3 text-gray-500">{l.zona || '—'}</td>
                      <td className="px-3 py-3 text-gray-500">{l.descriere || '—'}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          l.activ ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {l.activ ? 'Activ' : 'Inactiv'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => deschideForm(l)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                            ✏️ Edit
                          </button>
                          <button onClick={() => toggleActiv(l)}
                            className="text-yellow-600 hover:text-yellow-800 text-xs font-medium">
                            {l.activ ? '🔴' : '🟢'}
                          </button>
                          <button onClick={() => sterge(l)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium">
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {locuriFiltrate.length === 0 && (
                <p className="text-center text-gray-400 py-8">Niciun loc de parcare definit</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}