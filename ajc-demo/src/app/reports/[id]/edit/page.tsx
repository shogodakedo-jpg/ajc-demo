'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { formatCurrency, toNumber } from '@/lib/utils'
import type { Product, ReportItemForm, ReportLossForm } from '@/types'

const WEATHER_OPTIONS = ['晴れ', '曇り', '雨', '雪', '晴れ時々曇り', '曇り時々雨']
const ACTION_GUIDELINES = [
  '①朝一番に笑顔であいさつ', '②報告・連絡・相談を徹底', '③清潔・整理整頓',
  '④時間を守る', '⑤お客様第一', '⑥チームワーク', '⑦前向きに取り組む',
]

const emptyItem = (): ReportItemForm => ({
  product_id: null, product_name: '', unit_price: '', quantity: '',
  amount: 0, production_count: '', manufacturing_hours: '', packaging_hours: '',
})
const emptyLoss = (): ReportLossForm => ({
  product_name: '', manufacturing_loss_amount: '', return_loss_amount: '', notes: '',
})

export default function EditReportPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [reportDate, setReportDate] = useState('')
  const [weather, setWeather] = useState('晴れ')
  const [event, setEvent] = useState('')
  const [morningDuty, setMorningDuty] = useState('')
  const [writer, setWriter] = useState('')
  const [notesPreparation, setNotesPreparation] = useState('')
  const [semiProducts, setSemiProducts] = useState('')
  const [deliveryPerson, setDeliveryPerson] = useState('')
  const [newProductDev, setNewProductDev] = useState('')
  const [absences, setAbsences] = useState('')
  const [reflection, setReflection] = useState('')
  const [actionGuidelines, setActionGuidelines] = useState('')
  const [dailyEvents, setDailyEvents] = useState('')
  const [items, setItems] = useState<ReportItemForm[]>([emptyItem()])
  const [losses, setLosses] = useState<ReportLossForm[]>([emptyLoss()])

  const totalManufacturingAmount = items.reduce((s, i) => s + toNumber(i.amount), 0)
  const totalLaborHours = items.reduce(
    (s, i) => s + toNumber(i.manufacturing_hours) + toNumber(i.packaging_hours), 0
  )
  const laborProductivity = totalLaborHours > 0
    ? Math.round(totalManufacturingAmount / totalLaborHours) : 0
  const totalLossAmount = losses.reduce((s, l) => s + toNumber(l.manufacturing_loss_amount), 0)
  const totalReturnLossAmount = losses.reduce((s, l) => s + toNumber(l.return_loss_amount), 0)

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: report }, { data: prods }] = await Promise.all([
        supabase
          .from('daily_reports')
          .select('*, report_items(*), report_losses(*)')
          .eq('id', id)
          .single(),
        supabase.from('products').select('*').eq('is_active', true).order('sort_order'),
      ])

      if (report) {
        setReportDate(report.report_date)
        setWeather(report.weather || '晴れ')
        setEvent(report.event || '')
        setMorningDuty(report.morning_duty || '')
        setWriter(report.writer || '')
        setNotesPreparation(report.notes_preparation || '')
        setSemiProducts(report.semi_products || '')
        setDeliveryPerson(report.delivery_person || '')
        setNewProductDev(report.new_product_dev || '')
        setAbsences(report.absences || '')
        setReflection(report.reflection || '')
        setActionGuidelines(report.action_guidelines || '')
        setDailyEvents(report.daily_events || '')

        if (report.report_items?.length > 0) {
          setItems(report.report_items.sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order).map((i: {
            product_id: string | null
            product_name: string
            unit_price: number
            quantity: number
            amount: number
            production_count: number
            manufacturing_hours: number
            packaging_hours: number
          }) => ({
            product_id: i.product_id,
            product_name: i.product_name,
            unit_price: i.unit_price,
            quantity: i.quantity,
            amount: i.amount,
            production_count: i.production_count,
            manufacturing_hours: i.manufacturing_hours,
            packaging_hours: i.packaging_hours,
          })))
        }

        if (report.report_losses?.length > 0) {
          setLosses(report.report_losses.map((l: {
            product_name: string
            manufacturing_loss_amount: number
            return_loss_amount: number
            notes: string
          }) => ({
            product_name: l.product_name,
            manufacturing_loss_amount: l.manufacturing_loss_amount,
            return_loss_amount: l.return_loss_amount,
            notes: l.notes,
          })))
        }
      }
      setProducts(prods || [])
      setLoading(false)
    }
    if (id) fetchAll()
  }, [id])

  const handleProductSelect = useCallback((index: number, productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return
    setItems(prev => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        product_id: product.id,
        product_name: product.name,
        unit_price: product.unit_price,
        amount: product.unit_price * toNumber(next[index].quantity),
      }
      return next
    })
  }, [products])

  const handleItemChange = useCallback((index: number, field: keyof ReportItemForm, value: string | number) => {
    setItems(prev => {
      const next = [...prev]
      const item = { ...next[index], [field]: value }
      if (field === 'unit_price' || field === 'quantity') {
        item.amount = toNumber(item.unit_price) * toNumber(item.quantity)
      }
      next[index] = item
      return next
    })
  }, [])

  const handleLossChange = (index: number, field: keyof ReportLossForm, value: string) => {
    setLosses(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      // ヘッダー更新
      const { error: reportError } = await supabase
        .from('daily_reports')
        .update({
          report_date: reportDate,
          weather, event,
          morning_duty: morningDuty,
          writer,
          notes_preparation: notesPreparation,
          semi_products: semiProducts,
          delivery_person: deliveryPerson,
          new_product_dev: newProductDev,
          absences, reflection,
          action_guidelines: actionGuidelines,
          daily_events: dailyEvents,
          total_manufacturing_amount: totalManufacturingAmount,
          total_labor_hours: totalLaborHours,
          labor_productivity: laborProductivity,
          total_loss_amount: totalLossAmount,
          total_return_loss_amount: totalReturnLossAmount,
        })
        .eq('id', id)

      if (reportError) throw reportError

      // 既存の明細を削除して再挿入
      await supabase.from('report_items').delete().eq('report_id', id)
      await supabase.from('report_losses').delete().eq('report_id', id)

      const validItems = items
        .filter(i => i.product_name.trim())
        .map((item, idx) => ({
          report_id: id as string,
          product_id: item.product_id,
          product_name: item.product_name,
          unit_price: toNumber(item.unit_price),
          quantity: toNumber(item.quantity),
          amount: toNumber(item.amount),
          production_count: toNumber(item.production_count),
          manufacturing_hours: toNumber(item.manufacturing_hours),
          packaging_hours: toNumber(item.packaging_hours),
          sort_order: idx,
        }))

      if (validItems.length > 0) {
        await supabase.from('report_items').insert(validItems)
      }

      const validLosses = losses
        .filter(l => l.product_name.trim() || toNumber(l.manufacturing_loss_amount) > 0 || toNumber(l.return_loss_amount) > 0)
        .map(loss => ({
          report_id: id as string,
          product_name: loss.product_name,
          manufacturing_loss_amount: toNumber(loss.manufacturing_loss_amount),
          return_loss_amount: toNumber(loss.return_loss_amount),
          notes: loss.notes,
        }))

      if (validLosses.length > 0) {
        await supabase.from('report_losses').insert(validLosses)
      }

      router.push(`/reports/${id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '更新に失敗しました')
      setSaving(false)
    }
  }

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-400">🔄 読み込み中...</div>
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <form onSubmit={handleSubmit} className="space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <Link href={`/reports/${id}`} className="text-blue-600 hover:underline text-base">← 詳細に戻る</Link>
            <h1 className="text-2xl font-bold text-gray-800 mt-1">✏️ 日報を編集</h1>
          </div>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? '🔄 更新中...' : '💾 更新する'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3">
            ⚠️ {error}
          </div>
        )}

        {/* 基本情報 */}
        <div className="card">
          <h2 className="section-title">基本情報</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="form-label">日付 *</label>
              <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} required />
            </div>
            <div>
              <label className="form-label">天気</label>
              <select value={weather} onChange={e => setWeather(e.target.value)}>
                {WEATHER_OPTIONS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">行事</label>
              <input type="text" value={event} onChange={e => setEvent(e.target.value)} />
            </div>
            <div>
              <label className="form-label">朝礼当番</label>
              <input type="text" value={morningDuty} onChange={e => setMorningDuty(e.target.value)} />
            </div>
            <div>
              <label className="form-label">記入者 *</label>
              <input type="text" value={writer} onChange={e => setWriter(e.target.value)} required />
            </div>
          </div>
        </div>

        {/* 商品別入力 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">商品別入力</h2>
            <button type="button" onClick={() => setItems(prev => [...prev, emptyItem()])} className="btn-primary btn-sm">＋ 行を追加</button>
          </div>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-gray-100 text-sm text-gray-600">
                  <th className="px-3 py-2 text-left w-48">商品名</th>
                  <th className="px-3 py-2 text-right w-28">単価（円）</th>
                  <th className="px-3 py-2 text-right w-24">数量</th>
                  <th className="px-3 py-2 text-right w-32">金額（自動）</th>
                  <th className="px-3 py-2 text-right w-24">製造回数</th>
                  <th className="px-3 py-2 text-right w-28">製造人時</th>
                  <th className="px-3 py-2 text-right w-28">包装人時</th>
                  <th className="px-3 py-2 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-2 py-2">
                      <div className="space-y-1">
                        <select value={item.product_id || ''} onChange={e => e.target.value ? handleProductSelect(idx, e.target.value) : handleItemChange(idx, 'product_id', '')} className="text-sm py-2">
                          <option value="">-- 選択 --</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <input type="text" value={item.product_name} onChange={e => handleItemChange(idx, 'product_name', e.target.value)} placeholder="または直接入力" className="text-sm py-2" />
                      </div>
                    </td>
                    <td className="px-2 py-2"><input type="number" value={item.unit_price} onChange={e => handleItemChange(idx, 'unit_price', e.target.value)} min="0" className="text-right" /></td>
                    <td className="px-2 py-2"><input type="number" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} min="0" className="text-right" /></td>
                    <td className="px-2 py-2"><div className="text-right font-semibold text-blue-700 text-lg py-3 px-2 bg-blue-50 rounded-lg">{formatCurrency(toNumber(item.amount))}</div></td>
                    <td className="px-2 py-2"><input type="number" value={item.production_count} onChange={e => handleItemChange(idx, 'production_count', e.target.value)} min="0" className="text-right" /></td>
                    <td className="px-2 py-2"><input type="number" value={item.manufacturing_hours} onChange={e => handleItemChange(idx, 'manufacturing_hours', e.target.value)} min="0" step="0.5" className="text-right" /></td>
                    <td className="px-2 py-2"><input type="number" value={item.packaging_hours} onChange={e => handleItemChange(idx, 'packaging_hours', e.target.value)} min="0" step="0.5" className="text-right" /></td>
                    <td className="px-2 py-2 text-center">
                      <button type="button" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} disabled={items.length === 1} className="text-red-500 hover:text-red-700 disabled:text-gray-300 text-2xl p-1">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <div className="text-sm text-gray-500">製造金額</div>
              <div className="text-2xl font-bold text-blue-700">{formatCurrency(totalManufacturingAmount)}</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <div className="text-sm text-gray-500">総労働時間</div>
              <div className="text-2xl font-bold text-green-700">{totalLaborHours.toFixed(1)}h</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <div className="text-sm text-gray-500">人時製造額</div>
              <div className="text-2xl font-bold text-purple-700">{formatCurrency(laborProductivity)}</div>
            </div>
          </div>
        </div>

        {/* ロス記録 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">ロス記録</h2>
            <button type="button" onClick={() => setLosses(prev => [...prev, emptyLoss()])} className="btn-primary btn-sm">＋ 行を追加</button>
          </div>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-gray-100 text-sm text-gray-600">
                  <th className="px-3 py-2 text-left">商品名</th>
                  <th className="px-3 py-2 text-right w-36">製造ロス（円）</th>
                  <th className="px-3 py-2 text-right w-36">返品ロス（円）</th>
                  <th className="px-3 py-2 text-left">備考</th>
                  <th className="px-3 py-2 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {losses.map((loss, idx) => (
                  <tr key={idx}>
                    <td className="px-2 py-2"><input type="text" value={loss.product_name} onChange={e => handleLossChange(idx, 'product_name', e.target.value)} placeholder="商品名" /></td>
                    <td className="px-2 py-2"><input type="number" value={loss.manufacturing_loss_amount} onChange={e => handleLossChange(idx, 'manufacturing_loss_amount', e.target.value)} min="0" className="text-right" /></td>
                    <td className="px-2 py-2"><input type="number" value={loss.return_loss_amount} onChange={e => handleLossChange(idx, 'return_loss_amount', e.target.value)} min="0" className="text-right" /></td>
                    <td className="px-2 py-2"><input type="text" value={loss.notes} onChange={e => handleLossChange(idx, 'notes', e.target.value)} placeholder="備考" /></td>
                    <td className="px-2 py-2 text-center">
                      <button type="button" onClick={() => setLosses(prev => prev.filter((_, i) => i !== idx))} disabled={losses.length === 1} className="text-red-500 hover:text-red-700 disabled:text-gray-300 text-2xl p-1">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* テキスト情報 */}
        <div className="card">
          <h2 className="section-title">製造・その他情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['仕込み内容', notesPreparation, setNotesPreparation, '本日の仕込み内容'],
              ['半製品', semiProducts, setSemiProducts, '半製品の状況'],
              ['配達者', deliveryPerson, setDeliveryPerson, '配達担当者名'],
              ['欠勤・公休', absences, setAbsences, '例：田中（公休）'],
              ['新商品開発', newProductDev, setNewProductDev, '進捗など'],
              ['本日の反省', reflection, setReflection, '振り返り・改善点'],
            ].map(([label, value, setter, placeholder]) => (
              <div key={label as string}>
                <label className="form-label">{label as string}</label>
                <textarea
                  value={value as string}
                  onChange={e => (setter as (v: string) => void)(e.target.value)}
                  placeholder={placeholder as string}
                  rows={3}
                />
              </div>
            ))}
            <div className="col-span-1 md:col-span-2">
              <label className="form-label">7つの行動指針</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {ACTION_GUIDELINES.map(g => (
                  <button key={g} type="button" onClick={() => setActionGuidelines(prev => prev ? prev + '\n' + g : g)} className="text-sm px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200">{g}</button>
                ))}
              </div>
              <textarea value={actionGuidelines} onChange={e => setActionGuidelines(e.target.value)} rows={3} />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="form-label">本日のできごと</label>
              <textarea value={dailyEvents} onChange={e => setDailyEvents(e.target.value)} rows={4} />
            </div>
          </div>
        </div>

        <div className="flex gap-4 justify-end pb-4">
          <button type="button" onClick={() => router.back()} className="btn-secondary">キャンセル</button>
          <button type="submit" disabled={saving} className="btn-primary text-xl px-10 disabled:opacity-50">
            {saving ? '🔄 更新中...' : '💾 更新する'}
          </button>
        </div>
      </form>
    </AppLayout>
  )
}
