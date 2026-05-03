'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function AdminUseri() {
  const [user, setUser] = useState(null)
  const [companii, setCompanii] = useState([])
  const [companieSelectata, setCompanieSelectata] = useState('')
  const [useri, setUseri] = useState([])
  const [locatii, setLocatii] = useState([])
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
    if (parsed.tip !== 'admin' && parsed.tip !== 'power_admin') {
      router.push('/dashboard'); return
    }
    setUser(parsed)
    fetchCompanii(parsed)
  }, [])

  async function getCompanieIds(u) {
  const companieId = u.companie_id && u.companie_id !== 'null' ? u.companie_id : null
  if (companieId) return [companieId]
  
  const { data } = await supabase
    .from('user_companii')
    .select('companie_id')
    .eq('user_id', u.id)
    .eq('activ', true)
  return data?.map(x => x.companie_id).filter(Boolean) || []
}

  async function fetchCompanii(u) {
    setLoading(true)
    let companiiData = []

    if (u.tip === 'power_admin') {
      const { data } = await supabase
        .from('companii')
        .select('*')
        .eq('activ', true)
        .order('nume')
      companiiData = data || []
    } else {
      const { data } = await supabase
        .from('user_companii')
        .select('*, companii(*)')
        .eq('user_id', u.id)
        .eq('activ', true)
      companiiData = data?.map(uc => uc.companii).filter(Boolean) || []
    }

    setCompanii(companiiData)
if (u.tip !== 'power_admin') {
  const companieId = u.companie_id && u.companie_id !== 'null' ? u.companie_id : null
  if (companieId) {
    setCompanieSelectata(companieId)
    await fetchUseri(companieId)
    await fetchLocatii(companieId)
  }
} else if (companiiData.length === 1) {
  setCompanieSelectata(companiiData[0].id)
  await fetchUseri(companiiData[0].id)
  await fetchLocatii(companiiData[0].id)
}

    setLoading(false)
  }

  async function fetchUseri(companieId) {
    if (!companieId) { setUseri([]); return }
   const id = companieId && companieId !== 'null' ? companieId : null
if (!id) { setUseri([]); return }
const { data } = await supabase
  .from('user_companii')
  .select('*, users(*)')
  .eq('companie_id', id)
  .order('created_at')
    setUseri(data || [])
  }

 async function fetchLocatii(companieId) {
  if (!companieId) { setLocatii([]); return }
  const id = companieId && companieId !== 'null' ? companieId : null
  if (!id) { setLocatii([]); return }
  const { data } = await supabase
    .from('locatii')
    .select('*')
    .eq('companie_id', id)
    .eq('activ', true)
    .order('nume')
  setLocatii(data || [])
}

  async function selecteazaCompanie(companieId) {
    setCompanieSelectata(companieId)
    setShowForm(false)
    setShowAlocare(null)
    setMsg('')
    await fetchUseri(companieId)
    await fetchLocatii(companieId)
  }

  function deschideForm(u = null) {
    if (u) {
      setEditUser(u)
      setForm({
        nume: u.users?.nume || '',
        email: u.users?.email || '',
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

  async function deschideAlocare(uc) {
    setShowAlocare(uc)
    setShowForm(false)
    setMsg('')
    const { data } = await supabase
      .from('alocari_locatii')
      .select('locatie_id')
      .eq('user_id', uc.user_id)
    setAlocariUser(data?.map(a => a.locatie_id) || [])
  }

  async function toggleAlocare(locatieId) {
    if (!showAlocare) return
    if (alocariUser.includes(locatieId)) {
      await supabase
        .from('alocari_locatii')
        .delete()
        .eq('user_id', showAlocare.user_id)
        .eq('locatie_id', locatieId)
      setAlocariUser(prev => prev.filter(id => id !== locatieId))
    } else {
      await supabase
        .from('alocari_locatii')
        .insert({ user_id: showAlocare.user_id, locatie_id: locatieId })
      setAlocariUser(prev => [...prev, locatieId])
    }
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
      // Actualizeaza tipul in user_companii
      await supabase
        .from('user_companii')
        .update({ tip: form.tip })
        .eq('id', editUser.id)

      // Actualizeaza profilul
      await supabase
        .from('users')
        .update({ nume: form.nume })
        .eq('id', editUser.user_id)

      setMsg('✅ User actualizat!')
    } else {
      if (!form.password) {
        setMsg('Parola este obligatorie!')
        setSaving(false)
        return
      }

      // Creeaza userul
      const res = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nume: form.nume,
          email: form.email,
          password: form.password,
          tip: 'normal',
          companie_id: null
        })
      })

      const result = await res.json()
      if (result.error) { setMsg('Eroare: ' + result.error); setSaving(false); return }

      // Aloca userul la companie
      const { data: newUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', form.email)
        .single()

      if (newUser) {
        await supabase.from('user_companii').insert({
          user_id: newUser.id,
          companie_id: companieSelectata,
          tip: form.tip,
          activ: true
        })
      }

      setMsg('✅ User creat și alocat!')
    }

    fetchUseri(companieSelectata)
    setSaving(false)
    setTimeout(() => { setShowForm(false); setMsg('') }, 1500)
  }

  async function toggleActiv(uc) {
    await supabase
      .from('user_companii')
      .update({ activ: !uc.activ })
      .eq('id', uc.id)
    fetchUseri(companieSelectata)
  }

  async function stergeAlocare(uc) {
    if (!confirm(`Elimini ${uc.users?.nume || uc.users?.email} din această companie?`)) return
    await supabase.from('user_companii').delete().eq('id', uc.id)
    fetchUseri(companieSelectata)
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">🅿️ ParkZen Admin</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {user.nume || user.email}
              {user.companie_nume && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                  🏢 {user.companie_nume}
                </span>
              )}
            </p>
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
            className="bg-blue-600 text-white p-2.5 rounded-xl text-center font-medium text-xs">
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

        {/* Selector companie */}
        {user.tip === 'power_admin' && companii.length > 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <label className="text-xs text-gray-500 font-medium block mb-2">
              🏢 Selectează compania
            </label>
            <div className="flex flex-wrap gap-2">
              {companii.map(c => (
                <button key={c.id}
                  onClick={() => selecteazaCompanie(c.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition ${
                    companieSelectata === c.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-blue-300'
                  }`}>
                  🏢 {c.nume}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        {!companieSelectata ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="text-4xl mb-2">🏢</div>
            <p className="text-gray-400">Selectează o companie pentru a vedea userii</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                👥 Useri — {companii.find(c => c.id === companieSelectata)?.nume}
              </h2>
              <button onClick={() => deschideForm()}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700">
                + Adaugă user
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
                    <input value={form.nume}
                      onChange={e => setForm({ ...form, nume: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nume complet" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Email *</label>
                    <input type="email" value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      disabled={!!editUser}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      placeholder="email@exemplu.com" />
                  </div>
                  {!editUser && (
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Parolă *</label>
                      <input type="password" value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900  mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="••••••••" />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Rol în companie</label>
                    <select value={form.tip}
                      onChange={e => setForm({ ...form, tip: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="normal">Normal</option>
                      <option value="admin">Admin</option>
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

            {/* Panel alocare locatii */}
            {showAlocare && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <h3 className="font-semibold text-blue-800 mb-3">
                  📍 Locații alocate pentru {showAlocare.users?.nume || showAlocare.users?.email}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {locatii.map(l => (
                    <button key={l.id}
                      onClick={() => toggleAlocare(l.id)}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition ${
                        alocariUser.includes(l.id)
                          ? 'border-blue-500 bg-blue-100 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'
                      }`}>
                      {alocariUser.includes(l.id) ? '✅' : '⬜'} {l.nume}
                    </button>
                  ))}
                  {locatii.length === 0 && (
                    <p className="text-sm text-gray-400 col-span-3">
                      Nu există locații definite pentru această companie
                    </p>
                  )}
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
                      <th className="px-3 py-2">Rol</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 rounded-r-lg">Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {useri.map(uc => (
                      <tr key={uc.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-3 font-medium text-gray-800">
                          {uc.users?.nume || '—'}
                        </td>
                        <td className="px-3 py-3 text-gray-500">{uc.users?.email}</td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            uc.tip === 'admin'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {uc.tip}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            uc.activ
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {uc.activ ? 'Activ' : 'Inactiv'}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => deschideForm(uc)}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                              ✏️ Edit
                            </button>
                            <button onClick={() => deschideAlocare(uc)}
                              className="text-purple-600 hover:text-purple-800 text-xs font-medium">
                              📍 Locații
                            </button>
                            <button onClick={() => toggleActiv(uc)}
                              className="text-yellow-600 hover:text-yellow-800 text-xs font-medium">
                              {uc.activ ? '🔴' : '🟢'}
                            </button>
                            <button onClick={() => stergeAlocare(uc)}
                              className="text-red-500 hover:text-red-700 text-xs font-medium">
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {useri.length === 0 && (
                  <p className="text-center text-gray-400 py-8">
                    Niciun user alocat acestei companii
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}