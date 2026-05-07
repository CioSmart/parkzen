'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

function genereazaOrare() {
  const ore = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      ore.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return ore
}
const ORARE = genereazaOrare()

function calculeazaMinute(dataStart, oraStart, dataStop, oraStop) {
  if (!dataStart || !oraStart || !dataStop || !oraStop) return 0
  const start = new Date(`${dataStart}T${oraStart}:00`)
  const stop = new Date(`${dataStop}T${oraStop}:00`)
  return Math.max(0, Math.floor((stop - start) / 60000))
}

function calculeazaPret(minuteTotal, preturi) {
  if (!preturi || preturi.length === 0 || minuteTotal <= 0) return { total: 0, detalii: [] }
  const sorted = [...preturi].sort((a, b) => b.durata_minute - a.durata_minute)
  const cel_mai_mic = sorted[sorted.length - 1]
  let rest = minuteTotal
  const rawDetalii = []
  let total = 0
  while (rest > 0) {
    const tarif = sorted.find(p => p.durata_minute <= rest)
    if (tarif) {
      rawDetalii.push({ nume: tarif.nume, pret: tarif.pret, durata: tarif.durata_minute })
      total += tarif.pret
      rest -= tarif.durata_minute
    } else {
      rawDetalii.push({ nume: cel_mai_mic.nume, pret: cel_mai_mic.pret, durata: cel_mai_mic.durata_minute })
      total += cel_mai_mic.pret
      rest -= cel_mai_mic.durata_minute
      if (rest <= 0) break
    }
  }
  // Comprimă: grupează după nume
  const grouped = []
  rawDetalii.forEach(d => {
    const ex = grouped.find(g => g.nume === d.nume)
    if (ex) { ex.count++; ex.totalPret += d.pret }
    else grouped.push({ nume: d.nume, pret: d.pret, durata: d.durata, count: 1, totalPret: d.pret })
  })
  return { total: Math.round(total * 100) / 100, detalii: grouped }
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

function tipLocIcon(tip) {
  if (tip === 'handicap') return '♿'
  if (tip === 'familie') return '👨‍👩‍👧'
  return '🅿️'
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
  const [etajSelectat, setEtajSelectat] = useState('')
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
    const { data: masiniData } = await supabase.from('masini').select('*').eq('user_id', u.id).eq('activ', true).order('created_at')
    setMasinileUser(masiniData || [])

    const { data: locatiiData } = await supabase.from('locatii').select('*').eq('companie_id', u.companie_id).eq('activ', true).order('nume')
    setLocatii(locatiiData || [])

    if (locatiiData && locatiiData.length === 1) {
      setLocatieSelectata(locatiiData[0].id)
      await fetchLocuriSiPreturi(locatiiData[0].id, u.companie_id)
    }

    const { data: rezData } = await supabase.from('rezervari').select('*, users(nume, tip), masini(nr_masina)').eq('status', 'activa')
    setRezervariExistente(rezData || [])
    setLoading(false)
  }

  async function fetchLocuriSiPreturi(locatieId, companieId) {
    const { data: locuriData } = await supabase.from('locuri_parcare').select('*, zone(nume)').eq('locatie_id', locatieId).eq('companie_id', companieId).eq('activ', true).order('etaj').order('numar_loc')
    setLocuri(locuriData || [])
    const { data: preturiData } = await supabase.from('preturi').select('*').eq('locatie_id', locatieId).eq('companie_id', companieId).eq('activ', true).order('durata_minute')
    setPreturi(preturiData || [])
    setLocSelectat('')
    setZonaSelectata('')
    setEtajSelectat('')
  }

  async function handleLocatieChange(locId) {
    setLocatieSelectata(locId)
    setLocSelectat('')
    setZonaSelectata('')
    setEtajSelectat('')
    if (locId && user) await fetchLocuriSiPreturi(locId, user.companie_id)
    else { setLocuri([]); setPreturi([]) }
  }

  const zone = useMemo(() => {
    const map = {}
    locuri.forEach(l => { if (l.zona_id && l.zone) map[l.zona_id] = l.zone.nume })
    return Object.entries(map).map(([id, nume]) => ({ id, nume }))
  }, [locuri])

  const etaje = useMemo(() => {
    const set = new Set(locuri.map(l => l.etaj))
    return [...set].sort((a, b) => a - b)
  }, [locuri])

  const locuriFiltrați = useMemo(() => {
    return locuri.filter(l => {
      if (zonaSelectata && l.zona_id !== zonaSelectata) return false
      if (etajSelectat !== '' && String(l.etaj) !== String(etajSelectat)) return false
      return true
    })
  }, [locuri, zonaSelectata, etajSelectat])

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

  const intervalValid = useMemo(() => calculeazaMinute(dataStart, oraStart, dataStop, oraStop) > 0, [dataStart, oraStart, dataStop, oraStop])
  const minuteTotal = useMemo(() => calculeazaMinute(dataStart, oraStart, dataStop, oraStop), [dataStart, oraStart, dataStop, oraStop])

  const calcPret = useMemo(() => {
    if (!locSelectat || minuteTotal <= 0) return null
    const loc = locuri.find(l => l.id === locSelectat)
    if (!loc) return null
    const pretLoc = preturiZona.filter(p => p.zona_id === loc.zona_id)
    if (pretLoc.length === 0) return null
    return calculeazaPret(minuteTotal, pretLoc)
  }, [locSelectat, minuteTotal, preturiZona, locuri])

  const locuriDisponibile = locuriFiltrați.filter(l => !locEsteRezervat(l.id))
  const locuriRezervate = locuriFiltrați.filter(l => locEsteRezervat(l.id))

  async function rezerva() {
    setSaving(true)
    setMsg('')

    if (!masinaSelectata || !locSelectat || !dataStart || !dataStop || !oraStart || !oraStop) {
      setMsg('Completează toate câmpurile!'); setMsgType('error'); setSaving(false); return
    }
    if (!intervalValid) {
      setMsg('Intervalul de timp nu este valid!'); setMsgType('error'); setSaving(false); return
    }

    const startISO = `${dataStart}T${oraStart}:00`
    const stopISO = `${dataStop}T${oraStop}:00`

    const { data: conflictLive } = await supabase.from('rezervari').select('id').eq('loc_id', locSelectat).eq('status', 'activa').lt('data_ora_start', stopISO).gt('data_ora_sfarsit', startISO)

    if (conflictLive && conflictLive.length > 0 && user.tip === 'normal') {
      const { data: rezData } = await supabase.from('rezervari').select('*, users(nume, tip), masini(nr_masina)').eq('status', 'activa')
      setRezervariExistente(rezData || [])
      setLocSelectat('')
      setMsg('⚠️ Locul a fost rezervat între timp! Alege alt loc.')
      setMsgType('error')
      setSaving(false)
      return
    }

    const conflict = locEsteRezervat(locSelectat)

    if (conflict && user.tip === 'master') {
      const altLoc = locuri.find(l => l.id !== locSelectat && !locEsteRezervat(l.id))
      if (altLoc) {
        await supabase.from('rezervari').update({ loc_id: altLoc.id, status: 'mutata' }).eq('id', conflict.id)
        await supabase.from('notificari').insert({ user_id: conflict.user_id, tip: 'mutare_loc', mesaj: `Rezervarea ta a fost mutată pe locul ${altLoc.numar_loc}.`, trimis: false })
      } else {
        await supabase.from('rezervari').update({ status: 'preluata' }).eq('id', conflict.id)
        await supabase.from('notificari').insert({ user_id: conflict.user_id, tip: 'preluare_loc', mesaj: `Rezervarea ta a fost preluată de un utilizator cu prioritate.`, trimis: false })
      }
    }

    const { error } = await supabase.from('rezervari').insert({
      user_id: user.id, masina_id: masinaSelectata, loc_id: locSelectat,
      data_ora_start: startISO, data_ora_sfarsit: stopISO,
      pret_total: calcPret?.total || 0, status: 'activa',
      companie_id: user.companie_id, locatie_id: locatieSelectata
    })

    if (error) { setMsg('Eroare: ' + error.message); setMsgType('error'); setSaving(false); return }
    setMsg('✅ Rezervare făcută cu succes!')
    setMsgType('success')
    setSaving(false)
    setTimeout(() => router.push('/rezervarile-mele'), 1500)
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 mb-4 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-gray-900">🅿️ Rezervă loc de parcare</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {user.nume || user.email}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${user.tip === 'master' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{user.tip}</span>
            </p>
          </div>
          <button onClick={() => router.push('/dashboard')} className="text-blue-600 hover:text-blue-800 font-medium text-sm">← Înapoi</button>
        </div>

        {msg && (
          <div className={`px-4 py-3 rounded-xl mb-4 text-sm font-medium ${msgType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {msg}
            {msg.includes('Nu ai nicio mașină') && (
              <button onClick={() => router.push('/profil')} className="ml-2 underline font-semibold">Mergi la profil</button>
            )}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 text-sm">Se încarcă...</div>
        ) : (
          <div className="space-y-4">

            {/* ROW 1: Interval + Mașina */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Interval */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h2 className="text-sm font-bold text-gray-700 mb-3">1. Interval</h2>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Data start</label>
                    <input type="date" min={azi} value={dataStart}
                      onChange={e => { setDataStart(e.target.value); setLocSelectat('') }}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Ora start</label>
                    <select value={oraStart} onChange={e => { setOraStart(e.target.value); setLocSelectat('') }}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {ORARE.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Data stop</label>
                    <input type="date" min={dataStart || azi} value={dataStop}
                      onChange={e => { setDataStop(e.target.value); setLocSelectat('') }}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Ora stop</label>
                    <select value={oraStop} onChange={e => { setOraStop(e.target.value); setLocSelectat('') }}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {ORARE.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
                {intervalValid && (
                  <div className="mt-2 px-3 py-1.5 bg-blue-50 rounded-lg text-xs text-blue-700 font-medium">
                    ⏱ {formatDurata(minuteTotal)}
                  </div>
                )}
                {dataStart && dataStop && !intervalValid && (
                  <div className="mt-2 px-3 py-1.5 bg-red-50 rounded-lg text-xs text-red-600">
                    ⚠️ Stop trebuie să fie după start
                  </div>
                )}
              </div>

              {/* Mașina */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h2 className="text-sm font-bold text-gray-700 mb-3">2. Mașina</h2>
                {masinileUser.length === 0 ? (
                  <div className="text-sm text-red-500">
                    Nu ai nicio mașină.{' '}
                    <button onClick={() => router.push('/profil')} className="underline font-semibold">Adaugă din profil</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {masinileUser.map(m => (
                      <button key={m.id} onClick={() => setMasinaSelectata(m.id)}
                        className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium text-left transition ${masinaSelectata === m.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-300 text-gray-700'}`}>
                        🚗 {m.nr_masina}
                        {m.descriere && <span className="ml-2 text-xs text-gray-400 font-normal">{m.descriere}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ROW 2: Locație + Filtre */}
            {intervalValid && masinaSelectata && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h2 className="text-sm font-bold text-gray-700 mb-3">3. Locație și filtre</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Locație *</label>
                    <select value={locatieSelectata} onChange={e => handleLocatieChange(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">— Alege —</option>
                      {locatii.map(l => <option key={l.id} value={l.id}>{l.nume}</option>)}
                    </select>
                  </div>
                  {zone.length > 0 && (
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Zonă</label>
                      <select value={zonaSelectata} onChange={e => { setZonaSelectata(e.target.value); setLocSelectat('') }}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Toate</option>
                        {zone.map(z => <option key={z.id} value={z.id}>{z.nume}</option>)}
                      </select>
                    </div>
                  )}
                  {etaje.length > 1 && (
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Etaj</label>
                      <select value={etajSelectat} onChange={e => { setEtajSelectat(e.target.value); setLocSelectat('') }}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Toate</option>
                        {etaje.map(e => <option key={e} value={e}>Etaj {e}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ROW 3: Locuri */}
            {intervalValid && masinaSelectata && locatieSelectata && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h2 className="text-sm font-bold text-gray-700 mb-3">4. Loc de parcare</h2>

                {locuriDisponibile.length > 0 && (
                  <>
                    <p className="text-xs text-green-600 font-medium mb-2">✅ Disponibile ({locuriDisponibile.length})</p>
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2 mb-3">
                      {locuriDisponibile.map(l => (
                        <button key={l.id} onClick={() => setLocSelectat(l.id)}
                          className={`p-2.5 rounded-xl border-2 text-xs font-medium transition text-center ${locSelectat === l.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-300 text-gray-700'}`}>
                          <div>{tipLocIcon(l.tip_loc)}</div>
                          <div className="font-bold mt-0.5">{l.numar_loc}</div>
                          {l.tip_loc === 'handicap' && <div className="text-purple-500">HC</div>}
                          {l.tip_loc === 'familie' && <div className="text-teal-500">FAM</div>}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {user.tip === 'master' && locuriRezervate.length > 0 && (
                  <>
                    <p className="text-xs text-orange-600 font-medium mb-2">🔒 Rezervate — poți prelua</p>
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2 mb-3">
                      {locuriRezervate.map(l => {
                        const rez = locEsteRezervat(l.id)
                        return (
                          <button key={l.id} onClick={() => setLocSelectat(l.id)}
                            className={`p-2.5 rounded-xl border-2 text-xs font-medium transition text-center ${locSelectat === l.id ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-orange-200 bg-orange-50 hover:border-orange-400 text-gray-700'}`}>
                            <div>🔒</div>
                            <div className="font-bold mt-0.5">{l.numar_loc}</div>
                            <div className="text-orange-400 truncate">{rez?.masini?.nr_masina}</div>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}

                {locuriDisponibile.length === 0 && (user.tip === 'normal' || locuriRezervate.length === 0) && (
                  <p className="text-center text-gray-400 py-4 text-sm">Nu există locuri disponibile în acest interval</p>
                )}
              </div>
            )}

            {/* ROW 4: Sumar preț + Confirmare */}
            {locSelectat && calcPret && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h2 className="text-sm font-bold text-gray-700 mb-3">5. Sumar și confirmare</h2>
                <div className="bg-gray-50 rounded-xl p-3 mb-3">
                  <p className="text-xs text-gray-400 mb-2">Calcul preț — {formatDurata(minuteTotal)}</p>
                  <div className="space-y-1">
                    {calcPret.detalii.map((d, i) => (
                      <div key={i} className="flex justify-between text-sm text-gray-700">
                        <span>
                          {d.count > 1
                            ? <>{d.count} × {d.nume} = {d.totalPret} RON</>
                            : <>{d.nume}</>
                          }
                        </span>
                        {d.count === 1 && <span className="font-medium">{d.totalPret} RON</span>}
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold text-gray-900">
                    <span>Total</span>
                    <span className="text-blue-600 text-base">{calcPret.total} RON</span>
                  </div>
                </div>
                <button onClick={rezerva} disabled={saving}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition font-medium disabled:opacity-50 text-sm">
                  {saving ? 'Se procesează...' : `✅ Confirmă rezervarea — ${calcPret.total} RON`}
                </button>
              </div>
            )}

            {locSelectat && !calcPret && intervalValid && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-sm text-yellow-700">
                ⚠️ Nu există tarife definite pentru această locație/zonă. Contactează administratorul.
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}