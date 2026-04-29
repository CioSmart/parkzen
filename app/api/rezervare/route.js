'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Rezervare() {
  const [user, setUser] = useState(null)
  const [masini, setMasini] = useState([])
  const [locatii, setLocatii] = useState([])
  const [locuri, setLocuri] = useState([])
  const [preturi, setPreturi] = useState([])
  const [rezervariExistente, setRezervariExistente] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('error')

  const [locatieSelectata, setLocatieSelectata] = useState('')
  const [masinaSelectata, setMasinaSelectata] = useState('')
  const [pretSelectat, setPretSelectat] = useState('')
  const [locSelectat, setLocSelectat] = useState('')
  const [dataStart, setDataStart] = useState('')
  const [oraStart, setOraStart] = useState('')
  const [dataStop, setDataStop] = useState('')
  const [oraStop, setOraStop] = useState('')

  const router = useRouter()

  // Generare ore din 30 in 30
  const ore = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      ore.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }

  const azi = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (!u) { router.push('/'); return }
    const parsed = JSON.parse(u)
    if (parsed.tip === 'power_admin') { router.push('/power-admin/companii'); return }
    if (parsed.tip === 'admin') { router.push('/admin/locatii'); return }
    setUser(parsed)
    fetchDate(parsed)
  }, [])

  async function fetchDate(u) {
    setLoading(true)

    const [
      { data: masiniData },
      { data: locatiiData },
      { data: preturiData }
    ] = await Promise.all([
      supabase.from('masini').select('*').eq('user_id', u.id).eq('activ', true).order('created_at'),
      supabase.from('alocari_locatii').select('locatii(*)').eq('user_id', u.id),
      supabase.from('preturi').select('*').eq('companie_id', u.companie_id).eq('activ', true).order('durata_minute')
    ])

    setMasini(masiniData || [])
    setLocatii(locatiiData?.map(a => a.locatii).filter(Boolean) || [])
    setPreturi(preturiData || [])
    setLoading(false)
  }

  async function fetchLocuriSiRezervari(locatieId, start, stop) {
    if (!locatieId || !start || !stop) return

    const [{ data: locuriData }, { data: rezData }] = await Promise.all([
      supabase
        .from('locuri_parcare')
        .select('*')
        .eq('locatie_id', locatieId)
        .eq('activ', true)
        .order('etaj').order('zona').order('numar_loc'),
      supabase
        .from('rezervari')
        .select('loc_id')
        .eq('status', 'activa')
        .lt('data_ora_start', stop)
        .gt('data_ora_sfarsit', start)
    ])

    setLocuri(locuriData || [])
    setRezervariExistente(rezData || [])
    setLocSelectat('')
  }

  // Calculeaza data_ora_stop automat dupa selectarea pretului
  function selecteazaPret(pretId) {
    setPretSelectat(pretId)
    setLocSelectat('')

    if (!dataStart || !oraStart) return

    const pret = preturi.find(p => p.id === pretId)
    if (!pret) return

    const startDt = new Date(`${dataStart}T${oraStart}:00`)
    const stopDt = new Date(startDt.getTime() + pret.durata_minute * 60000)

    setDataStop(stopDt.toISOString().split('T')[0])
    setOraStop(stopDt.toTimeString().slice(0, 5))

    // Aliniaza la 30 min
    const minute = stopDt.getMinutes()
    if (minute !== 0 && minute !== 30) {
      const aliniat = new Date(stopDt)
      aliniat.setMinutes(minute < 30 ? 30 : 0)
      if (minute > 30) aliniat.setHours(aliniat.getHours() + 1)
      setOraStop(aliniat.toTimeString().slice(0, 5))
    }
  }

  // Recalculeaza locurile disponibile cand se schimba intervalul
  useEffect(() => {
    if (locatieSelectata && dataStart && oraStart && dataStop && oraStop) {
      const start = `${dataStart}T${oraStart}:00`
      const stop = `${dataStop}T${oraStop}:00`
      if (start < stop) {
        fetchLocuriSiRezervari(locatieSelectata, start, stop)
      }
    }
  }, [locatieSelectata, dataStart, oraStart, dataStop, oraStop])

  function locEsteOcupat(locId) {
    return rezervariExistente.some(r => r.loc_id === locId)
  }

  // Grupeaza locurile pe etaj si zona
  function grupeazaLocuri() {
    const grupe = {}
    locuri.forEach(l => {
      const cheie = `Etaj ${l.etaj}${l.zona ? ` - Zona ${l.zona}` : ''}`
      if (!grupe[cheie]) grupe[cheie] = []
      grupe[cheie].push(l)
    })
    return grupe
  }

  async function rezerva() {
    setSaving(true)
    setMsg('')

    if (!masinaSelectata || !locatieSelectata || !pretSelectat || !locSelectat || !dataStart || !oraStart || !dataStop || !oraStop) {
      setMsg('Completează toate câmpurile!')
      setMsgType('error')
      setSaving(false)
      return
    }

    const dataOraStart = `${dataStart}T${oraStart}:00`
    const dataOraStop = `${dataStop}T${oraStop}:00`

    if (dataOraStart >= dataOraStop) {
      setMsg('Data/ora de start trebuie să fie înainte de stop!')
      setMsgType('error')
      setSaving(false)
      return
    }

    const pret = preturi.find(p => p.id === pretSelectat)

    // Apel API cu verificare conflict
    const res = await fetch('/api/rezervare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        masina_id: masinaSelectata,
        loc_id: locSelectat,
        locatie_id: locatieSelectata,
        companie_id: user.companie_id,
        pret_id: pretSelectat,
        data_ora_start: dataOraStart,
        data_ora_sfarsit: dataOraStop,
        pret_total: pret?.pret || 0
      })
    })

    const result = await res.json()

    if (result.error) {
      setMsg(result.error)
      setMsgType('error')
      // Reincarca locurile disponibile
      fetchLocuriSiRezervari(locatieSelectata, dataOraStart, dataOraStop)
      setSaving(false)
      return
    }

    setMsg('✅ Rezervare făcută cu succes!')
    setMsgType('success')
    setSaving(false)
    setTimeout(() => router.push('/rezervarile-mele'), 1500)
  }

  const grupeLocuri = grupeazaLocuri()
  const pretSelectatObj = preturi.find(p => p.id === pretSelectat)

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">🅿️ Rezervă loc</h1>
            <p className="text-sm text-gray-500 mt-0.5">{user.nume || user.email}</p>
          </div>
          <button onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm">
            ← Înapoi
          </button>
        </div>

        {msg && (
          <div className={`p-4 rounded-xl mb-4 text-sm font-medium ${
            msgType === 'success'
              ? 'bg-green-50 text-green-700 border border-green-100'
              : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {msg}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <p className="text-gray-400">Se încarcă...</p>
          </div>
        ) : masini.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="text-4xl mb-2">🚗</div>
            <p className="text-gray-500">Nu ai nicio mașină adăugată.</p>
            <button onClick={() => router.push('/profil')}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-xl text-sm hover:bg-blue-700">
              Adaugă mașină
            </button>
          </div>
        ) : (
          <div className="space-y-4">

            {/* Pasul 1 - Locatie */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-3">1️⃣ Locație</h3>
              <div className="grid grid-cols-2 gap-2">
                {locatii.map(l => (
                  <button key={l.id}
                    onClick={() => { setLocatieSelectata(l.id); setLocSelectat('') }}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition ${
                      locatieSelectata === l.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-300 text-gray-700'
                    }`}>
                    📍 {l.nume}
                  </button>
                ))}
              </div>
            </div>

            {/* Pasul 2 - Masina */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-3">2️⃣ Mașina</h3>
              <div className="grid grid-cols-2 gap-2">
                {masini.map(m => (
                  <button key={m.id}
                    onClick={() => setMasinaSelectata(m.id)}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition ${
                      masinaSelectata === m.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-300 text-gray-700'
                    }`}>
                    🚗 {m.nr_masina}
                    {m.descriere && <span className="block text-xs text-gray-400">{m.descriere}</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Pasul 3 - Interval */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-3">3️⃣ Interval</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Data start</label>
                  <input type="date" min={azi} value={dataStart}
                    onChange={e => { setDataStart(e.target.value); setLocSelectat('') }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Ora start</label>
                  <select value={oraStart}
                    onChange={e => { setOraStart(e.target.value); setLocSelectat('') }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Alege ora —</option>
                    {ore.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* Tarife */}
              {dataStart && oraStart && (
                <>
                  <label className="text-xs text-gray-500 font-medium block mb-2">Alege tarif</label>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {preturi.map(p => (
                      <button key={p.id}
                        onClick={() => selecteazaPret(p.id)}
                        className={`p-3 rounded-xl border-2 text-center transition ${
                          pretSelectat === p.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}>
                        <div className="font-bold text-blue-600 text-sm">{p.pret} RON</div>
                        <div className="text-xs text-gray-600">{p.nume}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Data/ora stop - editabil manual */}
              {pretSelectat && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Data stop</label>
                    <input type="date" min={dataStart} value={dataStop}
                      onChange={e => { setDataStop(e.target.value); setLocSelectat('') }}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Ora stop</label>
                    <select value={oraStop}
                      onChange={e => { setOraStop(e.target.value); setLocSelectat('') }}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">— Alege ora —</option>
                      {ore.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Pasul 4 - Loc */}
            {locatieSelectata && dataStart && oraStart && dataStop && oraStop && pretSelectat && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-800 mb-3">4️⃣ Alege loc</h3>

                {Object.keys(grupeLocuri).length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">
                    Nu există locuri în această locație
                  </p>
                ) : (
                  Object.entries(grupeLocuri).map(([grupa, locuriGrupa]) => (
                    <div key={grupa} className="mb-4">
                      <p className="text-xs font-medium text-gray-500 mb-2">{grupa}</p>
                      <div className="grid grid-cols-4 gap-2">
                        {locuriGrupa.map(l => {
                          const ocupat = locEsteOcupat(l.id)
                          return (
                            <button key={l.id}
                              onClick={() => !ocupat && setLocSelectat(l.id)}
                              disabled={ocupat}
                              className={`p-3 rounded-xl border-2 text-sm font-medium transition ${
                                ocupat
                                  ? 'border-red-200 bg-red-50 text-red-400 cursor-not-allowed'
                                  : locSelectat === l.id
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 hover:border-blue-300 text-gray-700'
                              }`}>
                              <div>{ocupat ? '🔒' : '🅿️'}</div>
                              <div>{l.numar_loc}</div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Sumar + Confirmare */}
            {locSelectat && pretSelectatObj && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-800 mb-3">✅ Sumar rezervare</h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Locație</span>
                    <span className="font-medium">{locatii.find(l => l.id === locatieSelectata)?.nume}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Loc</span>
                    <span className="font-medium">
                      🅿️ {locuri.find(l => l.id === locSelectat)?.numar_loc}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Interval</span>
                    <span className="font-medium">{dataStart} {oraStart} → {dataStop} {oraStop}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tarif</span>
                    <span className="font-medium">{pretSelectatObj.nume}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-blue-600 text-lg">{pretSelectatObj.pret} RON</span>
                  </div>
                </div>

                <button onClick={rezerva} disabled={saving}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition font-medium disabled:opacity-50">
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