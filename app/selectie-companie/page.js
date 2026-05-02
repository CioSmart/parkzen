'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SelectieCompanie() {
  const [user, setUser] = useState(null)
  const [companii, setCompanii] = useState([])
  const router = useRouter()

  useEffect(() => {
    const u = localStorage.getItem('user')
    const uc = localStorage.getItem('user_companii')
    if (!u || !uc) { router.push('/'); return }
    setUser(JSON.parse(u))
    setCompanii(JSON.parse(uc))
  }, [])

  function selecteaza(uc) {
    const userActualizat = {
      ...user,
      companie_id: uc.companie_id,
      tip_companie: uc.tip,
      companie_nume: uc.companii?.nume || null
    }
    localStorage.setItem('user', JSON.stringify(userActualizat))

    if (uc.tip === 'admin') {
      router.push('/admin/locatii')
    } else {
      router.push('/dashboard')
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🅿️</div>
          <h1 className="text-2xl font-bold text-gray-900">Selectează compania</h1>
          <p className="text-gray-500 mt-1">Bun venit, {user.nume || user.email}</p>
        </div>

        <div className="space-y-3">
          {companii.map(uc => (
            <button key={uc.id}
              onClick={() => selecteaza(uc)}
              className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition text-left">
              <div className="font-semibold text-gray-800">🏢 {uc.companii?.nume}</div>
              <div className="text-sm text-gray-500 mt-0.5">
                Rol: <span className={`font-medium ${
                  uc.tip === 'admin' ? 'text-orange-600' : 'text-blue-600'
                }`}>{uc.tip}</span>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => { localStorage.removeItem('user'); localStorage.removeItem('user_companii'); router.push('/') }}
          className="w-full mt-4 text-red-500 hover:text-red-700 text-sm font-medium">
          ← Înapoi la login
        </button>
      </div>
    </div>
  )
}