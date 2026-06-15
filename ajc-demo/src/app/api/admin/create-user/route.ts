import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const DOMAIN = 'seizo-nippo.local'

export async function POST(request: NextRequest) {
  try {
    // 管理者チェック
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '未認証' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })

    const body = await request.json()
    const { login_id, password, full_name, role, store_id } = body

    if (!login_id || !password) return NextResponse.json({ error: 'ログインIDとパスワードは必須です' }, { status: 400 })
    if (password.length < 6) return NextResponse.json({ error: 'パスワードは6文字以上必要です' }, { status: 400 })

    const email = `${login_id}@${DOMAIN}`

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role, store_id },
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // profilesテーブルに登録
    await adminSupabase.from('profiles').upsert({
      id: data.user.id,
      full_name: full_name || login_id,
      role: role || 'staff',
      store_id: store_id || null,
      login_id,
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
