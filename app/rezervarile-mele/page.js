'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function RezervarilemMele() {
  const [user, setUser] = useState(null)
  const [rezervari, setRezervari] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (!u) { router.push('/'); return }
    const parsed = JSON.parse(u)
    if (parsed.tip === 'admin') { router.push('/admin/masini'); return }
    setUser(parsed)
    fetchRezervari(parsed)
  }, [])

  async function fetchRezervari(u) {
    setLoading(true)
    const { data } = await supabase
      .from('rezervari')
      .select('*, locuri_parcare(numar_loc, descriere), masini(nr_masina, descriere)')
      .eq('user_id', u.id)
      .order('data_start', { ascending: false })
    setRezervari(data || [])
    setLoading(false)
  }

  async function anuleaza(r) {
    if (!confirm('Anulezi această rezervare?')) return
    await supabase.from('rezervari').update({ status: 'anulata' }).eq('id', r.id)
    fetchRezervari(user)
  }

  function statusColor(s) {
    if (s === 'activa') return 'bg-green-100 text-green-700'
    if (s === 'anulata') return 'bg-red-100 text-red-700'
    if (s === 'preluata') return 'bg-orange-100 text-orange-700'
    if (s === 'mutata') return 'bg-blue-100 text-blue-700'
    return 'bg-gray-100 text-gray-700'
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">

        <div className="bg-white rounded-xl shadow p-4 mb-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">📋 Rezervările mele</h1>
            <p className="text-sm text-gray-500">{user.nume || user.email}</p>
          </div>
          <button onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm">← Înapoi</button>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          {loading ? (
            <p className="text-gray-400 text-sm">Se încarcă...</p>
          ) : rezervari.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🅿️</div>
              <p className="text-gray-400">Nu ai nicio rezervare încă</p>
              <button onClick={() => router.push('/rezervare')}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700">
                Fă o rezervare
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {rezervari.map(r => (
                <div key={r.id} className={`border rounded-xl p-4 ${
                  r.status === 'activa' ? 'border-green-200 bg-green-50' :
                  r.status === 'mutata' ? 'border-blue-200 bg-blue-50' :
                  'border-gray-200 bg-gray-50'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-gray-800">🅿️ Loc {r.locuri_parcare?.numar_loc}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(r.status)}`}>
                          {r.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">🚗 {r.masini?.nr_masina}
                        {r.masini?.descriere && <span className="text-gray-400 text-xs"> — {r.masini.descriere}</span>}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">📅 {r.data_start} → {r.data_sfarsit}</p>
                      {r.status === 'mutata' && (
                        <p className="text-xs text-blue-600 mt-1">ℹ️ Rezervarea ta a fost mutată pe acest loc</p>
                      )}
                    </div>
                    {(r.status === 'activa' || r.status === 'mutata') && (
                      <button onClick={() => anuleaza(r)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium">🚫 Anulează</button>
                    )}
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