'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function AdminLocatii() {
  const [user, setUser] = useState(null)
  const [locatii, setLocatii] = useState([])
  const [zone, setZone] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editLocatie, setEditLocatie] = useState(null)
  const [showZone, setShowZone] = useState(null)
  const [formLocatie, setFormLocatie] = useState({ nume: '', adresa: '' })
  const [formZona, setFormZona] = useState({ nume: '', descriere: '' })
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
    fetchLocatii(parsed)
  }, [])

  async function fetchLocatii(u) {
    setLoading(true)
    const { data } = await supabase
      .from('locatii')
      .select('*, zone(*)')
      .eq('companie_id', u.companie_id)
      .order('nume')
    setLocatii(data || [])
    setLoading(false)
  }

  async function fetchZone(locatieId) {
    const { data } = await supabase
      .from('zone')
      .select('*')
      .eq('locatie_id', locatieId)
      .order('nume')
    setZone(data || [])
  }

  function deschideForm(l = null) {
    if (l) {
      setEditLocatie(l)
      setFormLocatie({ nume: l.nume, adresa: l.adresa || '' })
    } else {
      setEditLocatie(null)
      setFormLocatie({ nume: '', adresa: '' })
    }
    setShowForm(true)
    setShowZone(null)
    setMsg('')
  }

  async function deschideZone(l) {
    setShowZone(l)
    setShowForm(false)
    setMsg('')
    await fetchZone(l.id)
  }

  async function salveazaLocatie() {
    setSaving(true)
    setMsg('')
    if (!formLocatie.nume) {
      setMsg('Numele locației este obligatoriu!')
      setSaving(false)
      return
    }
    if (editLocatie) {
      const { error } = await supabase
        .from('locatii')
        .update({ nume: formLocatie.nume, adresa: formLocatie.adresa })
        .eq('id', editLocatie.id)
      if (error) { setMsg('Eroare: ' + error.message); setSaving(false); return }
      setMsg('✅ Locație actualizată!')
    } else {
      const { error } = await supabase
        .from('locatii')
        .insert({
          nume: formLocatie.nume,
          adresa: formLocatie.adresa,
          companie_id: user.companie_id,
          activ: true
        })
      if (error) { setMsg('Eroare: ' + error.message); setSaving(false); return }
      setMsg('✅ Locație adăugată!')
    }
    fetchLocatii(user)
    setSaving(false)
    setTimeout(() => { setShowForm(false); setMsg('') }, 1500)
  }

  async function adaugaZona() {
    if (!formZona.nume) {
      setMsg('Numele zonei este obligatoriu!')
      return
    }
    const { error } = await supabase
      .from('zone')
      .insert({
        locatie_id: showZone.id,
        companie_id: user.companie_id,
        nume: formZona.nume.toUpperCase(),
        descriere: formZona.descriere || null,
        activ: true
      })
    if (error) { setMsg('Eroare: ' + error.message); return }
    setFormZona({ nume: '', descriere: '' })
    await fetchZone(showZone.id)
    fetchLocatii(user)
    setMsg('✅ Zonă adăugată!')
  }

  async function stergeZona(zonaId) {
    if (!confirm('Ștergi această zonă?')) return
    await supabase.from('zone').delete().eq('id', zonaId)
    await fetchZone(showZone.id)
    fetchLocatii(user)
  }

  async function toggleActivLocatie(l) {
    await supabase.from('locatii').update({ activ: !l.activ }).eq('id', l.id)
    fetchLocatii(user)
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
            className="bg-blue-600 text-white p-2.5 rounded-xl text-center font-medium text-xs">
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
            <h2 className="text-lg font-bold text-gray-800">📍 Locații & Zone</h2>
            <button
              onClick={() => deschideForm()}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700"
            >
              + Adaugă locație
            </button>
          </div>

          {/* Form locatie */}
          {showForm && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
              <h3 className="font-semibold text-gray-700 mb-3">
                {editLocatie ? '✏️ Editează locație' : '➕ Locație nouă'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Nume locație *</label>
                  <input
                    value={formLocatie.nume}
                    onChange={e => setFormLocatie({ ...formLocatie, nume: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: Sediu Central"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Adresă</label>
                  <input
                    value={formLocatie.adresa}
                    onChange={e => setFormLocatie({ ...formLocatie, adresa: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: Str. Exemplu nr. 1"
                  />
                </div>
              </div>
              {msg && (
                <p className={`mt-2 text-sm ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
                  {msg}
                </p>
              )}
              <div className="flex gap-2 mt-3">
                <button onClick={salveazaLocatie} disabled={saving}
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

          {/* Panel zone */}
          {showZone && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4">
              <h3 className="font-semibold text-indigo-800 mb-3">
                🗂️ Zone pentru {showZone.nume}
              </h3>

              {/* Zone existente */}
              <div className="flex flex-wrap gap-2 mb-4">
                {zone.map(z => (
                  <div key={z.id}
                    className="flex items-center gap-2 bg-white border border-indigo-200 rounded-xl px-3 py-2">
                    <span className="font-medium text-gray-800 text-sm">
                      {z.nume}
                    </span>
                    {z.descriere && (
                      <span className="text-xs text-gray-400">{z.descriere}</span>
                    )}
                    <button onClick={() => stergeZona(z.id)}
                      className="text-red-400 hover:text-red-600 text-xs ml-1">
                      ✕
                    </button>
                  </div>
                ))}
                {zone.length === 0 && (
                  <p className="text-sm text-gray-400">Nicio zonă definită încă</p>
                )}
              </div>

              {/* Adauga zona */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  value={formZona.nume}
                  onChange={e => setFormZona({ ...formZona, nume: e.target.value.toUpperCase() })}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nume zonă (ex: A, VIP)"
                  maxLength={20}
                />
                <input
                  value={formZona.descriere}
                  onChange={e => setFormZona({ ...formZona, descriere: e.target.value })}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Descriere (opțional)"
                />
                <button onClick={adaugaZona}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-indigo-700">
                  + Adaugă zonă
                </button>
              </div>

              {msg && (
                <p className={`mt-2 text-sm ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
                  {msg}
                </p>
              )}

              <button onClick={() => { setShowZone(null); setMsg('') }}
                className="mt-3 bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm hover:bg-gray-300">
                Închide
              </button>
            </div>
          )}

          {/* Lista locatii */}
          {loading ? (
            <p className="text-gray-400 text-sm">Se încarcă...</p>
          ) : (
            <div className="space-y-3">
              {locatii.map(l => (
                <div key={l.id}
                  className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-800">📍 {l.nume}</p>
                      {l.adresa && (
                        <p className="text-xs text-gray-400 mt-0.5">{l.adresa}</p>
                      )}
                      {/* Zone */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {l.zone?.map(z => (
                          <span key={z.id}
                            className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                            {z.nume}
                          </span>
                        ))}
                        {(!l.zone || l.zone.length === 0) && (
                          <span className="text-xs text-gray-400">Nicio zonă definită</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        l.activ ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {l.activ ? 'Activă' : 'Inactivă'}
                      </span>
                      <button onClick={() => deschideZone(l)}
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">
                        🗂️ Zone
                      </button>
                      <button onClick={() => deschideForm(l)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                        ✏️ Edit
                      </button>
                      <button onClick={() => toggleActivLocatie(l)}
                        className="text-yellow-600 hover:text-yellow-800 text-xs font-medium">
                        {l.activ ? '🔴' : '🟢'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {locatii.length === 0 && (
                <p className="text-center text-gray-400 py-8">Nicio locație adăugată încă</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}