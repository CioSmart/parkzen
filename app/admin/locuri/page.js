


'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function AdminLocuri() {
  const [user, setUser] = useState(null)
  const [locuri, setLocuri] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editLoc, setEditLoc] = useState(null)
  const [form, setForm] = useState({ numar_loc: '', descriere: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const router = useRouter()

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (!u) { router.push('/'); return }
    const parsed = JSON.parse(u)
    if (parsed.tip !== 'admin') { router.push('/dashboard'); return }
    setUser(parsed)
    fetchLocuri()
  }, [])

  async function fetchLocuri() {
    setLoading(true)
    const { data } = await supabase.from('locuri_parcare').select('*').order('numar_loc')
    setLocuri(data || [])
    setLoading(false)
  }

  function deschideForm(l = null) {
    if (l) {
      setEditLoc(l)
      setForm({ numar_loc: l.numar_loc, descriere: l.descriere || '' })
    } else {
      setEditLoc(null)
      setForm({ numar_loc: '', descriere: '' })
    }
    setShowForm(true)
    setMsg('')
  }

  async function salveaza() {
    setSaving(true)
    setMsg('')
    if (!form.numar_loc) {
      setMsg('Numărul locului este obligatoriu!')
      setSaving(false)
      return
    }
    if (editLoc) {
      const { error } = await supabase.from('locuri_parcare').update({
        numar_loc: form.numar_loc,
        descriere: form.descriere
      }).eq('id', editLoc.id)
      if (error) { setMsg('Eroare: ' + error.message); setSaving(false); return }
      setMsg('✅ Loc actualizat!')
    } else {
      const { error } = await supabase.from('locuri_parcare').insert({
        numar_loc: form.numar_loc,
        descriere: form.descriere,
        activ: true
      })
      if (error) { setMsg('Eroare: ' + error.message); setSaving(false); return }
      setMsg('✅ Loc adăugat!')
    }
    fetchLocuri()
    setSaving(false)
    setTimeout(() => { setShowForm(false); setMsg('') }, 1500)
  }

  async function toggleActiv(l) {
    await supabase.from('locuri_parcare').update({ activ: !l.activ }).eq('id', l.id)
    fetchLocuri()
  }

  async function sterge(l) {
    if (!confirm(`Ștergi locul ${l.numar_loc}?`)) return
    const { error } = await supabase.from('locuri_parcare').delete().eq('id', l.id)
    if (error) { alert('Eroare la ștergere: ' + error.message); return }
    fetchLocuri()
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-xl shadow p-4 mb-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">⚙️ Admin Panel</h1>
          <button onClick={() => { localStorage.removeItem('user'); router.push('/') }}
            className="text-red-500 hover:text-red-700 font-medium text-sm">
            Ieși din cont
          </button>
        </div>

        {/* Nav */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <button onClick={() => router.push('/admin/masini')}
            className="bg-gray-200 text-gray-700 p-3 rounded-xl text-center font-medium text-sm hover:bg-gray-300">🚗 Mașini</button>
          <button onClick={() => router.push('/admin/locuri')}
            className="bg-blue-600 text-white p-3 rounded-xl text-center font-medium text-sm">🅿️ Locuri</button>
          <button onClick={() => router.push('/admin/rezervari')}
            className="bg-gray-200 text-gray-700 p-3 rounded-xl text-center font-medium text-sm hover:bg-gray-300">📋 Rezervări</button>
        </div>

        {/* Continut */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-700">Locuri de Parcare</h2>
            <button onClick={() => deschideForm()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
              + Adaugă
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
              <h3 className="font-semibold text-gray-700 mb-3">
                {editLoc ? '✏️ Editează loc' : '➕ Loc nou'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Număr loc *</label>
                  <input value={form.numar_loc}
                    onChange={e => setForm({ ...form, numar_loc: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: A1, B2, P-01" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Descriere</label>
                  <input value={form.descriere}
                    onChange={e => setForm({ ...form, descriere: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: Subsol 1, lângă lift" />
                </div>
              </div>
              {msg && <p className={`mt-2 text-sm ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={salveaza} disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Se salvează...' : 'Salvează'}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-300">
                  Anulează
                </button>
              </div>
            </div>
          )}

          {/* Tabel */}
          {loading ? (
            <p className="text-gray-400 text-sm">Se încarcă...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-left">
                    <th className="px-3 py-2 rounded-l-lg">Număr Loc</th>
                    <th className="px-3 py-2">Descriere</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 rounded-r-lg">Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {locuri.map(l => (
                    <tr key={l.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium text-gray-800">🅿️ {l.numar_loc}</td>
                      <td className="px-3 py-3 text-gray-500">{l.descriere || '—'}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          l.activ ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
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
                            {l.activ ? '🔴 Inactivează' : '🟢 Activează'}
                          </button>
                          <button onClick={() => sterge(l)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium">
                            🗑️ Șterge
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {locuri.length === 0 && (
                <p className="text-center text-gray-400 py-8">Niciun loc de parcare definit</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}