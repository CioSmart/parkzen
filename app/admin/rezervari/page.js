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
    if (parsed.tip !== 'admin') { router.push('/dashboard'); return }
    setUser(parsed)
    fetchRezervari()
  }, [])

  async function fetchRezervari() {
    setLoading(true)
    const { data } = await supabase
      .from('rezervari')
      .select('*, users(nume, email, tip), locuri_parcare(numar_loc, descriere), masini(nr_masina)')
      .order('data_start', { ascending: false })
    setRezervari(data || [])
    setLoading(false)
  }

  async function anuleaza(r) {
    if (!confirm(`Anulezi rezervarea lui ${r.users?.nume || r.users?.email}?`)) return
    await supabase.from('rezervari').update({ status: 'anulata' }).eq('id', r.id)
    await supabase.from('notificari').insert({
      user_id: r.user_id,
      tip: 'anulare_admin',
      mesaj: `Rezervarea ta pentru locul ${r.locuri_parcare?.numar_loc} din data ${r.data_start} a fost anulată de administrator.`,
      trimis: false
    })
    fetchRezervari()
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
      <div className="max-w-6xl mx-auto">

        <div className="bg-white rounded-xl shadow p-4 mb-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">⚙️ Admin Panel</h1>
          <button onClick={() => { localStorage.removeItem('user'); router.push('/') }}
            className="text-red-500 hover:text-red-700 font-medium text-sm">Ieși din cont</button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <button onClick={() => router.push('/admin/masini')}
            className="bg-gray-200 text-gray-700 p-3 rounded-xl text-center font-medium text-sm hover:bg-gray-300">👥 Utilizatori</button>
          <button onClick={() => router.push('/admin/locuri')}
            className="bg-gray-200 text-gray-700 p-3 rounded-xl text-center font-medium text-sm hover:bg-gray-300">🅿️ Locuri</button>
          <button onClick={() => router.push('/admin/rezervari')}
            className="bg-blue-600 text-white p-3 rounded-xl text-center font-medium text-sm">📋 Rezervări</button>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-700">Toate Rezervările</h2>
            <span className="text-sm text-gray-400">{rezervari.length} rezervări</span>
          </div>

          {loading ? (
            <p className="text-gray-400 text-sm">Se încarcă...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-left">
                    <th className="px-3 py-2 rounded-l-lg">Utilizator</th>
                    <th className="px-3 py-2">Tip</th>
                    <th className="px-3 py-2">Mașină</th>
                    <th className="px-3 py-2">Loc</th>
                    <th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 rounded-r-lg">Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {rezervari.map(r => (
                    <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium text-gray-800">{r.users?.nume || r.users?.email}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          r.users?.tip === 'master' ? 'bg-orange-100 text-orange-700' :
                          r.users?.tip === 'admin' ? 'bg-purple-100 text-purple-700' :
                          'bg-blue-100 text-blue-700'}`}>
                          {r.users?.tip}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-600">🚗 {r.masini?.nr_masina || '—'}</td>
                      <td className="px-3 py-3 font-medium">🅿️ {r.locuri_parcare?.numar_loc}</td>
                      <td className="px-3 py-3 text-gray-600">📅 {r.data_start}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {(r.status === 'activa' || r.status === 'mutata') && (
                          <button onClick={() => anuleaza(r)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium">🚫 Anulează</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rezervari.length === 0 && <p className="text-center text-gray-400 py-8">Nicio rezervare găsită</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}