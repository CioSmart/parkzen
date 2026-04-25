'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function AdminMasini() {
  const [user, setUser] = useState(null)
  const [useri, setUseri] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState({ nume: '', email: '', password: '', tip: 'normal' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const router = useRouter()

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (!u) { router.push('/'); return }
    const parsed = JSON.parse(u)
    if (parsed.tip !== 'admin') { router.push('/dashboard'); return }
    setUser(parsed)
    fetchUseri()
  }, [])

  async function fetchUseri() {
    setLoading(true)
    const { data } = await supabase
      .from('users')
      .select('*, masini(id, nr_masina, activ)')
      .order('nume')
    setUseri(data || [])
    setLoading(false)
  }

  function deschideForm(u = null) {
    if (u) {
      setEditUser(u)
      setForm({ nume: u.nume || '', email: u.email || '', password: '', tip: u.tip })
    } else {
      setEditUser(null)
      setForm({ nume: '', email: '', password: '', tip: 'normal' })
    }
    setShowForm(true)
    setMsg('')
  }

async function salveaza() {
  setSaving(true)
  setMsg('')

  if (!form.email) {
    setMsg('Email-ul este obligatoriu!')
    setSaving(false)
    return
  }

  if (editUser) {
    // Actualizează profilul existent
    const { error } = await supabase.from('users').update({
      nume: form.nume,
      email: form.email,
      tip: form.tip
    }).eq('id', editUser.id)

    if (error) { setMsg('Eroare: ' + error.message); setSaving(false); return }
    setMsg('✅ Utilizator actualizat!')

  } else {
    // Utilizator nou — prin API Route
    if (!form.password) {
      setMsg('Parola este obligatorie pentru utilizatori noi!')
      setSaving(false)
      return
    }

    const res = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nume: form.nume,
        email: form.email,
        password: form.password,
        tip: form.tip
      })
    })

    const result = await res.json()
    if (result.error) {
      setMsg('Eroare: ' + result.error)
      setSaving(false)
      return
    }
    setMsg('✅ Utilizator creat!')
  }

  fetchUseri()
  setSaving(false)
  setTimeout(() => { setShowForm(false); setMsg('') }, 2000)
}

  async function toggleActiv(u) {
    await supabase.from('users').update({ activ: !u.activ }).eq('id', u.id)
    fetchUseri()
  }

  async function sterge(u) {
    if (!confirm(`Ștergi utilizatorul ${u.nume || u.email}?`)) return
    await supabase.from('users').delete().eq('id', u.id)
    fetchUseri()
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">

        <div className="bg-white rounded-xl shadow p-4 mb-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">⚙️ Admin Panel</h1>
          <button onClick={() => { localStorage.removeItem('user'); router.push('/') }}
            className="text-red-500 hover:text-red-700 font-medium text-sm">Ieși din cont</button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <button onClick={() => router.push('/admin/masini')}
            className="bg-blue-600 text-white p-3 rounded-xl text-center font-medium text-sm">👥 Utilizatori</button>
          <button onClick={() => router.push('/admin/locuri')}
            className="bg-gray-200 text-gray-700 p-3 rounded-xl text-center font-medium text-sm hover:bg-gray-300">🅿️ Locuri</button>
          <button onClick={() => router.push('/admin/rezervari')}
            className="bg-gray-200 text-gray-700 p-3 rounded-xl text-center font-medium text-sm hover:bg-gray-300">📋 Rezervări</button>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-700">Utilizatori</h2>
            <button onClick={() => deschideForm()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">+ Adaugă</button>
          </div>

          {showForm && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
              <h3 className="font-semibold text-gray-700 mb-3">
                {editUser ? '✏️ Editează utilizator' : '➕ Utilizator nou'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Utilizator</label>
                  <input value={form.nume} onChange={e => setForm({ ...form, nume: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nume complet utilizator" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email@exemplu.com" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">
                    Parolă {editUser ? '(lasă gol pentru a păstra parola actuala)' : '*'}
                  </label>
                  <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Tip utilizator</label>
                  <select value={form.tip} onChange={e => setForm({ ...form, tip: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="normal">Normal</option>
                    <option value="master">Master</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              {msg && <p className={`mt-2 text-sm ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={salveaza} disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Se salvează...' : 'Salvează'}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-300">Anulează</button>
              </div>
            </div>
          )}

          {loading ? (
            <p className="text-gray-400 text-sm">Se încarcă...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-left">
                    <th className="px-3 py-2 rounded-l-lg">Nume</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Tip</th>
                    <th className="px-3 py-2">Mașini</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 rounded-r-lg">Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {useri.map(u => (
                    <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium text-gray-800">{u.nume || '—'}</td>
                      <td className="px-3 py-3 text-gray-500">{u.email}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          u.tip === 'admin' ? 'bg-purple-100 text-purple-700' :
                          u.tip === 'master' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'}`}>
                          {u.tip}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-xs">
                        {u.masini?.filter(m => m.activ).map(m => m.nr_masina).join(', ') || '—'}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.activ ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.activ ? 'Activ' : 'Inactiv'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => deschideForm(u)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium">✏️ Edit</button>
                          <button onClick={() => toggleActiv(u)}
                            className="text-yellow-600 hover:text-yellow-800 text-xs font-medium">
                            {u.activ ? '🔴 Inactivează' : '🟢 Activează'}
                          </button>
                          <button onClick={() => sterge(u)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium">🗑️ Șterge</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {useri.length === 0 && <p className="text-center text-gray-400 py-8">Niciun utilizator găsit</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}