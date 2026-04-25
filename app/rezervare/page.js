'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Rezervare() {
  const [user, setUser] = useState(null)
  const [masinileUser, setMasinileUser] = useState([])
  const [locuri, setLocuri] = useState([])
  const [rezervariExistente, setRezervariExistente] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('error')
  const [dataSelectata, setDataSelectata] = useState('')
  const [masinaSelectata, setMasinaSelectata] = useState('')
  const [locSelectat, setLocSelectat] = useState('')
  const router = useRouter()

  const azi = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (!u) { router.push('/'); return }
    const parsed = JSON.parse(u)
    if (parsed.tip === 'admin') { router.push('/admin/masini'); return }
    setUser(parsed)
    fetchDate(parsed)
  }, [])

  async function fetchDate(u) {
    setLoading(true)

    // Mașinile userului
    const { data: masiniData } = await supabase
      .from('masini')
      .select('*')
      .eq('user_id', u.id)
      .eq('activ', true)
      .order('created_at')
    setMasinileUser(masiniData || [])

    if (!masiniData || masiniData.length === 0) {
      setMsg('Nu ai nicio mașină adăugată. Adaugă mai întâi o mașină din profil!')
      setMsgType('error')
      setLoading(false)
      return
    }

 

    const { data: locuriData } = await supabase
      .from('locuri_parcare')
      .select('*')
      .eq('activ', true)
      .order('numar_loc')
    setLocuri(locuriData || [])

    const { data: rezData } = await supabase
      .from('rezervari')
      .select('*, users(nume, tip), masini(nr_masina)')
      .eq('status', 'activa')
    setRezervariExistente(rezData || [])

    setLoading(false)
  }

  function locEsteRezervat(locId, data) {
    if (!data) return null
    return rezervariExistente.find(r =>
      r.loc_id === locId &&
      r.data_start <= data &&
      r.data_sfarsit >= data
    )
  }

  function getLocuriDisponibile() {
    if (!dataSelectata) return []
    return locuri.filter(l => !locEsteRezervat(l.id, dataSelectata))
  }

  function getLocuriRezervate() {
    if (!dataSelectata) return []
    return locuri.filter(l => locEsteRezervat(l.id, dataSelectata))
  }

  async function rezerva() {
    setSaving(true)
    setMsg('')

    if (!masinaSelectata || !locSelectat || !dataSelectata) {
      setMsg('Selectează data, mașina și locul!')
      setMsgType('error')
      setSaving(false)
      return
    }

    if (dataSelectata < azi) {
      setMsg('Nu poți rezerva în trecut!')
      setMsgType('error')
      setSaving(false)
      return
    }

    const conflict = locEsteRezervat(locSelectat, dataSelectata)

    if (conflict && user.tip === 'normal') {
      setMsg('Locul este deja rezervat în această zi!')
      setMsgType('error')
      setSaving(false)
      return
    }

    if (conflict && user.tip === 'master') {
      const altLoc = locuri.find(l =>
        l.id !== locSelectat && !locEsteRezervat(l.id, dataSelectata)
      )
      if (altLoc) {
        await supabase.from('rezervari')
          .update({ loc_id: altLoc.id, status: 'mutata' })
          .eq('id', conflict.id)
        await supabase.from('notificari').insert({
          user_id: conflict.user_id,
          tip: 'mutare_loc',
          mesaj: `Rezervarea ta din ${dataSelectata} a fost mutată pe locul ${altLoc.numar_loc} deoarece locul original a fost preluat de un utilizator cu prioritate.`,
          trimis: false
        })
      } else {
        await supabase.from('rezervari')
          .update({ status: 'preluata' })
          .eq('id', conflict.id)
        await supabase.from('notificari').insert({
          user_id: conflict.user_id,
          tip: 'preluare_loc',
          mesaj: `Rezervarea ta pentru data ${dataSelectata} a fost preluată de un utilizator cu prioritate.`,
          trimis: false
        })
      }
    }

    const { error } = await supabase.from('rezervari').insert({
      user_id: user.id,
      masina_id: masinaSelectata,
      loc_id: locSelectat,
      data_start: dataSelectata,
      data_sfarsit: dataSelectata,
      status: 'activa'
    })

    if (error) {
      setMsg('Eroare: ' + error.message)
      setMsgType('error')
      setSaving(false)
      return
    }

    setMsg('✅ Rezervare făcută cu succes!')
    setMsgType('success')
    setSaving(false)
    setTimeout(() => router.push('/rezervarile-mele'), 1500)
  }

  if (!user) return null

  const locuriDisponibile = getLocuriDisponibile()
  const locuriRezervate = getLocuriRezervate()
  const areBlocker = msg.includes('Ai deja') || msg.includes('Nu ai nicio mașină')

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">

        <div className="bg-white rounded-xl shadow p-4 mb-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">🅿️ Rezervă loc</h1>
            <p className="text-sm text-gray-500">{user.nume || user.email}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                user.tip === 'master' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                {user.tip}
              </span>
            </p>
          </div>
          <button onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm">← Înapoi</button>
        </div>

        {msg && (
          <div className={`p-4 rounded-xl mb-4 text-sm font-medium ${msgType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {msg}
            {msg.includes('Nu ai nicio mașină') && (
              <button onClick={() => router.push('/profil')}
                className="ml-2 underline font-semibold">Mergi la profil</button>
            )}
          </div>
        )}

        {!loading && !areBlocker && (
          <div className="bg-white rounded-xl shadow p-6 space-y-6">

            {/* Data */}
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Data rezervării *</label>
              <input type="date" min={azi} value={dataSelectata}
                onChange={e => { setDataSelectata(e.target.value); setLocSelectat('') }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Masina */}
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Mașina *</label>
              <select value={masinaSelectata} onChange={e => setMasinaSelectata(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Alege mașina —</option>
                {masinileUser.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.nr_masina}{m.descriere ? ` — ${m.descriere}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Locuri */}
            {dataSelectata && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Alege un loc de parcare:</h3>

                {locuriDisponibile.length > 0 && (
                  <>
                    <p className="text-xs text-green-600 font-medium mb-2">✅ Disponibile ({locuriDisponibile.length})</p>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {locuriDisponibile.map(l => (
                        <button key={l.id} onClick={() => setLocSelectat(l.id)}
                          className={`p-3 rounded-xl border-2 text-sm font-medium transition ${
                            locSelectat === l.id
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-blue-300 text-gray-700'}`}>
                          <div className="text-lg">🅿️</div>
                          <div>{l.numar_loc}</div>
                          {l.descriere && <div className="text-xs text-gray-400">{l.descriere}</div>}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {user.tip === 'master' && locuriRezervate.length > 0 && (
                  <>
                    <p className="text-xs text-orange-600 font-medium mb-2">🔒 Rezervate — poți prelua (master)</p>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {locuriRezervate.map(l => {
                        const rez = locEsteRezervat(l.id, dataSelectata)
                        return (
                          <button key={l.id} onClick={() => setLocSelectat(l.id)}
                            className={`p-3 rounded-xl border-2 text-sm font-medium transition ${
                              locSelectat === l.id
                                ? 'border-orange-500 bg-orange-50 text-orange-700'
                                : 'border-orange-200 hover:border-orange-400 text-gray-700 bg-orange-50'}`}>
                            <div className="text-lg">🔒</div>
                            <div>{l.numar_loc}</div>
                            <div className="text-xs text-orange-500">{rez?.masini?.nr_masina}</div>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}

                {locuriDisponibile.length === 0 && (user.tip === 'normal' || locuriRezervate.length === 0) && (
                  <p className="text-center text-gray-400 py-4">Nu există locuri disponibile în această zi</p>
                )}

                <button onClick={rezerva} disabled={saving || !locSelectat || !masinaSelectata}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition font-medium disabled:opacity-50 mt-2">
                  {saving ? 'Se procesează...' : '✅ Confirmă rezervarea'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}