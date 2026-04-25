'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (!u) { router.push('/'); return }
    setUser(JSON.parse(u))
  }, [])

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow p-6 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">🅿️ Parking App</h1>
            <p className="text-gray-500">Bun venit, <span className="font-medium">{user.name}</span></p>
          </div>
          <button
            onClick={() => { localStorage.removeItem('user'); router.push('/') }}
            className="text-red-500 hover:text-red-700 font-medium"
          >
            Ieși din cont
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/rezervare')}
            className="bg-blue-400 text-white p-6 rounded-xl shadow hover:bg-blue-700 transition text-left"
          >
            <div className="text-3xl mb-2">🚗</div>
            <div className="text-xl font-bold">Rezervă loc</div>
            <div className="text-blue-100 text-sm">Alege un loc de parcare</div>
          </button>
          <button
            onClick={() => router.push('/rezervarile-mele')}
            className="bg-green-400 text-white p-6 rounded-xl shadow hover:bg-green-700 transition text-left"
          >
            <div className="text-3xl mb-2">📋</div>
            <div className="text-xl font-bold">Rezervările mele</div>
            <div className="text-green-100 text-sm">Vezi rezervările active</div>
          </button>
             <button
            onClick={() => router.push('/profil')}
            className="bg-purple-400 text-white p-6 rounded-xl shadow hover:bg-purple-700 transition text-left">
            <div className="text-3xl mb-2">👤</div>
            <div className="text-xl font-bold">Profilul meu</div>
            <div className="text-purple-100 text-sm">Modifică mașina și parola</div>
          </button>
        </div>
      </div>
    </div>
  )
}