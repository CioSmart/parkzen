'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function AdminLocuri() {
  const [user, setUser] = useState(null)
  const [companii, setCompanii] = useState([])
  const [locatii, setLocatii] = useState([])
  const [zone, setZone] = useState([])
  const [locuri, setLocuri] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editLoc, setEditLoc] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [filtruCompanie, setFiltruCompanie] = useState('')
  const [filtruLocatie, setFiltruLocatie] = useState('')
  const [filtruZona, setFiltruZona] = useState('')

  const [form, setForm] = useState({
    numar_loc: '',
    etaj: '0',
    zona_id: '',
    locatie_id: '',
    companie_id: '',
    descriere: ''
  })

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
      // Admin - fetch companiile lui
      const { data } = await supabase
        .from('user_companii')
        .select('*, companii(*)')
        .eq('user_id', u.id)
        .eq('activ', true)
      const companiiData = data?.map(uc => uc.companii).filter(Boolean) || []
      setCompanii(companiiData)

      // Daca are o singura companie, selecteaza automat
      if (companiiData.length === 1) {
        setFiltruCompanie(companiiData[0].id)
        setForm(f => ({ ...f, companie_id: companiiData[0].id }))
        await fetchLocatii(companiiData[0].id)
      }
    }
    await fetchLocuri(u)
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
    setFiltruLocatie('')
    setFiltruZona('')
  }

  async function fetchZone(locatieId) {
    const { data } = await supabase
      .from('zone')
      .select('*')
      .eq('locatie_id', locatieId)
      .eq('activ', true)
      .order('nume')
    setZone(data || [])
    setFiltruZona('')
  }

  async function fetchLocuri(u) {
    let query = supabase
      .from('locuri_parcare')
      .select('*, locatii(nume), zone(nume), companii(nume)')
      .order('etaj').order('numar_loc')

  if (u.tip !== 'power_admin') {
  const companieId = u.companie_id && u.companie_id !== 'null' ? u.companie_id : null
  if (companieId) {
    query = query.eq('companie_id', companieId)
  } else {
    const { data: uc } = await supabase
      .from('user_companii')
      .select('companie_id')
      .eq('user_id', u.id)
      .eq('activ', true)
    const ids = uc?.map(x => x.companie_id).filter(Boolean) || []
    if (ids.length > 0) {
      query = query.in('companie_id', ids)
    }
  }
}

    const { data } = await query
    setLocuri(data || [])
  }

  async function salveaza() {
    setSaving(true)
    setMsg('')

    if (!form.numar_loc || !form.locatie_id || !form.zona_id) {
      setMsg('Numărul locului, locația și zona sunt obligatorii!')
      setSaving(false)
      return
    }

    const payload = {
      numar_loc: form.numar_loc,
      etaj: parseInt(form.etaj) || 0,
      zona_id: form.zona_id,
      zona: zone.find(z => z.id === form.zona_id)?.nume || null,
      locatie_id: form.locatie_id,
      companie_id: form.companie_id,
      descriere: form.descriere || null,
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

    fetchLocuri(user)
    setSaving(false)
    setTimeout(() => { setShowForm(false); setMsg('') }, 1500)
  }

  async function deschideForm(l = null) {
    if (l) {
      setEditLoc(l)
      setForm({
        numar_loc: l.numar_loc,
        etaj: String(l.etaj || 0),
        zona_id: l.zona_id || '',
        locatie_id: l.locatie_id || '',
        companie_id: l.companie_id || '',
        descriere: l.descriere || ''
      })
      if (l.companie_id) await fetchLocatii(l.companie_id)
      if (l.locatie_id) await fetchZone(l.locatie_id)
    } else {
      setEditLoc(null)
      setForm({
        numar_loc: '',
        etaj: '0',
        zona_id: '',
        locatie_id: filtruLocatie || '',
        companie_id: filtruCompanie || '',
        descriere: ''
      })
    }
    setShowForm(true)
    setMsg('')
  }

  async function toggleActiv(l) {
    await supabase.from('locuri_parcare').update({ activ: !l.activ }).eq('id', l.id)
    fetchLocuri(user)
  }

  async function sterge(l) {
    if (!confirm(`Ștergi locul ${l.numar_loc}?`)) return
    await supabase.from('locuri_parcare').delete().eq('id', l.id)
    fetchLocuri(user)
  }

  const locuriFiltrate = locuri.filter(l => {
    if (filtruCompanie && l.companie_id !== filtruCompanie) return false
    if (filtruLocatie && l.locatie_id !== filtruLocatie) return false
    if (filtruZona && l.zona_id !== filtruZona) return false
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
            <button onClick={() => deschideForm()}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700">
              + Adaugă
            </button>
          </div>

          {/* Filtre */}
          <div className="flex flex-wrap gap-3 mb-4">
            {companii.length > 1 && (
              <select value={filtruCompanie}
                onChange={async e => {
                  setFiltruCompanie(e.target.value)
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
                {editLoc ? '✏️ Editează loc' : '➕ Loc nou'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

                {/* Companie */}
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

                {/* Locatie */}
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

                {/* Zona */}
                <div>
                  <label className="text-xs text-gray-500 font-medium">Zonă *</label>
                  <select value={form.zona_id}
                    onChange={e => setForm({ ...form, zona_id: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Alege zonă —</option>
                    {zone.map(z => <option key={z.id} value={z.id}>{z.nume}</option>)}
                  </select>
                </div>

                {/* Numar loc */}
                <div>
                  <label className="text-xs text-gray-500 font-medium">Număr loc *</label>
                  <input value={form.numar_loc}
                    onChange={e => setForm({ ...form, numar_loc: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: A1, P-01" />
                </div>

                {/* Etaj */}
                <div>
                  <label className="text-xs text-gray-500 font-medium">Etaj</label>
                  <input type="number" value={form.etaj}
                    onChange={e => setForm({ ...form, etaj: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0" />
                </div>

                {/* Descriere */}
                <div>
                  <label className="text-xs text-gray-500 font-medium">Descriere</label>
                  <input value={form.descriere}
                    onChange={e => setForm({ ...form, descriere: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: lângă lift" />
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

          {/* Tabel locuri */}
          {loading ? (
            <p className="text-gray-400 text-sm">Se încarcă...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-left">
                    <th className="px-3 py-2 rounded-l-lg">Loc</th>
                    <th className="px-3 py-2">Locație</th>
                    <th className="px-3 py-2">Zonă</th>
                    <th className="px-3 py-2">Etaj</th>
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
                      <td className="px-3 py-3">
                        {l.zone?.nume ? (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                            {l.zone.nume}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-3 text-gray-500">Etaj {l.etaj}</td>
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
                            ✏️
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
                <p className="text-center text-gray-400 py-8">Niciun loc găsit</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}