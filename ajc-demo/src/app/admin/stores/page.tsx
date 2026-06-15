'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AppLayout from '@/components/layout/AppLayout'
import { useProfile } from '@/hooks/useProfile'

interface Store {
  id: string
  name: string
  address: string
  is_active: boolean
  created_at: string
}

export default function StoresPage() {
  const router = useRouter()
  const supabase = createClient()
  const { isAdmin, loading: profileLoading } = useProfile()
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', address: '', is_active: true })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!profileLoading && !isAdmin) {
      router.push('/')
    }
  }, [isAdmin, profileLoading])

  useEffect(() => {
    fetchStores()
  }, [])

  const fetchStores = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('stores')
      .select('*')
      .order('created_at')
    setStores(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('店舗名を入力してください'); return }
    setSaving(true); setError('')

    const payload = { name: form.name.trim(), address: form.address, is_active: form.is_active }
    const { error: err } = editingId
      ? await supabase.from('stores').update(payload).eq('id', editingId)
      : await supabase.from('stores').insert(payload)

    if (err) { setError(err.message) }
    else { setForm({ name: '', address: '', is_active: true }); setEditingId(null); setShowForm(false); fetchStores() }
    setSaving(false)
  }

  const handleEdit = (store: Store) => {
    setForm({ name: store.name, address: store.address, is_active: store.is_active })
    setEditingId(store.id)
    setShowForm(true)
  }

  const handleToggle = async (store: Store) => {
    await supabase.from('stores').update({ is_active: !store.is_active }).eq('id', store.id)
    fetchStores()
  }

  if (profileLoading) return <AppLayout><div className="flex justify-center h-64 items-center text-gray-400">読み込み中...</div></AppLayout>
  if (!isAdmin) return null

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">🏪 店舗管理</h1>
          <button onClick={() => { setForm({ name: '', address: '', is_active: true }); setEditingId(null); setShowForm(true) }} className="btn-primary">
            ＋ 店舗を追加
          </button>
        </div>

        {showForm && (
          <div className="card border-2 border-blue-300">
            <h2 className="section-title">{editingId ? '✏️ 店舗を編集' : '➕ 新規店舗'}</h2>
            {error && <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 mb-4">⚠️ {error}</div>}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">店舗名 *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="例：本店" required />
              </div>
              <div>
                <label className="form-label">住所</label>
                <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="住所（任意）" />
              </div>
              <div className="flex items-center gap-3">
                <label className="form-label mb-0">有効</label>
                <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))} className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${form.is_active ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${form.is_active ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
                <span className="text-base text-gray-600">{form.is_active ? '有効' : '無効'}</span>
              </div>
              <div className="col-span-full flex gap-3 justify-end">
                <button type="button" onClick={() => { setShowForm(false); setError('') }} className="btn-secondary">キャンセル</button>
                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? '保存中...' : editingId ? '更新する' : '追加する'}</button>
              </div>
            </form>
          </div>
        )}

        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">🔄 読み込み中...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>店舗名</th><th>住所</th><th className="text-center">状態</th><th className="text-center">操作</th></tr>
              </thead>
              <tbody>
                {stores.map(s => (
                  <tr key={s.id} className={!s.is_active ? 'opacity-50' : ''}>
                    <td className="font-medium">{s.name}</td>
                    <td className="text-gray-500">{s.address || '—'}</td>
                    <td className="text-center">
                      <button onClick={() => handleToggle(s)} className={`badge cursor-pointer ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {s.is_active ? '✅ 有効' : '⛔ 無効'}
                      </button>
                    </td>
                    <td className="text-center">
                      <button onClick={() => handleEdit(s)} className="btn-secondary btn-sm">✏️ 編集</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
