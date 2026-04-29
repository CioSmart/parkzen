'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function AdminRezervari() {
  const [user, setUser] = useState(null)
  const [rezervari, setRezervari] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (!u) { router.push('/'); return }
    const parsed = JSON.parse(u)
    if (parsed.tip !== 'admin' && parsed.tip !== 'power_admin') {
      router.push('/dashboard'); return
    }
    setUser(parsed)
    fetchRezervari(parsed)
  }, [])

  async function fetchRezervari(u) {
    setLoading(true)
    const { data } = await supabase
      .from('rezervari')
      .select(`
        *,
        users(nume, email),
        locuri_parcare(numar_loc, etaj, zona),
        locatii(nume),
        masini(nr_masina),
        preturi(nume, pret, durata_minute)
      `)
      .eq('companie_id', u.companie_id)
      .order('data_ora_start', { ascending: false })
    setRezervari(data || [])
    setLoading(false)
  }

  async function anuleaza(r) {
    if (!confirm(`Anulezi rezervarea lui ${r.users?.nume || r.users?.email}?`)) return
    await supabase.from('rezervari').update({ status: 'anulata' }).eq('id', r.id)
    fetchRezervari(user)
  }

  function statusColor(s) {
    if (s === 'activa') return 'bg-green-100 text-green-700'
    if (s === 'anulata') return 'bg-red-100 text-red-700'
    if (s === 'expirata') return 'bg-gray-100 text-gray-700'
    return 'bg-blue-100 text-blue-700'
  }

  function formatData(dt) {
    if (!dt) return '—'
    return new Date(dt).toLocaleString('ro-RO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">

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
            className="bg-blue-600 text-white p-2.5 rounded-xl text-center font-medium text-xs">
            📋 Rezervări
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">📋 Toate rezervările</h2>
            <span className="text-sm text-gray-400">{rezervari.length} rezervări</span>
          </div>

          {loading ? (
            <p className="text-gray-400 text-sm">Se încarcă...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-left">
                    <th className="px-3 py-2 rounded-l-lg">User</th>
                    <th className="px-3 py-2">Mașină</th>
                    <th className="px-3 py-2">Locație</th>
                    <th className="px-3 py-2">Loc</th>
                    <th className="px-3 py-2">Start</th>
                    <th className="px-3 py-2">Sfârșit</th>
                    <th className="px-3 py-2">Tarif</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 rounded-r-lg">Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {rezervari.map(r => (
                    <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium text-gray-800">
                        {r.users?.nume || r.users?.email || '—'}
                      </td>
                      <td className="px-3 py-3 text-gray-500">
                        🚗 {r.masini?.nr_masina || '—'}
                      </td>
                      <td className="px-3 py-3 text-gray-500">
                        {r.locatii?.nume || '—'}
                      </td>
                      <td className="px-3 py-3 font-medium">
                        🅿️ {r.locuri_parcare?.numar_loc}
                        {r.locuri_parcare?.zona && (
                          <span className="text-xs text-gray-400 ml-1">
                            Zona {r.locuri_parcare.zona} / Etaj {r.locuri_parcare.etaj}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-gray-600 text-xs">
                        {formatData(r.data_ora_start)}
                      </td>
                      <td className="px-3 py-3 text-gray-600 text-xs">
                        {formatData(r.data_ora_sfarsit)}
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-xs">
                        {r.preturi?.nume || '—'}
                      </td>
                      <td className="px-3 py-3 font-medium text-blue-600">
                        {r.pret_total ? `${r.pret_total} RON` : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {r.status === 'activa' && (
                          <button onClick={() => anuleaza(r)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium">
                            🚫 Anulează
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rezervari.length === 0 && (
                <p className="text-center text-gray-400 py-8">Nicio rezervare găsită</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}