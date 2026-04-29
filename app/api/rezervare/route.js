import { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { db: { schema: 'parkzen' } }
  )

  const { user_id, masina_id, loc_id, locatie_id, companie_id, pret_id, data_ora_start, data_ora_sfarsit, pret_total } = await req.json()

  // Verificare conflict chiar inainte de inserare
  const { data: conflict } = await supabaseAdmin
    .from('rezervari')
    .select('id')
    .eq('loc_id', loc_id)
    .eq('status', 'activa')
    .lt('data_ora_start', data_ora_sfarsit)
    .gt('data_ora_sfarsit', data_ora_start)
    .maybeSingle()

  if (conflict) {
    return Response.json({ 
      error: 'Locul a fost rezervat de altcineva în același interval. Te rugăm alege alt loc sau interval.' 
    }, { status: 409 })
  }

  const { data, error } = await supabaseAdmin
    .from('rezervari')
    .insert({
      user_id,
      masina_id,
      loc_id,
      locatie_id,
      companie_id,
      pret_id,
      data_ora_start,
      data_ora_sfarsit,
      pret_total,
      status: 'activa'
    })
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({ success: true, rezervare: data })
}