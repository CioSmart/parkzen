'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function RezervărileMele() {
  const [user, setUser] = useState(null)
  const [rezervari, setRezervari] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtru, setFiltru] = useState('toate')
  const router = useRouter()

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (!u) { router.push('/'); return }
    const parsed = JSON.parse(u)
    if (parsed.tip === 'power_admin') { router.push('/power-admin/companii'); return }
    if (parsed.tip === 'admin') { router.push('/admin/locatii'); return }
    setUser(parsed)
    fetchRezervari(parsed)
  }, [])

  async function fetchRezervari(u) {
    setLoading(true)
    const { data } = await supabase
      .from('rezervari')
      .select('*, locuri_parcare(numar_loc, etaj, zona), locatii(nume), masini(nr_masina, descriere), preturi(nume, durata_minute)')
      .eq('user_id', u.id)
      .order('data_ora_start', { ascending: false })
    setRezervari(data || [])
    setLoading(false)
  }

  async function anuleaza(r) {
    if (!confirm('Anulezi această rezervare?')) return
    await supabase.from('rezervari').update({ status: 'anulata' }).eq('id', r.id)
    fetchRezervari(user)
  }

  function formatData(dt) {
    if (!dt) return '—'
    return new Date(dt).toLocaleString('ro-RO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  function esteActiva(r) {
    if (r.status !== 'activa') return false
    return new Date(r.data_ora_sfarsit) > new Date()
  }

  function statusColor(r) {
    if (r.status === 'anulata') return 'bg-red-100 text-red-700'
    if (new Date(r.data_ora_sfarsit) < new Date()) return 'bg-gray-100 text-gray-600'
    if (r.status === 'activa') return 'bg-green-100 text-green-700'
    return 'bg-gray-100 text-gray-600'
  }

  function statusLabel(r) {
    if (r.status === 'anulata') return 'Anulată'
    if (new Date(r.data_ora_sfarsit) < new Date()) return 'Expirată'
    if (r.status === 'activa') return 'Activă'
    return r.status
  }

  const rezervariFiltrate = rezervari.filter(r => {
    if (filtru === 'active') return esteActiva(r)
    if (filtru === 'istorice') return !esteActiva(r)
    return true
  })

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">📋 Rezervările mele</h1>
            <p className="text-sm text-gray-500 mt-0.5">{user.nume || user.email}</p>
          </div>
          <button onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm">
            ← Înapoi
          </button>
        </div>

        {/* Filtre */}
        <div className="flex gap-2 mb-4">
          {[
            { key: 'toate', label: 'Toate' },
            { key: 'active', label: '⚡ Active' },
            { key: 'istorice', label: '📁 Istorice' }
          ].map(f => (
            <button key={f.key}
              onClick={() => setFiltru(f.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                filtru === f.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-2xl p-8 text-center">
              <p className="text-gray-400">Se încarcă...</p>
            </div>
          ) : rezervariFiltrate.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center">
              <div className="text-4xl mb-2">🅿️</div>
              <p className="text-gray-400">Nu ai rezervări</p>
              <button onClick={() => router.push('/rezervare')}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-xl text-sm hover:bg-blue-700">
                Fă o rezervare
              </button>
            </div>
          ) : (
            rezervariFiltrate.map(r => (
              <div key={r.id}
                className={`bg-white rounded-2xl shadow-sm border-2 p-5 ${
                  esteActiva(r) ? 'border-green-200' : 'border-gray-100'
                }`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-bold text-gray-800">
                        🅿️ Loc {r.locuri_parcare?.numar_loc}
                      </span>
                      {r.locuri_parcare?.zona && (
                        <span className="text-xs text-gray-400">
                          Zona {r.locuri_parcare.zona} / Etaj {r.locuri_parcare.etaj}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(r)}`}>
                        {statusLabel(r)}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">
                        📍 {r.locatii?.nume}
                      </p>
                      <p className="text-sm text-gray-600">
                        🚗 {r.masini?.nr_masina}
                        {r.masini?.descriere && (
                          <span className="text-gray-400 text-xs ml-1">— {r.masini.descriere}</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600">
                        🕐 {formatData(r.data_ora_start)} → {formatData(r.data_ora_sfarsit)}
                      </p>
                      {r.preturi && (
                        <p className="text-sm text-gray-500">
                          💰 {r.preturi.nume}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right ml-4">
                    <div className="text-xl font-bold text-blue-600">
                      {r.pret_total} RON
                    </div>
                    {esteActiva(r) && (
                      <button onClick={() => anuleaza(r)}
                        className="mt-2 text-red-500 hover:text-red-700 text-xs font-medium">
                        🚫 Anulează
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}