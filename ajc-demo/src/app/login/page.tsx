'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [error, setError] = useState('')

  // ?guest=1 で来たら自動でゲストログイン
  useEffect(() => {
    if (searchParams.get('guest') === '1') {
      handleGuestLogin()
    }
  }, [])

  const handleGuestLogin = async () => {
    setGuestLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({
      email: 'demo@ajc-demo.local',
      password: 'demo1234',
    })
    if (error) {
      setError('デモアカウントの準備中です。しばらくお待ちください。')
      setGuestLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const email = loginId.includes('@') ? loginId : `${loginId}@ajc-demo.local`
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('ログインIDまたはパスワードが正しくありません')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏭</div>
          <h1 className="text-3xl font-bold text-white">AJC 業務管理デモ</h1>
          <p className="text-blue-200 mt-2 text-lg">製造業向け 業務日報管理システム</p>
        </div>

        {/* ゲストログインボタン（目立つ） */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={guestLoading}
            className="w-full bg-yellow-400 text-blue-900 font-bold text-xl py-5 rounded-2xl hover:bg-yellow-300 transition-colors shadow-lg disabled:opacity-60"
          >
            {guestLoading ? '🔄 ログイン中...' : '🚀 デモを体験する（登録不要）'}
          </button>
          <p className="text-center text-blue-200 text-sm mt-2">
            サンプルデータ入りのデモ環境に1クリックで入れます
          </p>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 border-t border-blue-600"></div>
          <span className="text-blue-300 text-sm">または</span>
          <div className="flex-1 border-t border-blue-600"></div>
        </div>

        {/* 通常ログイン */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-700 mb-5 text-center">スタッフログイン</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-base">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="form-label" htmlFor="loginId">ログインID</label>
              <input
                id="loginId"
                type="text"
                value={loginId}
                onChange={e => setLoginId(e.target.value)}
                placeholder="例：yamada"
                required
                autoComplete="username"
                className="text-lg"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="password">パスワード</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="パスワードを入力"
                required
                autoComplete="current-password"
                className="text-lg"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-lg py-4 mt-2 disabled:opacity-50"
            >
              {loading ? '🔄 ログイン中...' : '🔑 ログイン'}
            </button>
          </form>
        </div>

        <p className="text-center text-blue-300 text-sm mt-6">
          <a href="/" className="hover:text-white underline">← トップページに戻る</a>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-blue-900" />}>
      <LoginForm />
    </Suspense>
  )
}
