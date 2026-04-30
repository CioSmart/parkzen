'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function PowerAdminUseri() {
  const [user, setUser] = useState(null)
  const [useri, setUseri] = useState([])
  const [companii, setCompanii] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [showAlocare, setShowAlocare] = useState(null)
  const [alocariUser, setAlocariUser] = useState([])
  const [form, setForm] = useState({ nume: '', email: '', password: '', tip: 'normal' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const router = useRouter()

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (!u) { router.push('/'); return }
    const parsed = JSON.parse(u)
    if (parsed.tip !== 'power_admin') { router.push('/dashboard'); return }
    setUser(parsed)
    fetchDate()
  }, [])

  async function fetchDate() {
    setLoading(true)
    const [{ data: useriData }, { data: companiiData }] = await Promise.all([
      supabase.from('users').select('*').order('nume'),
      supabase.from('companii').select('*').eq('activ', true).order('nume')
    ])
    setUseri(useriData || [])
    setCompanii(companiiData || [])
    setLoading(false)
  }

  async function deschideAlocare(u) {
    setShowAlocare(u)
    setShowForm(false)
    setMsg('')
    const { data } = await supabase
      .from('user_companii')
      .select('*, companii(nume)')
      .eq('user_id', u.id)
    setAlocariUser(data || [])
  }

  async function toggleAlocare(companieId) {
    if (!showAlocare) return
    const existing = alocariUser.find(a => a.companie_id === companieId)
    if (existing) {
      await supabase
        .from('user_companii')
        .delete()
        .eq('user_id', showAlocare.id)
        .eq('companie_id', companieId)
      setAlocariUser(prev => prev.filter(a => a.companie_id !== companieId))
    } else {
      const { data } = await supabase
        .from('user_companii')
        .insert({
          user_id: showAlocare.id,
          companie_id: companieId,
          tip: 'normal',
          activ: true
        })
        .select('*, companii(nume)')
        .single()
      setAlocariUser(prev => [...prev, data])
    }
  }

  async function schimbaTip(companieId, tip) {
    await supabase
      .from('user_companii')
      .update({ tip })
      .eq('user_id', showAlocare.id)
      .eq('companie_id', companieId)
    setAlocariUser(prev => prev.map(a =>
      a.companie_id === companieId ? { ...a, tip } : a
    ))
  }

  function deschideForm(u = null) {
    if (u) {
      setEditUser(u)
      setForm({
        nume: u.nume || '',
        email: u.email || '',
        password: '',
        tip: u.tip || 'normal'
      })
    } else {
      setEditUser(null)
      setForm({ nume: '', email: '', password: '', tip: 'normal' })
    }
    setShowForm(true)
    setShowAlocare(null)
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
      const { error } = await supabase.from('users').update({
        nume: form.nume,
        email: form.email,
        tip: form.tip
      }).eq('id', editUser.id)
      if (error) { setMsg('Eroare: ' + error.message); setSaving(false); return }
      setMsg('✅ User actualizat!')
    } else {
      if (!form.password) {
        setMsg('Parola este obligatorie!')
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
          tip: form.tip,
          companie_id: null
        })
      })
      const result = await res.json()
      if (result.error) { setMsg('Eroare: ' + result.error); setSaving(false); return }
      setMsg('✅ User creat!')
    }

    fetchDate()
    setSaving(false)
    setTimeout(() => { setShowForm(false); setMsg('') }, 1500)
  }

  async function toggleActiv(u) {
    await supabase.from('users').update({ activ: !u.activ }).eq('id', u.id)
    fetchDate()
  }

  function tipColor(tip) {
    if (tip === 'power_admin') return 'bg-purple-100 text-purple-700'
    if (tip === 'admin') return 'bg-orange-100 text-orange-700'
    return 'bg-blue-100 text-blue-700'
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
          <button onClick={() => router.push('/power-admin/companii')}
            className="bg-gray-100 text-gray-700 p-3 rounded-xl text-center font-medium text-sm hover:bg-gray-200">
            🏢 Companii
          </button>
          <button onClick={() => router.push('/power-admin/useri')}
            className="bg-blue-600 text-white p-3 rounded-xl text-center font-medium text-sm">
            👥 Useri & Admini
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">👥 Useri & Admini</h2>
            <button onClick={() => deschideForm()}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700">
              + Adaugă
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
              <h3 className="font-semibold text-gray-700 mb-3">
                {editUser ? '✏️ Editează user' : '➕ User nou'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Nume</label>
                  <input
                    value={form.nume}
                    onChange={e => setForm({ ...form, nume: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nume complet"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email@exemplu.com"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">
                    Parolă {editUser ? '(lasă gol pentru a păstra)' : '*'}
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Tip user</label>
                  <select
                    value={form.tip}
                    onChange={e => setForm({ ...form, tip: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="admin">Admin</option>
                    <option value="power_admin">Power Admin</option>
                  </select>
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

          {/* Panel alocare companii */}
          {showAlocare && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <h3 className="font-semibold text-blue-800 mb-3">
                🏢 Companii alocate pentru {showAlocare.nume || showAlocare.email}
              </h3>
              <div className="space-y-2">
                {companii.map(c => {
                  const alocare = alocariUser.find(a => a.companie_id === c.id)
                  return (
                    <div key={c.id}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 ${
                        alocare
                          ? 'border-blue-500 bg-white'
                          : 'border-gray-200 bg-white'
                      }`}>
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleAlocare(c.id)}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition ${
                            alocare
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-gray-300'
                          }`}>
                          {alocare && '✓'}
                        </button>
                        <span className="font-medium text-gray-800 text-sm">🏢 {c.nume}</span>
                      </div>
                      {alocare && (
                        <select
                          value={alocare.tip}
                          onChange={e => schimbaTip(c.id, e.target.value)}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="normal">Normal</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                    </div>
                  )
                })}
              </div>
              <button onClick={() => setShowAlocare(null)}
                className="mt-3 bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm hover:bg-gray-300">
                Închide
              </button>
            </div>
          )}

          {/* Lista useri */}
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
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${tipColor(u.tip)}`}>
                          {u.tip}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          u.activ ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {u.activ ? 'Activ' : 'Inactiv'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => deschideForm(u)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                            ✏️ Edit
                          </button>
                          <button onClick={() => deschideAlocare(u)}
                            className="text-purple-600 hover:text-purple-800 text-xs font-medium">
                            🏢 Companii
                          </button>
                          <button onClick={() => toggleActiv(u)}
                            className="text-yellow-600 hover:text-yellow-800 text-xs font-medium">
                            {u.activ ? '🔴' : '🟢'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {useri.length === 0 && (
                <p className="text-center text-gray-400 py-8">Niciun user găsit</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}