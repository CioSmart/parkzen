import { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { db: { schema: 'parkzen' } }
  )

  const { nume, email, password, tip, companie_id } = await req.json()

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  if (authError) {
    return Response.json({ error: authError.message }, { status: 400 })
  }

  // Inserare user FARA companie_id
  const { data: newUser, error } = await supabaseAdmin
    .from('users')
    .insert({
      auth_id: authData.user.id,
      nume,
      email,
      tip: 'normal',
      activ: true
    })
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  // Daca vine cu companie_id, aloca in user_companii
  if (companie_id) {
    await supabaseAdmin
      .from('user_companii')
      .insert({
        user_id: newUser.id,
        companie_id,
        tip: tip || 'normal',
        activ: true
      })
  }

  return Response.json({ success: true, user: newUser })
}