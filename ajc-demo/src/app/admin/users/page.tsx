'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AppLayout from '@/components/layout/AppLayout'
import { useProfile } from '@/hooks/useProfile'

interface UserProfile {
  id: string
  full_name: string
  login_id: string | null
  role: 'admin' | 'staff'
  store_id: string | null
  stores?: { name: string } | null
  created_at: string
}

interface Store { id: string; name: string }

const emptyForm = { login_id: '', password: '', full_name: '', role: 'staff', store_id: '' }

export default function UsersPage() {
  const router = useRouter()
  const supabase = createClient()
  const { isAdmin, loading: profileLoading } = useProfile()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // 編集モーダル
  const [editUser, setEditUser] = useState<UserProfile | null>(null)
  const [editForm, setEditForm] = useState({ full_name: '', login_id: '', role: 'staff', store_id: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editResult, setEditResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // パスワード変更
  const [pwUserId, setPwUserId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwResult, setPwResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (!profileLoading && !isAdmin) router.push('/')
  }, [isAdmin, profileLoading])

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: usersData }, { data: storesData }] = await Promise.all([
      supabase.from('profiles').select('*, stores(name)').order('created_at'),
      supabase.from('stores').select('id, name').eq('is_active', true),
    ])
    setUsers(usersData || [])
    setStores(storesData || [])
    setLoading(false)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.error) {
        setResult({ type: 'error', message: data.error })
      } else {
        setResult({ type: 'success', message: `${form.full_name || form.login_id} を作成しました` })
        setForm(emptyForm)
        fetchAll()
      }
    } catch {
      setResult({ type: 'error', message: '作成に失敗しました' })
    }
    setSaving(false)
  }

  const openEdit = (u: UserProfile) => {
    setEditUser(u)
    setEditForm({
      full_name: u.full_name || '',
      login_id: u.login_id || '',
      role: u.role,
      store_id: u.store_id || '',
    })
    setEditResult(null)
  }

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return
    setEditSaving(true)
    setEditResult(null)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name || null,
          login_id: editForm.login_id || null,
          role: editForm.role,
          store_id: editForm.store_id || null,
        })
        .eq('id', editUser.id)
      if (error) {
        setEditResult({ type: 'error', message: error.message })
      } else {
        setEditResult({ type: 'success', message: '更新しました' })
        fetchAll()
        setTimeout(() => { setEditUser(null); setEditResult(null) }, 1000)
      }
    } catch {
      setEditResult({ type: 'error', message: '更新に失敗しました' })
    }
    setEditSaving(false)
  }

  const handlePasswordUpdate = async () => {
    if (!pwUserId || !newPassword) return
    setPwSaving(true)
    setPwResult(null)
    try {
      const res = await fetch('/api/admin/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: pwUserId, password: newPassword }),
      })
      const data = await res.json()
      if (data.error) {
        setPwResult({ type: 'error', message: data.error })
      } else {
        setPwResult({ type: 'success', message: 'パスワードを変更しました' })
        setNewPassword('')
        setTimeout(() => { setPwUserId(null); setPwResult(null) }, 1500)
      }
    } catch {
      setPwResult({ type: 'error', message: '変更に失敗しました' })
    }
    setPwSaving(false)
  }

  if (profileLoading) return <AppLayout><div className="flex justify-center h-64 items-center text-gray-400">読み込み中...</div></AppLayout>
  if (!isAdmin) return null

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">👥 ユーザー管理</h1>
          <button onClick={() => { setShowCreate(true); setResult(null) }} className="btn-primary">
            ＋ ユーザー作成
          </button>
        </div>

        {/* ユーザー作成フォーム */}
        {showCreate && (
          <div className="card border-2 border-blue-300">
            <h2 className="section-title">新規ユーザー作成</h2>
            {result && (
              <div className={`rounded-lg px-4 py-3 mb-4 ${result.type === 'success' ? 'bg-green-50 border border-green-300 text-green-700' : 'bg-red-50 border border-red-300 text-red-700'}`}>
                {result.message}
              </div>
            )}
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">ログインID <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.login_id}
                  onChange={e => setForm(f => ({ ...f, login_id: e.target.value.replace(/\s/g, '') }))}
                  placeholder="例：yamada"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">半角英数字・記号（スペース不可）</p>
              </div>
              <div>
                <label className="form-label">パスワード <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="6文字以上"
                  required
                />
              </div>
              <div>
                <label className="form-label">氏名</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="山田 太郎"
                />
              </div>
              <div>
                <label className="form-label">権限</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="staff">スタッフ</option>
                  <option value="admin">管理者</option>
                </select>
              </div>
              <div>
                <label className="form-label">担当店舗</label>
                <select value={form.store_id} onChange={e => setForm(f => ({ ...f, store_id: e.target.value }))}>
                  <option value="">-- 選択 --</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="col-span-full flex gap-3 justify-end">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">キャンセル</button>
                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
                  {saving ? '作成中...' : '作成する'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 編集モーダル */}
        {editUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">✏️ ユーザー編集</h3>
              {editResult && (
                <div className={`rounded-lg px-4 py-3 mb-4 text-sm ${editResult.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {editResult.message}
                </div>
              )}
              <form onSubmit={handleEditSave} className="space-y-4">
                <div>
                  <label className="form-label">氏名</label>
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="山田 太郎"
                  />
                </div>
                <div>
                  <label className="form-label">ログインID</label>
                  <input
                    type="text"
                    value={editForm.login_id}
                    onChange={e => setEditForm(f => ({ ...f, login_id: e.target.value.replace(/\s/g, '') }))}
                    placeholder="例：yamada"
                  />
                  <p className="text-xs text-gray-400 mt-1">※ログインIDを変更してもメールアドレスは変わりません</p>
                </div>
                <div>
                  <label className="form-label">権限</label>
                  <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="staff">スタッフ</option>
                    <option value="admin">管理者</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">担当店舗</label>
                  <select value={editForm.store_id} onChange={e => setEditForm(f => ({ ...f, store_id: e.target.value }))}>
                    <option value="">未設定</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setEditUser(null); setEditResult(null) }}
                    className="btn-secondary flex-1"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {editSaving ? '保存中...' : '保存する'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* パスワード変更モーダル */}
        {pwUserId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
              <h3 className="text-xl font-bold mb-4">パスワード変更</h3>
              {pwResult && (
                <div className={`rounded-lg px-4 py-3 mb-4 text-sm ${pwResult.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {pwResult.message}
                </div>
              )}
              <label className="form-label">新しいパスワード</label>
              <input
                type="text"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="6文字以上"
                autoFocus
              />
              <div className="flex gap-3 mt-4">
                <button onClick={() => { setPwUserId(null); setNewPassword(''); setPwResult(null) }} className="btn-secondary flex-1">
                  キャンセル
                </button>
                <button onClick={handlePasswordUpdate} disabled={pwSaving || newPassword.length < 6} className="btn-primary flex-1 disabled:opacity-50">
                  {pwSaving ? '変更中...' : '変更する'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ユーザー一覧 */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">読み込み中...</div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p>ユーザーがいません</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>氏名</th>
                    <th>ログインID</th>
                    <th>担当店舗</th>
                    <th className="text-center">権限</th>
                    <th className="text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="font-medium">{u.full_name || '—'}</td>
                      <td className="text-gray-500 text-sm font-mono">{u.login_id || '—'}</td>
                      <td className="text-sm text-gray-600">{u.stores?.name || '未設定'}</td>
                      <td className="text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {u.role === 'admin' ? '管理者' : 'スタッフ'}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => openEdit(u)}
                            className="rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => { setPwUserId(u.id); setNewPassword(''); setPwResult(null) }}
                            className="rounded-lg px-3 py-2 text-sm bg-orange-100 text-orange-700 hover:bg-orange-200"
                          >
                            PW変更
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
