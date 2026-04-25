'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Profil() {
  const [user, setUser] = useState(null)
  const [masini, setMasini] = useState([])
  const [nrMasinaNou, setNrMasinaNou] = useState('')
  const [descriereNoua, setDescriereNoua] = useState('')
  const [formParola, setFormParola] = useState({
    password_curent: '',
    password_nou: '',
    password_confirmare: ''
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('success')

  const router = useRouter()

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (!u) {
      router.push('/')
      return
    }
    const parsed = JSON.parse(u)
    setUser(parsed)
    setDescriereNoua('')
    fetchMasini(parsed.id)
  }, [])

  async function fetchMasini(userId) {
    const { data } = await supabase
      .from('masini')
      .select('*')
      .eq('user_id', userId)
      .eq('activ', true)
      .order('created_at')

    setMasini(data || [])
  }

  async function adaugaMasina() {
    if (!nrMasinaNou.trim()) return

    const { error } = await supabase.from('masini').insert({
      user_id: user.id,
      nr_masina: nrMasinaNou.toUpperCase().trim(),
      descriere: descriereNoua.trim() || null,
      activ: true
    })

    if (error) {
      setMsg('Eroare: ' + error.message)
      setMsgType('error')
    } else {
      setNrMasinaNou('')
      setDescriereNoua('')
      fetchMasini(user.id)
      setMsg('✅ Mașină adăugată!')
      setMsgType('success')
    }
  }

  async function stergeMasina(id) {
    if (!confirm('Ștergi această mașină?')) return
    await supabase.from('masini').update({ activ: false }).eq('id', id)
    fetchMasini(user.id)
  }

  async function schimbaParola() {
    setSaving(true)
    setMsg('')

    if (!formParola.password_curent || !formParola.password_nou) {
      setMsg('Completează toate câmpurile!')
      setMsgType('error')
      setSaving(false)
      return
    }

    if (formParola.password_curent !== user.password) {
      setMsg('Parola curentă este incorectă!')
      setMsgType('error')
      setSaving(false)
      return
    }

    if (formParola.password_nou !== formParola.password_confirmare) {
      setMsg('Parola nouă nu coincide cu confirmarea!')
      setMsgType('error')
      setSaving(false)
      return
    }

    if (formParola.password_nou.length < 4) {
      setMsg('Parola nouă trebuie să aibă minim 4 caractere!')
      setMsgType('error')
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('users')
      .update({ password: formParola.password_nou })
      .eq('id', user.id)

    if (error) {
      setMsg('Eroare: ' + error.message)
      setMsgType('error')
      setSaving(false)
      return
    }

    const userActualizat = { ...user, password: formParola.password_nou }
    localStorage.setItem('user', JSON.stringify(userActualizat))
    setUser(userActualizat)

    setMsg('✅ Parolă schimbată cu succes!')
    setMsgType('success')
    setFormParola({
      password_curent: '',
      password_nou: '',
      password_confirmare: ''
    })
    setSaving(false)
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-lg mx-auto space-y-6">

        {/* HEADER */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
              👤 Profilul meu
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {user.name}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                user.tip === 'master' ? 'bg-orange-100 text-orange-700' :
                user.tip === 'admin' ? 'bg-purple-100 text-purple-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {user.tip}
              </span>
            </p>
          </div>

          <button
            onClick={() => router.push(user.tip === 'admin' ? '/admin/masini' : '/dashboard')}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm transition"
          >
            ← Înapoi
          </button>
        </div>

        {/* MESSAGE */}
        {msg && (
          <div className={`p-4 rounded-xl text-sm font-medium ${
            msgType === 'success'
              ? 'bg-green-50 text-green-700 border border-green-100'
              : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {msg}
          </div>
        )}

        {/* MASINI */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm tracking-wide">
            🚗 Mașinile mele
          </h3>

          {masini.length === 0 ? (
            <p className="text-sm text-gray-400 mb-4">
              Nu ai nicio mașină adăugată.
            </p>
          ) : (
            <div className="space-y-2 mb-4">
              {masini.map(m => (
                <div key={m.id}
                  className="flex justify-between items-center bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">
                      🚗 {m.nr_masina}
                    </p>
                    {m.descriere && (
                      <p className="text-xs text-gray-400">{m.descriere}</p>
                    )}
                  </div>

                  <button
                    onClick={() => stergeMasina(m.id)}
                    className="text-red-500 hover:text-red-600 text-xs font-medium transition"
                  >
                    🗑️ Șterge
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ADD MASINA */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-xs text-gray-500 font-medium">
              Adaugă mașină nouă
            </p>

            <input
              value={nrMasinaNou}
              onChange={e => setNrMasinaNou(e.target.value.toUpperCase())}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm 
                         text-gray-800 placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                         transition"
              placeholder="Nr. înmatriculare (ex: B123ABC)"
            />

            <input
              value={descriereNoua}
              onChange={e => setDescriereNoua(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm 
                         text-gray-800 placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                         transition"
              placeholder="Descriere (opțional, ex: McLaren Artura/Dacia Logan albă)"
            />

            <button
              onClick={adaugaMasina}
              className="w-full bg-green-600 text-white py-2.5 rounded-xl 
                         hover:bg-green-700 active:scale-[0.99]
                         transition font-medium text-sm shadow-sm"
            >
              ➕ Adaugă mașină
            </button>
          </div>
        </div>

        {/* PAROLA */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm tracking-wide">
            🔒 Schimbă parola
          </h3>

          <div className="space-y-3">

            <input
              type="password"
              value={formParola.password_curent}
              onChange={e => setFormParola({ ...formParola, password_curent: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm 
                         text-gray-800 placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                         transition"
              placeholder="Parola curentă"
            />

            <input
              type="password"
              value={formParola.password_nou}
              onChange={e => setFormParola({ ...formParola, password_nou: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm 
                         text-gray-800 placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                         transition"
              placeholder="Parola nouă"
            />

            <input
              type="password"
              value={formParola.password_confirmare}
              onChange={e => setFormParola({ ...formParola, password_confirmare: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm 
                         text-gray-800 placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                         transition"
              placeholder="Confirmă parola"
            />

            <button
              onClick={schimbaParola}
              disabled={saving}
              className="w-full bg-gray-800 text-white py-2.5 rounded-xl 
                         hover:bg-black active:scale-[0.99]
                         transition font-medium text-sm shadow-sm disabled:opacity-50"
            >
              {saving ? 'Se salvează...' : '🔑 Schimbă parola'}
            </button>

          </div>
        </div>

      </div>
    </div>
  )
}