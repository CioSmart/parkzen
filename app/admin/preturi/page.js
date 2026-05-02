'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function AdminPreturi() {
  const [user, setUser] = useState(null)
  const [companii, setCompanii] = useState([])
  const [locatii, setLocatii] = useState([])
  const [zone, setZone] = useState([])
  const [preturi, setPreturi] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editPret, setEditPret] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [filtruCompanie, setFiltruCompanie] = useState('')
  const [filtruLocatie, setFiltruLocatie] = useState('')
  const [filtruZona, setFiltruZona] = useState('')

  const [form, setForm] = useState({
    companie_id: '',
    locatie_id: '',
    zona_id: '',
    nume: '',
    durata_minute: '',
    pret: ''
  })

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
    if (u.tip === 'power_admin') {
      const { data } = await supabase
        .from('companii')
        .select('*')
        .eq('activ', true)
        .order('nume')
      setCompanii(data || [])
    } else {
      const { data } = await supabase
        .from('user_companii')
        .select('*, companii(*)')
        .eq('user_id', u.id)
        .eq('activ', true)
      const companiiData = data?.map(uc => uc.companii).filter(Boolean) || []
      setCompanii(companiiData)
      if (companiiData.length === 1) {
        setFiltruCompanie(companiiData[0].id)
        setForm(f => ({ ...f, companie_id: companiiData[0].id }))
        await fetchLocatii(companiiData[0].id)
      }
    }
    await fetchPreturi(u)
    setLoading(false)
  }

  async function fetchLocatii(companieId) {
    const { data } = await supabase
      .from('locatii')
      .select('*')
      .eq('companie_id', companieId)
      .eq('activ', true)
      .order('nume')
    setLocatii(data || [])
    setZone([])
  }

  async function fetchZone(locatieId) {
    const { data } = await supabase
      .from('zone')
      .select('*')
      .eq('locatie_id', locatieId)
      .eq('activ', true)
      .order('nume')
    setZone(data || [])
  }

  async function fetchPreturi(u) {
    let query = supabase
      .from('preturi')
      .select('*, companii(nume), locatii(nume), zone(nume)')
      .order('durata_minute')

    if (u.tip !== 'power_admin') {
    const ids = await getCompanieIds(u)
    if (ids.length === 1) {
      query = query.eq('companie_id', ids[0])
    } else if (ids.length > 1) {
      query = query.in('companie_id', ids)
    }
  }
    const { data } = await query
    setPreturi(data || [])
  }

  function selecteazaInterval(minute) {
    const interval = intervale.find(i => i.minute === minute)
    setForm({ ...form, durata_minute: String(minute), nume: interval?.label || '' })
  }

  async function salveaza() {
    setSaving(true)
    setMsg('')

    if (!form.companie_id || !form.locatie_id || !form.zona_id || !form.durata_minute || !form.pret) {
      setMsg('Compania, locația, zona, durata și prețul sunt obligatorii!')
      setSaving(false)
      return
    }

    const payload = {
      companie_id: form.companie_id && form.companie_id !== 'null' ? form.companie_id : null,
      locatie_id: form.locatie_id,
      zona_id: form.zona_id,
      nume: form.nume,
      durata_minute: parseInt(form.durata_minute),
      pret: parseFloat(form.pret),
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

  async function deschideForm(p = null) {
    if (p) {
      setEditPret(p)
      setForm({
        companie_id: p.companie_id || '',
        locatie_id: p.locatie_id || '',
        zona_id: p.zona_id || '',
        nume: p.nume || '',
        durata_minute: String(p.durata_minute),
        pret: String(p.pret)
      })
      if (p.companie_id) await fetchLocatii(p.companie_id)
      if (p.locatie_id) await fetchZone(p.locatie_id)
    } else {
      setEditPret(null)
      setForm({
        companie_id: filtruCompanie || '',
        locatie_id: filtruLocatie || '',
        zona_id: filtruZona || '',
        nume: '',
        durata_minute: '',
        pret: ''
      })
    }
    setShowForm(true)
    setMsg('')
  }

  async function toggleActiv(p) {
    await supabase.from('preturi').update({ activ: !p.activ }).eq('id', p.id)
    fetchPreturi(user)
  }

  async function sterge(p) {
    if (!confirm(`Ștergi tariful "${p.nume}"?`)) return
    await supabase.from('preturi').delete().eq('id', p.id)
    fetchPreturi(user)
  }

  function formatDurata(minute) {
    if (minute < 60) return `${minute} min`
    if (minute < 1440) return `${minute / 60} ${minute / 60 === 1 ? 'oră' : 'ore'}`
    return `${minute / 1440} ${minute / 1440 === 1 ? 'zi' : 'zile'}`
  }

  const preturiFiltrate = preturi.filter(p => {
    if (filtruCompanie && p.companie_id !== filtruCompanie) return false
    if (filtruLocatie && p.locatie_id !== filtruLocatie) return false
    if (filtruZona && p.zona_id !== filtruZona) return false
    return true
  })

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
            <button onClick={() => deschideForm()}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700">
              + Adaugă
            </button>
          </div>

          {/* Filtre */}
          <div className="flex flex-wrap gap-3 mb-4">
            {user.tip === 'power_admin' && companii.length > 1 && (
              <select value={filtruCompanie}
                onChange={async e => {
                  setFiltruCompanie(e.target.value)
                  setFiltruLocatie('')
                  setFiltruZona('')
                  if (e.target.value) await fetchLocatii(e.target.value)
                  else { setLocatii([]); setZone([]) }
                }}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Toate companiile</option>
                {companii.map(c => <option key={c.id} value={c.id}>{c.nume}</option>)}
              </select>
            )}
            <select value={filtruLocatie}
              onChange={async e => {
                setFiltruLocatie(e.target.value)
                setFiltruZona('')
                if (e.target.value) await fetchZone(e.target.value)
                else setZone([])
              }}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Toate locațiile</option>
              {locatii.map(l => <option key={l.id} value={l.id}>{l.nume}</option>)}
            </select>
            {zone.length > 0 && (
              <select value={filtruZona}
                onChange={e => setFiltruZona(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Toate zonele</option>
                {zone.map(z => <option key={z.id} value={z.id}>{z.nume}</option>)}
              </select>
            )}
          </div>

          {/* Form */}
          {showForm && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
              <h3 className="font-semibold text-gray-700 mb-3">
                {editPret ? '✏️ Editează tarif' : '➕ Tarif nou'}
              </h3>

              {/* Selector companie/locatie/zona */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {companii.length > 1 && (
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Companie *</label>
                    <select value={form.companie_id}
                      onChange={async e => {
                        setForm({ ...form, companie_id: e.target.value, locatie_id: '', zona_id: '' })
                        if (e.target.value) await fetchLocatii(e.target.value)
                      }}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">— Alege companie —</option>
                      {companii.map(c => <option key={c.id} value={c.id}>{c.nume}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-xs text-gray-500 font-medium">Locație *</label>
                  <select value={form.locatie_id}
                    onChange={async e => {
                      setForm({ ...form, locatie_id: e.target.value, zona_id: '' })
                      if (e.target.value) await fetchZone(e.target.value)
                    }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Alege locație —</option>
                    {locatii.map(l => <option key={l.id} value={l.id}>{l.nume}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Zonă *</label>
                  <select value={form.zona_id}
                    onChange={e => setForm({ ...form, zona_id: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Alege zonă —</option>
                    {zone.map(z => <option key={z.id} value={z.id}>{z.nume}</option>)}
                  </select>
                </div>
              </div>

              {/* Intervale rapide */}
              <p className="text-xs text-gray-500 font-medium mb-2">Selectează interval:</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {intervale.map(i => (
                  <button key={i.minute}
                    onClick={() => selecteazaInterval(i.minute)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                      form.durata_minute === String(i.minute)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}>
                    {i.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Nume tarif</label>
                  <input value={form.nume}
                    onChange={e => setForm({ ...form, nume: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: 1 oră" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Durata (minute) *</label>
                  <input type="number" value={form.durata_minute}
                    onChange={e => setForm({ ...form, durata_minute: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: 60" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Preț (RON) *</label>
                  <input type="number" step="0.5" value={form.pret}
                    onChange={e => setForm({ ...form, pret: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: 10.00" />
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

          {/* Lista preturi grupate pe locatie/zona */}
          {loading ? (
            <p className="text-gray-400 text-sm">Se încarcă...</p>
          ) : (
            <div className="space-y-4">
              {preturiFiltrate.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Niciun tarif definit</p>
              ) : (
                // Grupeaza pe locatie + zona
                Object.entries(
                  preturiFiltrate.reduce((acc, p) => {
                    const cheie = `${p.locatii?.nume || '—'} — Zona ${p.zone?.nume || '—'}`
                    if (!acc[cheie]) acc[cheie] = []
                    acc[cheie].push(p)
                    return acc
                  }, {})
                ).map(([grupa, preturiGrupa]) => (
                  <div key={grupa}>
                    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                      📍 {grupa}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {preturiGrupa.map(p => (
                        <div key={p.id}
                          className={`border-2 rounded-xl p-4 ${
                            p.activ ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
                          }`}>
                          <div className="text-xl font-bold text-blue-600">{p.pret} RON</div>
                          <div className="text-sm font-medium text-gray-800 mt-1">{p.nume}</div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {formatDurata(p.durata_minute)}
                          </div>
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
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}