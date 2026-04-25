import { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  // Inițializare ÎNĂUNTRUL funcției, nu afară
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { nume, email, password, tip } = await req.json()

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  if (authError) {
    return Response.json({ error: authError.message }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('users').insert({
    auth_id: authData.user.id,
    nume,
    email,
    tip,
    activ: true
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  if (tip === 'admin') {
    await supabaseAdmin.from('admin_users').insert({ user_id: authData.user.id })
  }

  return Response.json({ success: true })
}