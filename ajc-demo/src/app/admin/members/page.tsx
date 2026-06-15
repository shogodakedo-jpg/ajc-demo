'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppLayout from '@/components/layout/AppLayout'
import type { StaffMember } from '@/types'

export default function MembersPage() {
  const supabase = createClient()
  const [members, setMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const fetchMembers = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('staff_members')
      .select('*')
      .order('sort_order')
      .order('created_at')
    setMembers(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchMembers() }, [])

  const handleAdd = async () => {
    if (!newName.trim()) return
    setSaving(true)
    await supabase.from('staff_members').insert({ name: newName.trim(), sort_order: members.length })
    setNewName('')
    await fetchMembers()
    setSaving(false)
  }

  const handleToggleActive = async (member: StaffMember) => {
    await supabase.from('staff_members').update({ is_active: !member.is_active }).eq('id', member.id)
    await fetchMembers()
  }

  const handleEdit = async (id: string) => {
    if (!editName.trim()) return
    await supabase.from('staff_members').update({ name: editName.trim() }).eq('id', id)
    setEditId(null)
    setEditName('')
    await fetchMembers()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('削除しますか？')) return
    await supabase.from('staff_members').delete().eq('id', id)
    await fetchMembers()
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">氏名マスター</h1>

        {/* 追加フォーム */}
        <div className="card mb-6">
          <h2 className="section-title">新規追加</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="氏名を入力"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <button
              onClick={handleAdd}
              disabled={saving || !newName.trim()}
              className="btn-primary whitespace-nowrap disabled:opacity-50"
            >
              追加
            </button>
          </div>
        </div>

        {/* 一覧 */}
        <div className="card">
          <h2 className="section-title">登録済み氏名</h2>
          {loading ? (
            <p className="text-gray-500 text-center py-8">読み込み中...</p>
          ) : members.length === 0 ? (
            <p className="text-gray-400 text-center py-8">まだ登録されていません</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {members.map(member => (
                <li key={member.id} className="flex items-center gap-3 py-3">
                  {editId === member.id ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="flex-1"
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleEdit(member.id)}
                      />
                      <button onClick={() => handleEdit(member.id)} className="btn-primary btn-sm">保存</button>
                      <button onClick={() => setEditId(null)} className="btn-secondary btn-sm">キャンセル</button>
                    </>
                  ) : (
                    <>
                      <span className={`flex-1 text-lg ${!member.is_active ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                        {member.name}
                      </span>
                      <button
                        onClick={() => { setEditId(member.id); setEditName(member.name) }}
                        className="btn-secondary btn-sm"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleToggleActive(member)}
                        className={`btn-sm ${member.is_active ? 'bg-yellow-100 text-yellow-700 rounded-lg px-4 py-2' : 'bg-green-100 text-green-700 rounded-lg px-4 py-2'}`}
                      >
                        {member.is_active ? '無効化' : '有効化'}
                      </button>
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="btn-sm bg-red-100 text-red-600 rounded-lg px-4 py-2"
                      >
                        削除
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
