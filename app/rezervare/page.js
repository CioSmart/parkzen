'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

// Generează opțiuni de ore:minute din 30 în 30
function genereazaOrare() {
  const ore = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      ore.push(label)
    }
  }
  return ore
}
const ORARE = genereazaOrare()

// Calculează durata în minute între două datetime
function calculeazaMinute(dataStart, oraStart, dataStop, oraStop) {
  if (!dataStart || !oraStart || !dataStop || !oraStop) return 0
  const start = new Date(`${dataStart}T${oraStart}:00`)
  const stop = new Date(`${dataStop}T${oraStop}:00`)
  return Math.max(0, Math.floor((stop - start) / 60000))
}

// Calculează prețul prin împărțire pe bucăți cât mai mari
function calculeazaPret(minuteTotal, preturi) {
  if (!preturi || preturi.length === 0 || minuteTotal <= 0) return { total: 0, detalii: [] }

  // Sortează descrescător după durata_minute
  const sorted = [...preturi].sort((a, b) => b.durata_minute - a.durata_minute)
  const cel_mai_mic = sorted[sorted.length - 1]

  let rest = minuteTotal
  const detalii = []
  let total = 0

  while (rest > 0) {
    // Găsește cel mai mare tarif <= rest
    const tarif = sorted.find(p => p.durata_minute <= rest)
    if (tarif) {
      detalii.push({ nume: tarif.nume, pret: tarif.pret, durata: tarif.durata_minute })
      total += tarif.pret
      rest -= tarif.durata_minute
    } else {
      // Folosește cel mai mic tarif disponibil
      detalii.push({ nume: cel_mai_mic.nume, pret: cel_mai_mic.pret, durata: cel_mai_mic.durata_minute })
      total += cel_mai_mic.pret
      rest -= cel_mai_mic.durata_minute
      if (rest <= 0) break
    }
  }

  return { total: Math.round(total * 100) / 100, detalii }
}

function formatDurata(minute) {
  if (minute <= 0) return '0 min'
  const zile = Math.floor(minute / 1440)
  const ore = Math.floor((minute % 1440) / 60)
  const min = minute % 60
  const parts = []
  if (zile > 0) parts.push(`${zile}z`)
  if (ore > 0) parts.push(`${ore}h`)
  if (min > 0) parts.push(`${min}m`)
  return parts.join(' ')
}

export default function Rezervare() {
  const [user, setUser] = useState(null)
  const [masinileUser, setMasinileUser] = useState([])
  const [locatii, setLocatii] = useState([])
  const [locuri, setLocuri] = useState([])
  const [preturi, setPreturi] = useState([])
  const [rezervariExistente, setRezervariExistente] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('error')

  const [dataStart, setDataStart] = useState('')
  const [oraStart, setOraStart] = useState('08:00')
  const [dataStop, setDataStop] = useState('')
  const [oraStop, setOraStop] = useState('09:00')
  const [masinaSelectata, setMasinaSelectata] = useState('')
  const [locatieSelectata, setLocatieSelectata] = useState('')
  const [zonaSelectata, setZonaSelectata] = useState('')
  const [locSelectat, setLocSelectat] = useState('')

  const router = useRouter()
  const azi = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (!u) { router.push('/'); return }
    const parsed = JSON.parse(u)
    if (parsed.tip === 'admin') { router.push('/admin/locatii'); return }
    setUser(parsed)
    fetchDate(parsed)
  }, [])

  async function fetchDate(u) {
    setLoading(true)

    const { data: masiniData } = await supabase
      .from('masini')
      .select('*')
      .eq('user_id', u.id)
      .eq('activ', true)
      .order('created_at')
    setMasinileUser(masiniData || [])

    // Locații companie
    const { data: locatiiData } = await supabase
      .from('locatii')
      .select('*')
      .eq('companie_id', u.companie_id)
      .eq('activ', true)
      .order('nume')
    setLocatii(locatiiData || [])

    // Dacă e o singură locație, selectează automat
    if (locatiiData && locatiiData.length === 1) {
      setLocatieSelectata(locatiiData[0].id)
      await fetchLocuriSiPreturi(locatiiData[0].id, u.companie_id)
    }

    // Toate rezervările active
    const { data: rezData } = await supabase
      .from('rezervari')
      .select('*, users(nume, tip), masini(nr_masina)')
      .eq('status', 'activa')
    setRezervariExistente(rezData || [])

    setLoading(false)
  }

  async function fetchLocuriSiPreturi(locatieId, companieId) {
    const { data: locuriData } = await supabase
      .from('locuri_parcare')
      .select('*, zone(nume)')
      .eq('locatie_id', locatieId)
      .eq('companie_id', companieId)
      .eq('activ', true)
      .order('numar_loc')
    setLocuri(locuriData || [])

    const { data: preturiData } = await supabase
      .from('preturi')
      .select('*')
      .eq('locatie_id', locatieId)
      .eq('companie_id', companieId)
      .eq('activ', true)
      .order('durata_minute')
    setPreturi(preturiData || [])

    setLocSelectat('')
    setZonaSelectata('')
  }

  async function handleLocatieChange(locId) {
    setLocatieSelectata(locId)
    setLocSelectat('')
    setZonaSelectata('')
    if (locId && user) {
      await fetchLocuriSiPreturi(locId, user.companie_id)
    } else {
      setLocuri([])
      setPreturi([])
    }
  }

  // Zone unice din locurile disponibile
  const zone = useMemo(() => {
    const map = {}
    locuri.forEach(l => {
      if (l.zona_id && l.zone) map[l.zona_id] = l.zone.nume
    })
    return Object.entries(map).map(([id, nume]) => ({ id, nume }))
  }, [locuri])

  // Locuri filtrate pe zonă (dacă e selectată)
  const locuriFiltrateZona = useMemo(() => {
    if (!zonaSelectata) return locuri
    return locuri.filter(l => l.zona_id === zonaSelectata)
  }, [locuri, zonaSelectata])

  // Preturi filtrate pe zonă
  const preturiZona = useMemo(() => {
    if (!zonaSelectata) return preturi
    return preturi.filter(p => p.zona_id === zonaSelectata)
  }, [preturi, zonaSelectata])

  function locEsteRezervat(locId) {
    if (!dataStart || !oraStart || !dataStop || !oraStop) return null
    const start = new Date(`${dataStart}T${oraStart}:00`)
    const stop = new Date(`${dataStop}T${oraStop}:00`)
    return rezervariExistente.find(r => {
      const rs = new Date(r.data_ora_start)
      const re = new Date(r.data_ora_sfarsit)
      return r.loc_id === locId && start < re && stop > rs
    })
  }

  const intervalValid = useMemo(() => {
    return calculeazaMinute(dataStart, oraStart, dataStop, oraStop) > 0
  }, [dataStart, oraStart, dataStop, oraStop])

  const minuteTotal = useMemo(() => {
    return calculeazaMinute(dataStart, oraStart, dataStop, oraStop)
  }, [dataStart, oraStart, dataStop, oraStop])

  const calcPret = useMemo(() => {
    if (!locSelectat || minuteTotal <= 0 || preturiZona.length === 0) return null
    const loc = locuri.find(l => l.id === locSelectat)
    if (!loc) return null
    const pretLoc = preturiZona.filter(p => p.zona_id === loc.zona_id)
    if (pretLoc.length === 0) return null
    return calculeazaPret(minuteTotal, pretLoc)
  }, [locSelectat, minuteTotal, preturiZona, locuri])

  const locuriDisponibile = locuriFiltrateZona.filter(l => !locEsteRezervat(l.id))
  const locuriRezervate = locuriFiltrateZona.filter(l => locEsteRezervat(l.id))

  async function rezerva() {
    setSaving(true)
    setMsg('')

    if (!masinaSelectata || !locSelectat || !dataStart || !dataStop || !oraStart || !oraStop) {
      setMsg('Completează toate câmpurile!')
      setMsgType('error')
      setSaving(false)
      return
    }

    if (!intervalValid) {
      setMsg('Intervalul de timp nu este valid!')
      setMsgType('error')
      setSaving(false)
      return
    }

    const conflict = locEsteRezervat(locSelectat)

    if (conflict && user.tip === 'normal') {
      setMsg('Locul este deja rezervat în acest interval!')
      setMsgType('error')
      setSaving(false)
      return
    }

    if (conflict && user.tip === 'master') {
      const altLoc = locuri.find(l => l.id !== locSelectat && !locEsteRezervat(l.id))
      if (altLoc) {
        await supabase.from('rezervari').update({ loc_id: altLoc.id, status: 'mutata' }).eq('id', conflict.id)
        await supabase.from('notificari').insert({
          user_id: conflict.user_id,
          tip: 'mutare_loc',
          mesaj: `Rezervarea ta a fost mutată pe locul ${altLoc.numar_loc} deoarece locul original a fost preluat de un utilizator cu prioritate.`,
          trimis: false
        })
      } else {
        await supabase.from('rezervari').update({ status: 'preluata' }).eq('id', conflict.id)
        await supabase.from('notificari').insert({
          user_id: conflict.user_id,
          tip: 'preluare_loc',
          mesaj: `Rezervarea ta a fost preluată de un utilizator cu prioritate.`,
          trimis: false
        })
      }
    }

    const { error } = await supabase.from('rezervari').insert({
      user_id: user.id,
      masina_id: masinaSelectata,
      loc_id: locSelectat,
      data_ora_start: `${dataStart}T${oraStart}:00`,
      data_ora_sfarsit: `${dataStop}T${oraStop}:00`,
      pret_total: calcPret?.total || 0,
      status: 'activa',
      companie_id: user.companie_id,
      locatie_id: locatieSelectata
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

  function tipLocIcon(tip) {
    if (tip === 'handicap') return '♿'
    if (tip === 'familie') return '👨‍👩‍👧'
    return '🅿️'
  }

  function tipLocLabel(tip) {
    if (tip === 'handicap') return 'Handicap'
    if (tip === 'familie') return 'Familie'
    return null
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">🅿️ Rezervă loc de parcare</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {user.nume || user.email}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                user.tip === 'master' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
              }`}>{user.tip}</span>
            </p>
          </div>
          <button onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm">← Înapoi</button>
        </div>

        {msg && (
          <div className={`p-4 rounded-xl mb-4 text-sm font-medium ${
            msgType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {msg}
            {msg.includes('Nu ai nicio mașină') && (
              <button onClick={() => router.push('/profil')} className="ml-2 underline font-semibold">
                Mergi la profil
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
            Se încarcă...
          </div>
        ) : (
          <div className="space-y-4">

            {/* STEP 1: Interval timp */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-bold text-gray-800 mb-4">1. Selectează intervalul</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Data start *</label>
                  <input type="date" min={azi} value={dataStart}
                    onChange={e => { setDataStart(e.target.value); setLocSelectat('') }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Ora start *</label>
                  <select value={oraStart} onChange={e => { setOraStart(e.target.value); setLocSelectat('') }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {ORARE.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Data stop *</label>
                  <input type="date" min={dataStart || azi} value={dataStop}
                    onChange={e => { setDataStop(e.target.value); setLocSelectat('') }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Ora stop *</label>
                  <select value={oraStop} onChange={e => { setOraStop(e.target.value); setLocSelectat('') }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {ORARE.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              {intervalValid && (
                <div className="mt-3 px-3 py-2 bg-blue-50 rounded-xl text-sm text-blue-700 font-medium">
                  ⏱ Durată totală: {formatDurata(minuteTotal)}
                </div>
              )}
              {dataStart && dataStop && !intervalValid && (
                <div className="mt-3 px-3 py-2 bg-red-50 rounded-xl text-sm text-red-600">
                  ⚠️ Data/ora de stop trebuie să fie după data/ora de start
                </div>
              )}
            </div>

            {/* STEP 2: Mașina */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-bold text-gray-800 mb-4">2. Alege mașina</h2>
              {masinileUser.length === 0 ? (
                <div className="text-sm text-red-600">
                  Nu ai nicio mașină adăugată.{' '}
                  <button onClick={() => router.push('/profil')} className="underline font-semibold">
                    Adaugă din profil
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {masinileUser.map(m => (
                    <button key={m.id} onClick={() => setMasinaSelectata(m.id)}
                      className={`p-3 rounded-xl border-2 text-sm font-medium text-left transition ${
                        masinaSelectata === m.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-blue-300 text-gray-700'
                      }`}>
                      🚗 {m.nr_masina}
                      {m.descriere && <div className="text-xs text-gray-400 font-normal mt-0.5">{m.descriere}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* STEP 3: Locație + Zonă */}
            {intervalValid && masinaSelectata && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-bold text-gray-800 mb-4">3. Alege locația și zona</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">Locație *</label>
                    <select value={locatieSelectata} onChange={e => handleLocatieChange(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">— Alege locația —</option>
                      {locatii.map(l => <option key={l.id} value={l.id}>{l.nume}</option>)}
                    </select>
                  </div>
                  {zone.length > 1 && (
                    <div>
                      <label className="text-xs text-gray-500 font-medium block mb-1">Zonă</label>
                      <select value={zonaSelectata} onChange={e => { setZonaSelectata(e.target.value); setLocSelectat('') }}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Toate zonele</option>
                        {zone.map(z => <option key={z.id} value={z.id}>{z.nume}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: Locuri */}
            {intervalValid && masinaSelectata && locatieSelectata && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-bold text-gray-800 mb-4">4. Alege locul de parcare</h2>

                {locuriDisponibile.length > 0 && (
                  <>
                    <p className="text-xs text-green-600 font-medium mb-2">✅ Disponibile ({locuriDisponibile.length})</p>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mb-4">
                      {locuriDisponibile.map(l => (
                        <button key={l.id} onClick={() => setLocSelectat(l.id)}
                          className={`p-3 rounded-xl border-2 text-sm font-medium transition text-center ${
                            locSelectat === l.id
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-blue-300 text-gray-700'
                          }`}>
                          <div className="text-xl">{tipLocIcon(l.tip_loc)}</div>
                          <div className="font-bold">{l.numar_loc}</div>
                          {tipLocLabel(l.tip_loc) && (
                            <div className={`text-xs mt-0.5 font-medium ${
                              l.tip_loc === 'handicap' ? 'text-purple-500' : 'text-teal-500'
                            }`}>{tipLocLabel(l.tip_loc)}</div>
                          )}
                          {l.descriere && <div className="text-xs text-gray-400 mt-0.5">{l.descriere}</div>}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {user.tip === 'master' && locuriRezervate.length > 0 && (
                  <>
                    <p className="text-xs text-orange-600 font-medium mb-2">🔒 Rezervate — poți prelua (master)</p>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mb-4">
                      {locuriRezervate.map(l => {
                        const rez = locEsteRezervat(l.id)
                        return (
                          <button key={l.id} onClick={() => setLocSelectat(l.id)}
                            className={`p-3 rounded-xl border-2 text-sm font-medium transition text-center ${
                              locSelectat === l.id
                                ? 'border-orange-500 bg-orange-50 text-orange-700'
                                : 'border-orange-200 hover:border-orange-400 text-gray-700 bg-orange-50'
                            }`}>
                            <div className="text-xl">🔒</div>
                            <div className="font-bold">{l.numar_loc}</div>
                            <div className="text-xs text-orange-500">{rez?.masini?.nr_masina}</div>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}

                {locuriDisponibile.length === 0 && (user.tip === 'normal' || locuriRezervate.length === 0) && (
                  <p className="text-center text-gray-400 py-4">Nu există locuri disponibile în acest interval</p>
                )}
              </div>
            )}

            {/* STEP 5: Sumar preț + Confirmare */}
            {locSelectat && calcPret && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-bold text-gray-800 mb-4">5. Sumar și confirmare</h2>

                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <p className="text-xs text-gray-500 font-medium mb-2">Calcul preț ({formatDurata(minuteTotal)}):</p>
                  <div className="space-y-1">
                    {calcPret.detalii.map((d, i) => (
                      <div key={i} className="flex justify-between text-sm text-gray-700">
                        <span>{d.nume} ({formatDurata(d.durata)})</span>
                        <span className="font-medium">{d.pret} RON</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold text-gray-900">
                    <span>Total</span>
                    <span className="text-blue-600 text-lg">{calcPret.total} RON</span>
                  </div>
                </div>

                <button onClick={rezerva} disabled={saving}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition font-medium disabled:opacity-50">
                  {saving ? 'Se procesează...' : `✅ Confirmă rezervarea — ${calcPret.total} RON`}
                </button>
              </div>
            )}

            {locSelectat && !calcPret && intervalValid && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="bg-yellow-50 rounded-xl p-4 text-sm text-yellow-700">
                  ⚠️ Nu există tarife definite pentru această locație/zonă. Contactează administratorul.
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}