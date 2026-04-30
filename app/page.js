'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Email sau parolă incorectă!')
      setLoading(false)
      return
    }

   const { data: profile, error: profileError } = await supabase
  .from('users')
  .select('*')
  .eq('auth_id', authData.user.id)
  .eq('activ', true)
  .single()

  console.log('profile:', profile)
console.log('profileError:', profileError)
console.log('auth_id cautat:', authData.user.id)


    if (profileError || !profile) {
      setError('Contul nu este activ sau nu există!')
      setLoading(false)
      return
    }

    localStorage.setItem('user', JSON.stringify(profile))

    if (profile.tip === 'power_admin') {
      router.push('/power-admin/companii')
    } else if (profile.tip === 'admin') {
      router.push('/admin/locatii')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🅿️</div>
          <h1 className="text-3xl font-bold text-gray-900">ParkZen</h1>
          <p className="text-gray-500 mt-1">Sistem inteligent de parcare</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 text-sm border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplu.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parolă</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition font-medium disabled:opacity-50 mt-2"
          >
            {loading ? 'Se verifică...' : 'Intră în cont'}
          </button>
        </form>
      </div>
    </div>
  )
}