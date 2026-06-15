'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppLayout from '@/components/layout/AppLayout'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types'

interface ProductForm {
  name: string
  reading: string
  unit_price: string | number
  category: string
  sort_order: string | number
  is_active: boolean
}

const emptyForm = (): ProductForm => ({
  name: '',
  reading: '',
  unit_price: '',
  category: '一般',
  sort_order: '',
  is_active: true,
})

const CATEGORIES = ['パン', 'ケーキ', '洋菓子', '和菓子', '焼き菓子', '季節商品', '一般', 'その他']

export default function ProductsPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductForm>(emptyForm())
  const [filterCategory, setFilterCategory] = useState('all')
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
    setProducts(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('商品名を入力してください')
      return
    }
    setSaving(true)
    setError('')

    const payload = {
      name: form.name.trim(),
      reading: form.reading.trim() || null,
      unit_price: Number(form.unit_price) || 0,
      category: form.category,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    }

    let err
    if (editingId) {
      const { error } = await supabase.from('products').update(payload).eq('id', editingId)
      err = error
    } else {
      const { error } = await supabase.from('products').insert(payload)
      err = error
    }

    if (err) {
      setError(err.message)
    } else {
      setForm(emptyForm())
      setEditingId(null)
      setShowForm(false)
      fetchProducts()
    }
    setSaving(false)
  }

  const handleEdit = (product: Product) => {
    setForm({
      name: product.name,
      reading: product.reading || '',
      unit_price: product.unit_price,
      category: product.category,
      sort_order: product.sort_order,
      is_active: product.is_active,
    })
    setEditingId(product.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleToggleActive = async (product: Product) => {
    await supabase
      .from('products')
      .update({ is_active: !product.is_active })
      .eq('id', product.id)
    fetchProducts()
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？\n過去の日報データには影響しません。`)) return
    await supabase.from('products').delete().eq('id', id)
    fetchProducts()
  }

  const handleCancel = () => {
    setForm(emptyForm())
    setEditingId(null)
    setShowForm(false)
    setError('')
  }

  // CSV出力
  const handleExportCSV = () => {
    const lines = [
      '商品名,単価,カテゴリ,表示順,有効',
      ...products.map(p =>
        `${p.name},${p.unit_price},${p.category},${p.sort_order},${p.is_active ? '有効' : '無効'}`
      ),
    ]
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '商品マスタ.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // 表示フィルター
  const filteredProducts = products.filter(p => {
    if (!showInactive && !p.is_active) return false
    if (filterCategory !== 'all' && p.category !== filterCategory) return false
    return true
  })

  const categories = Array.from(new Set(products.map(p => p.category)))

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-800">🛒 商品マスタ管理</h1>
          <div className="flex gap-2">
            <button onClick={handleExportCSV} className="btn-secondary btn-sm">
              📥 CSV
            </button>
            <button
              onClick={() => {
                setForm(emptyForm())
                setEditingId(null)
                setShowForm(true)
              }}
              className="btn-primary"
            >
              ＋ 商品を追加
            </button>
          </div>
        </div>

        {/* 追加・編集フォーム */}
        {showForm && (
          <div className="card border-2 border-blue-300">
            <h2 className="section-title">
              {editingId ? '✏️ 商品を編集' : '➕ 新規商品を追加'}
            </h2>

            {error && (
              <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 mb-4">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="col-span-2">
                <label className="form-label">商品名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="例：栗尾饅頭"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="form-label">読みがな <span className="text-xs text-gray-400">（ひらがな・検索用）</span></label>
                <input
                  type="text"
                  value={form.reading}
                  onChange={e => setForm(f => ({ ...f, reading: e.target.value }))}
                  placeholder="例：くりおまんじゅう"
                />
              </div>
              <div>
                <label className="form-label">単価（円）</label>
                <input
                  type="number"
                  value={form.unit_price}
                  onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label className="form-label">表示順</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label className="form-label">カテゴリ</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3 col-span-1">
                <label className="form-label mb-0">有効</label>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    form.is_active ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${
                      form.is_active ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-base text-gray-600">
                  {form.is_active ? '有効' : '無効'}
                </span>
              </div>

              <div className="col-span-2 md:col-span-4 flex gap-3 justify-end mt-2">
                <button type="button" onClick={handleCancel} className="btn-secondary">
                  キャンセル
                </button>
                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
                  {saving ? '🔄 保存中...' : editingId ? '💾 更新する' : '➕ 追加する'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* フィルター */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-base text-gray-600">カテゴリ：</label>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="w-32"
            >
              <option value="all">すべて</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-base text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
              className="w-5 h-5"
            />
            無効商品も表示
          </label>
          <span className="text-gray-400 text-base ml-auto">
            {filteredProducts.length}件
          </span>
        </div>

        {/* 商品一覧 */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-lg">🔄 読み込み中...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <div className="text-5xl mb-3">📦</div>
              <p className="text-lg">商品がありません</p>
            </div>
          ) : (
            <div className="table-responsive rounded-none border-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>順</th>
                    <th>商品名</th>
                    <th>カテゴリ</th>
                    <th className="text-right">単価</th>
                    <th className="text-center">状態</th>
                    <th className="text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(p => (
                    <tr key={p.id} className={!p.is_active ? 'opacity-50' : ''}>
                      <td className="text-gray-400 w-16">{p.sort_order}</td>
                      <td className="font-medium">{p.name}</td>
                      <td>
                        <span className="badge bg-blue-100 text-blue-700">{p.category}</span>
                      </td>
                      <td className="text-right font-medium">{formatCurrency(p.unit_price)}</td>
                      <td className="text-center">
                        <button
                          onClick={() => handleToggleActive(p)}
                          className={`badge cursor-pointer transition-colors ${
                            p.is_active
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {p.is_active ? '✅ 有効' : '⛔ 無効'}
                        </button>
                      </td>
                      <td>
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleEdit(p)}
                            className="btn-secondary btn-sm"
                          >
                            ✏️ 編集
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="btn-danger btn-sm"
                          >
                            🗑️
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

        {/* カテゴリ別サマリー */}
        {!loading && products.length > 0 && (
          <div className="card">
            <h2 className="section-title">カテゴリ別 商品数</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {categories.map(cat => {
                const count = products.filter(p => p.category === cat && p.is_active).length
                return (
                  <div
                    key={cat}
                    className="bg-gray-50 rounded-xl p-4 text-center cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => setFilterCategory(cat === filterCategory ? 'all' : cat)}
                  >
                    <div className="text-2xl font-bold text-blue-600">{count}</div>
                    <div className="text-sm text-gray-500 mt-1">{cat}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
