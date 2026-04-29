'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [rezervariActive, setRezervariActive] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (!u) { router.push('/'); return }
    const parsed = JSON.parse(u)
    if (parsed.tip === 'power_admin') { router.push('/power-admin/companii'); return }
    if (parsed.tip === 'admin') { router.push('/admin/locatii'); return }
    setUser(parsed)
    fetchRezervariActive(parsed)
  }, [])

  async function fetchRezervariActive(u) {
    setLoading(true)
    const acum = new Date().toISOString()
    const { data } = await supabase
      .from('rezervari')
      .select('*, locuri_parcare(numar_loc, etaj, zona), locatii(nume), masini(nr_masina), preturi(nume)')
      .eq('user_id', u.id)
      .eq('status', 'activa')
      .gte('data_ora_sfarsit', acum)
      .order('data_ora_start')
    setRezervariActive(data || [])
    setLoading(false)
  }

  function formatData(dt) {
    if (!dt) return '—'
    return new Date(dt).toLocaleString('ro-RO', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">🅿️ ParkZen</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Bun venit, <span className="font-medium text-gray-800">{user.nume || user.email}</span>
            </p>
          </div>
          <button
            onClick={() => { localStorage.removeItem('user'); router.push('/') }}
            className="text-red-500 hover:text-red-700 font-medium text-sm"
          >
            Ieși din cont
          </button>
        </div>

        {/* Actiuni rapide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => router.push('/rezervare')}
            className="bg-blue-600 text-white p-6 rounded-2xl shadow-sm hover:bg-blue-700 transition text-left"
          >
            <div className="text-3xl mb-2">🚗</div>
            <div className="text-lg font-bold">Rezervă loc</div>
            <div className="text-blue-100 text-sm mt-1">Alege interval și loc de parcare</div>
          </button>
          <button
            onClick={() => router.push('/rezervarile-mele')}
            className="bg-green-600 text-white p-6 rounded-2xl shadow-sm hover:bg-green-700 transition text-left"
          >
            <div className="text-3xl mb-2">📋</div>
            <div className="text-lg font-bold">Rezervările mele</div>
            <div className="text-green-100 text-sm mt-1">Vezi istoricul rezervărilor</div>
          </button>
          <button
            onClick={() => router.push('/profil')}
            className="bg-purple-600 text-white p-6 rounded-2xl shadow-sm hover:bg-purple-700 transition text-left"
          >
            <div className="text-3xl mb-2">👤</div>
            <div className="text-lg font-bold">Profilul meu</div>
            <div className="text-purple-100 text-sm mt-1">Mașini și setări cont</div>
          </button>
        </div>

        {/* Rezervari active acum */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">⚡ Rezervări active</h2>
          {loading ? (
            <p className="text-gray-400 text-sm">Se încarcă...</p>
          ) : rezervariActive.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🅿️</div>
              <p className="text-gray-400">Nu ai rezervări active momentan</p>
              <button
                onClick={() => router.push('/rezervare')}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-xl text-sm hover:bg-blue-700"
              >
                Fă o rezervare
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {rezervariActive.map(r => (
                <div key={r.id}
                  className="border-2 border-green-200 bg-green-50 rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-gray-800">
                          🅿️ Loc {r.locuri_parcare?.numar_loc}
                        </span>
                        {r.locuri_parcare?.zona && (
                          <span className="text-xs text-gray-500">
                            Zona {r.locuri_parcare.zona} / Etaj {r.locuri_parcare.etaj}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        📍 {r.locatii?.nume}
                      </p>
                      <p className="text-sm text-gray-600">
                        🚗 {r.masini?.nr_masina}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        🕐 {formatData(r.data_ora_start)} → {formatData(r.data_ora_sfarsit)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">
                        {r.pret_total} RON
                      </div>
                      <div className="text-xs text-gray-400">{r.preturi?.nume}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}