'use client'

import { useEffect, useState, useCallback, useRef, Suspense, Dispatch, SetStateAction } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AppLayout from '@/components/layout/AppLayout'
import { todayString, formatCurrency, toNumber } from '@/lib/utils'
import type { Product, StaffMember, ReportItemForm, ReportLossForm, LaborDetail, ItemSection } from '@/types'

const WEATHER_OPTIONS = ['晴れ', '曇り', '雨', '雪', '晴れ時々曇り', '曇り時々雨']

// ─── 商品キーワード検索コンポーネント ─────────────────────
function ProductSearchInput({
  products,
  value,
  onSelect,
  onChange,
}: {
  products: Product[]
  value: string
  onSelect: (product: Product) => void
  onChange: (name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 200 })
  const composingRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 外部 value 変更（商品選択後）を DOM に反映
  useEffect(() => {
    if (!composingRef.current) {
      setQuery(value)
      if (inputRef.current) inputRef.current.value = value
    }
  }, [value])

  // カタカナ→ひらがな変換（例：シュー→しゅー）
  const toHira = (s: string) =>
    s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))

  // 商品名・カタカナ→ひらがな変換後・ふりがな、いずれかで絞り込む
  const filtered = query.trim()
    ? products.filter(p =>
        p.name.includes(query) ||
        toHira(p.name).includes(query) ||
        (p.reading && p.reading.includes(query))
      )
    : products.slice(0, 10)

  // 外側クリックで閉じる
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!inputRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const openDrop = () => {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect()
      // position:fixed はビューポート基準なのでscrollYを足さない
      setDropPos({ top: r.bottom, left: r.left, width: r.width })
    }
    setOpen(true)
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        defaultValue={value}
        onCompositionStart={() => { composingRef.current = true }}
        onCompositionEnd={e => {
          composingRef.current = false
          const v = (e.target as HTMLInputElement).value
          setQuery(v)
          onChange(v)
          // IME確定後、少し待ってからドロップダウンを開く
          setTimeout(() => openDrop(), 50)
        }}
        onChange={e => {
          const v = e.target.value
          setQuery(v)
          if (!composingRef.current) {
            // IME変換中でないときだけ候補を開く（変換中は邪魔しない）
            onChange(v)
            openDrop()
          }
        }}
        onFocus={openDrop}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            // IME確定後（composingRef=false）かつドロップダウン開いていれば先頭を選択
            if (!composingRef.current && open && filtered.length > 0) {
              if (inputRef.current) inputRef.current.value = filtered[0].name
              onSelect(filtered[0])
              setQuery(filtered[0].name)
              setOpen(false)
            }
          }
          if (e.key === 'Escape') setOpen(false)
        }}
        placeholder="商品名・ふりがなで検索"
        className="text-sm py-2 w-full"
        autoComplete="new-password"
        name={`product-search-${Math.random()}`}
      />
      {open && filtered.length > 0 && (
        <ul
          style={{
            position: 'fixed',
            top: dropPos.top,
            left: dropPos.left,
            width: Math.max(dropPos.width, 220),
            zIndex: 9999,
          }}
          className="bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-y-auto"
        >
          {filtered.map(p => (
            <li
              key={p.id}
              onMouseDown={e => {
                e.preventDefault()
                if (inputRef.current) inputRef.current.value = p.name
                onSelect(p)
                setQuery(p.name)
                setOpen(false)
              }}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 border-b border-gray-100 last:border-0"
            >
              <span className="font-medium">{p.name}</span>
              {p.reading && <span className="ml-1 text-xs text-gray-400">({p.reading})</span>}
              <span className="ml-2 text-xs text-gray-400">¥{p.unit_price.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const emptyItem = (section: ItemSection = 'B'): ReportItemForm => ({
  section,
  product_id: null,
  product_name: '',
  unit_price: '',
  quantity: '',
  amount: 0,
  production_count: '',
  manufacturing_hours: '',
  packaging_hours: '',
})

const emptyLoss = (): ReportLossForm => ({
  product_name: '',
  manufacturing_loss_amount: '',
  return_loss_amount: '',
  notes: '',
})

const defaultLaborDetail = (): LaborDetail => ({
  shifts: {
    hayade:     { end_time: '', overtime: '' },
    part:       { end_time: '', overtime: '' },
    late_shift: { end_time: '', overtime: '' },
  },
  hour_groups: [
    { label: '8H', count: '', actual_hours: '', names: '' },
    { label: '5H', count: '', actual_hours: '', names: '' },
    { label: '7H', count: '', actual_hours: '', names: '' },
    { label: '4H', count: '', actual_hours: '', names: '' },
    { label: '3H', count: '', actual_hours: '', names: '' },
  ],
  management: { president: '', overtime: '', early_morning: '', delivery: '', other: '' },
})

function NewReportPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromId = searchParams.get('from')
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copiedFrom, setCopiedFrom] = useState('')

  // 基本情報
  const [reportDate, setReportDate] = useState(todayString())
  const [weather, setWeather] = useState('晴れ')
  const [event, setEvent] = useState('')
  const [morningDuty, setMorningDuty] = useState('')
  const [writer, setWriter] = useState('')

  // 商品（セクションA/B共通）
  const [items, setItems] = useState<ReportItemForm[]>([emptyItem('B'), emptyItem('A')])

  // ロス記録
  const [losses, setLosses] = useState<ReportLossForm[]>([emptyLoss()])

  // 労働時間詳細
  const [laborDetail, setLaborDetail] = useState<LaborDetail>(defaultLaborDetail())

  // 欠勤・公休（4区分）
  const [absenceHalf, setAbsenceHalf] = useState('')
  const [absenceFull, setAbsenceFull] = useState('')
  const [absenceEarlyLeave, setAbsenceEarlyLeave] = useState('')
  const [absenceLate, setAbsenceLate] = useState('')

  // その他テキスト
  const [notesPreparation, setNotesPreparation] = useState('')
  const [semiProducts, setSemiProducts] = useState('')
  const [deliveryPerson, setDeliveryPerson] = useState('')
  const [newProductDev, setNewProductDev] = useState('')
  const [reflection, setReflection] = useState('')
  const [actionGuidelines, setActionGuidelines] = useState('')
  const [dailyEvents, setDailyEvents] = useState('')

  // ─── 自動計算 ───────────────────────────────────────
  const itemsA = items.filter(i => i.section === 'A')
  const itemsB = items.filter(i => i.section === 'B')
  const totalAmountA = itemsA.reduce((s, i) => s + toNumber(i.amount), 0)
  const totalAmountB = itemsB.reduce((s, i) => s + toNumber(i.amount), 0)
  const totalManufacturingAmount = totalAmountA + totalAmountB

  const totalLaborFromGroups = laborDetail.hour_groups.reduce(
    (s, g) => s + toNumber(g.actual_hours), 0
  )
  const mgmt = laborDetail.management
  const totalLaborFromMgmt =
    toNumber(mgmt.president) + toNumber(mgmt.overtime) +
    toNumber(mgmt.early_morning) + toNumber(mgmt.delivery) + toNumber(mgmt.other)
  const totalLaborHours = totalLaborFromGroups + totalLaborFromMgmt
  const laborProductivity = totalLaborHours > 0
    ? Math.round(totalManufacturingAmount / totalLaborHours)
    : 0

  const totalLossAmount = losses.reduce((s, l) => s + toNumber(l.manufacturing_loss_amount), 0)
  const totalReturnLossAmount = losses.reduce((s, l) => s + toNumber(l.return_loss_amount), 0)

  // ─── 商品マスタ取得 ──────────────────────────────────
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      const { data } = await supabase.from('products').select('id, name, reading, unit_price, category, sort_order, is_active, created_at, updated_at').eq('is_active', true).order('sort_order')
      setProducts(data || [])
      setLoading(false)
    }
    const fetchStaff = async () => {
      const { data } = await supabase.from('staff_members').select('*').eq('is_active', true).order('sort_order').order('created_at')
      setStaffMembers(data || [])
    }
    fetchProducts()
    fetchStaff()
  }, [])

  // ─── コピー元読み込み ────────────────────────────────
  useEffect(() => {
    if (!fromId) return
    const fetchSource = async () => {
      const { data } = await supabase
        .from('daily_reports')
        .select('*, report_items(*), report_losses(*)')
        .eq('id', fromId)
        .single()
      if (!data) return
      setCopiedFrom(data.report_date)
      setWeather(data.weather || '晴れ')
      setEvent(data.event || '')
      setMorningDuty(data.morning_duty || '')
      setWriter(data.writer || '')
      setNotesPreparation(data.notes_preparation || '')
      setSemiProducts(data.semi_products || '')
      setDeliveryPerson(data.delivery_person || '')
      setNewProductDev(data.new_product_dev || '')
      setActionGuidelines(data.action_guidelines || '')
      setAbsenceHalf(data.absence_half || '')
      setAbsenceFull(data.absence_full || '')
      setAbsenceEarlyLeave(data.absence_early_leave || '')
      setAbsenceLate(data.absence_late || '')
      if (data.labor_detail) setLaborDetail(data.labor_detail)
      if (data.report_items?.length > 0) {
        setItems(data.report_items
          .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
          .map((i: ReportItemForm & { product_id: string | null; section: ItemSection }) => ({
            section: i.section || 'B',
            product_id: i.product_id,
            product_name: i.product_name,
            unit_price: i.unit_price,
            quantity: i.quantity,
            amount: i.amount,
            production_count: i.production_count,
            manufacturing_hours: i.manufacturing_hours,
            packaging_hours: i.packaging_hours,
          }))
        )
      }
      if (data.report_losses?.length > 0) {
        setLosses(data.report_losses.map((l: ReportLossForm) => ({
          product_name: l.product_name,
          manufacturing_loss_amount: l.manufacturing_loss_amount,
          return_loss_amount: l.return_loss_amount,
          notes: l.notes,
        })))
      }
    }
    fetchSource()
  }, [fromId])

  // ─── 商品操作 ────────────────────────────────────────
  const handleProductSelect = useCallback((index: number, productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return
    setItems(prev => {
      const next = [...prev]
      next[index] = { ...next[index], product_id: product.id, product_name: product.name, unit_price: product.unit_price, amount: product.unit_price * toNumber(next[index].quantity) }
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

  const addItem = (section: ItemSection) => setItems(prev => [...prev, emptyItem(section)])
  const removeItem = (index: number) => {
    if (items.length === 1) return
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  // ─── ロス操作 ────────────────────────────────────────
  const handleLossChange = (index: number, field: keyof ReportLossForm, value: string) => {
    setLosses(prev => { const next = [...prev]; next[index] = { ...next[index], [field]: value }; return next })
  }
  const addLoss = () => setLosses(prev => [...prev, emptyLoss()])
  const removeLoss = (index: number) => { if (losses.length === 1) return; setLosses(prev => prev.filter((_, i) => i !== index)) }

  // ─── 労働時間操作 ────────────────────────────────────
  const updateLaborGroup = (index: number, field: string, value: string) => {
    setLaborDetail(prev => {
      const groups = [...prev.hour_groups]
      groups[index] = { ...groups[index], [field]: value }
      // actual_hours を count × label時間 で自動計算（編集可能）
      return { ...prev, hour_groups: groups }
    })
  }

  const updateLaborShift = (shift: 'hayade' | 'part' | 'late_shift', field: string, value: string) => {
    setLaborDetail(prev => ({
      ...prev,
      shifts: { ...prev.shifts, [shift]: { ...prev.shifts[shift], [field]: value } }
    }))
  }

  const updateLaborMgmt = (field: string, value: string) => {
    setLaborDetail(prev => ({
      ...prev,
      management: { ...prev.management, [field]: value }
    }))
  }

  // ─── 保存 ────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: reportData, error: reportError } = await supabase
        .from('daily_reports')
        .insert({
          report_date: reportDate, weather, event,
          morning_duty: morningDuty, writer,
          notes_preparation: notesPreparation, semi_products: semiProducts,
          delivery_person: deliveryPerson, new_product_dev: newProductDev,
          absences: [absenceHalf, absenceFull, absenceEarlyLeave, absenceLate].filter(Boolean).join(' / '),
          absence_half: absenceHalf, absence_full: absenceFull,
          absence_early_leave: absenceEarlyLeave, absence_late: absenceLate,
          reflection, action_guidelines: actionGuidelines, daily_events: dailyEvents,
          total_manufacturing_amount: totalManufacturingAmount,
          total_labor_hours: totalLaborHours,
          labor_productivity: laborProductivity,
          total_loss_amount: totalLossAmount,
          total_return_loss_amount: totalReturnLossAmount,
          labor_detail: laborDetail,
          created_by: user?.id,
        })
        .select().single()
      if (reportError) throw reportError

      const reportId = reportData.id
      const validItems = items.filter(i => i.product_name.trim()).map((item, idx) => ({
        report_id: reportId, product_id: item.product_id,
        product_name: item.product_name, unit_price: toNumber(item.unit_price),
        quantity: toNumber(item.quantity), amount: toNumber(item.amount),
        production_count: toNumber(item.production_count),
        manufacturing_hours: toNumber(item.manufacturing_hours),
        packaging_hours: toNumber(item.packaging_hours),
        section: item.section, sort_order: idx,
      }))
      if (validItems.length > 0) {
        const { error: itemsError } = await supabase.from('report_items').insert(validItems)
        if (itemsError) throw itemsError
      }

      const validLosses = losses
        .filter(l => l.product_name.trim() || toNumber(l.manufacturing_loss_amount) > 0 || toNumber(l.return_loss_amount) > 0)
        .map(loss => ({
          report_id: reportId, product_name: loss.product_name,
          manufacturing_loss_amount: toNumber(loss.manufacturing_loss_amount),
          return_loss_amount: toNumber(loss.return_loss_amount), notes: loss.notes,
        }))
      if (validLosses.length > 0) {
        const { error: lossError } = await supabase.from('report_losses').insert(validLosses)
        if (lossError) throw lossError
      }
      router.push(`/reports/${reportId}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '保存に失敗しました'
      if (msg.includes('unique') || msg.includes('duplicate')) {
        setError('この日付の日報はすでに存在します。')
      } else {
        setError(`保存に失敗しました: ${msg}`)
      }
      setSaving(false)
    }
  }

  // ItemTable は NewReportPageInner の外（下）で定義 → コンポーネント参照が安定し ProductSearchInput がアンマウントされない

  return (
    <AppLayout>
      <form
        onSubmit={handleSubmit}
        onKeyDown={e => {
          // Enterキーでフォーム送信しない（保存ボタンクリックのみ）
          // IME確定中かどうかに関わらず常に阻止する（IMEへの影響なし）
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') {
            e.preventDefault()
          }
        }}
        className="space-y-6 pb-20"
      >
        {/* ページヘッダー */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">製造日報 入力</h1>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? '保存中...' : '保存する'}
          </button>
        </div>

        {copiedFrom && (
          <div className="bg-green-50 border border-green-300 text-green-700 rounded-lg px-4 py-3 text-base">
            {copiedFrom} の日報をコピーしました。内容を確認・修正して保存してください。
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 text-base">
            {error}
          </div>
        )}

        {/* ═══ 基本情報 ═══ */}
        <div className="card">
          <h2 className="section-title">基本情報</h2>
          {/* datalist for staff autocomplete */}
          <datalist id="staff-list">
            {staffMembers.map(m => <option key={m.id} value={m.name} />)}
          </datalist>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="form-label">日付 <span className="text-red-500">*</span></label>
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
              <input type="text" value={event} onChange={e => setEvent(e.target.value)} placeholder="例：お盆" />
            </div>
            <div>
              <label className="form-label">朝礼当番</label>
              <input type="text" list="staff-list" value={morningDuty} onChange={e => setMorningDuty(e.target.value)} placeholder="担当者名を選択または入力" />
            </div>
            <div>
              <label className="form-label">記入者 <span className="text-red-500">*</span></label>
              <input type="text" list="staff-list" value={writer} onChange={e => setWriter(e.target.value)} placeholder="氏名を選択または入力" required />
            </div>
          </div>
        </div>

        {/* ═══ 商品テーブル B（製造品） ═══ */}
        <ItemTable
          section="B"
          items={items}
          setItems={setItems}
          products={products}
          handleItemChange={handleItemChange}
          addItem={addItem}
          removeItem={removeItem}
          loading={loading}
          totalAmountA={totalAmountA}
          totalAmountB={totalAmountB}
        />

        {/* ═══ 商品テーブル A（販売品） ═══ */}
        <ItemTable
          section="A"
          items={items}
          setItems={setItems}
          products={products}
          handleItemChange={handleItemChange}
          addItem={addItem}
          removeItem={removeItem}
          loading={loading}
          totalAmountA={totalAmountA}
          totalAmountB={totalAmountB}
        />

        {/* ═══ 合計 ═══ */}
        <div className="card bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 text-center border">
              <div className="text-sm text-gray-500">小計A</div>
              <div className="text-xl font-bold text-green-700 mt-1">{formatCurrency(totalAmountA)}</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center border">
              <div className="text-sm text-gray-500">小計B</div>
              <div className="text-xl font-bold text-blue-700 mt-1">{formatCurrency(totalAmountB)}</div>
            </div>
            <div className="bg-blue-100 rounded-xl p-4 text-center col-span-2">
              <div className="text-sm text-gray-600">本日の製造金額（A+B）</div>
              <div className="text-2xl font-bold text-blue-800 mt-1">{formatCurrency(totalManufacturingAmount)}</div>
            </div>
          </div>
        </div>

        {/* ═══ 労働時間詳細 ═══ */}
        <div className="card">
          <h2 className="section-title">労働時間</h2>

          {/* シフト別 */}
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-gray-500 mb-2">シフト別（残業）</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px] text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-600">
                    <th className="px-3 py-2 text-left w-20">区分</th>
                    <th className="px-3 py-2 text-center">終了時間</th>
                    <th className="px-3 py-2 text-center">残業時間</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {([['hayade', '早出'], ['part', 'パート'], ['late_shift', '遅番']] as const).map(([key, label]) => (
                    <tr key={key}>
                      <td className="px-3 py-2 font-medium text-gray-700">{label}</td>
                      <td className="px-2 py-1">
                        <input type="time" value={laborDetail.shifts[key].end_time} onChange={e => updateLaborShift(key, 'end_time', e.target.value)} className="text-center" />
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" value={laborDetail.shifts[key].overtime} onChange={e => updateLaborShift(key, 'overtime', e.target.value)} placeholder="0" step="0.5" min="0" className="text-right" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 時間帯別人数・名前 */}
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-gray-500 mb-2">時間帯別</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-600">
                    <th className="px-3 py-2 text-center w-16">時間</th>
                    <th className="px-3 py-2 text-center w-20">人数</th>
                    <th className="px-3 py-2 text-center w-24">実働時間</th>
                    <th className="px-3 py-2 text-left">名前</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {laborDetail.hour_groups.map((group, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 font-bold text-center text-blue-700">{group.label}</td>
                      <td className="px-2 py-1">
                        <input type="number" value={group.count} onChange={e => updateLaborGroup(idx, 'count', e.target.value)} placeholder="0" min="0" step="0.5" className="text-right" />
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" value={group.actual_hours} onChange={e => updateLaborGroup(idx, 'actual_hours', e.target.value)} placeholder="0" min="0" step="0.5" className="text-right" />
                      </td>
                      <td className="px-2 py-1">
                        <input type="text" list="staff-list" value={group.names} onChange={e => updateLaborGroup(idx, 'names', e.target.value)} placeholder="氏名を入力（複数可）" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 管理時間 */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-500 mb-2">内訳</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                ['president', '社長'],
                ['overtime', '残業'],
                ['early_morning', '早朝残業'],
                ['delivery', '配達時間'],
                ['other', 'その他'],
              ].map(([field, label]) => (
                <div key={field} className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 w-20 shrink-0">{label}</label>
                  <input
                    type="number"
                    value={laborDetail.management[field as keyof typeof laborDetail.management]}
                    onChange={e => updateLaborMgmt(field, e.target.value)}
                    placeholder="0"
                    step="0.5"
                    className="text-right"
                  />
                  <span className="text-sm text-gray-500">h</span>
                </div>
              ))}
            </div>
          </div>

          {/* 合計 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <div className="text-sm text-gray-500">総労働時間</div>
              <div className="text-2xl font-bold text-green-700 mt-1">{totalLaborHours.toFixed(1)} h</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <div className="text-sm text-gray-500">人時製造額</div>
              <div className="text-2xl font-bold text-purple-700 mt-1">{formatCurrency(laborProductivity)}</div>
              <div className="text-xs text-gray-400">製造金額 ÷ 総労働時間</div>
            </div>
          </div>
        </div>

        {/* ═══ 製造・仕込み情報 ═══ */}
        <div className="card">
          <h2 className="section-title">製造・仕込み情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">仕込み内容</label>
              <textarea value={notesPreparation} onChange={e => setNotesPreparation(e.target.value)} placeholder="本日の仕込み内容を記入" rows={4} />
            </div>
            <div>
              <label className="form-label">半製品</label>
              <textarea value={semiProducts} onChange={e => setSemiProducts(e.target.value)} placeholder="半製品の状況を記入" rows={4} />
            </div>
          </div>
        </div>

        {/* ═══ ロス記録 ═══ */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">製造ロス記録</h2>
            <button type="button" onClick={addLoss} className="btn-primary btn-sm">＋ 行を追加</button>
          </div>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-gray-100 text-sm text-gray-600">
                  <th className="px-3 py-2 text-left">商品名</th>
                  <th className="px-3 py-2 text-right w-36">製造ロス（円）</th>
                  <th className="px-3 py-2 text-right w-36">返品ロス（円）</th>
                  <th className="px-3 py-2 text-left">備考</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {losses.map((loss, idx) => (
                  <tr key={idx}>
                    <td className="px-2 py-2">
                      <ProductSearchInput
                        products={products}
                        value={loss.product_name}
                        onSelect={product => {
                          setLosses(prev => {
                            const next = [...prev]
                            next[idx] = { ...next[idx], product_name: product.name }
                            return next
                          })
                        }}
                        onChange={name => handleLossChange(idx, 'product_name', name)}
                      />
                    </td>
                    <td className="px-2 py-2"><input type="number" value={loss.manufacturing_loss_amount} onChange={e => handleLossChange(idx, 'manufacturing_loss_amount', e.target.value)} placeholder="0" min="0" className="text-right" /></td>
                    <td className="px-2 py-2"><input type="number" value={loss.return_loss_amount} onChange={e => handleLossChange(idx, 'return_loss_amount', e.target.value)} placeholder="0" min="0" className="text-right" /></td>
                    <td className="px-2 py-2"><input type="text" value={loss.notes} onChange={e => handleLossChange(idx, 'notes', e.target.value)} placeholder="備考" /></td>
                    <td className="px-2 py-2 text-center">
                      <button type="button" onClick={() => removeLoss(idx)} disabled={losses.length === 1} className="text-red-500 hover:text-red-700 disabled:text-gray-300 text-2xl p-1">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 border-t-2 border-red-100 pt-4 grid grid-cols-2 gap-4">
            <div className="bg-orange-50 rounded-xl p-4 text-center">
              <div className="text-sm text-gray-500">製造ロス合計</div>
              <div className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(totalLossAmount)}</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <div className="text-sm text-gray-500">返品ロス合計</div>
              <div className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalReturnLossAmount)}</div>
            </div>
          </div>
        </div>

        {/* ═══ 欠勤・公休 ═══ */}
        <div className="card">
          <h2 className="section-title">欠勤・公休</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['半休', absenceHalf, setAbsenceHalf],
              ['全休', absenceFull, setAbsenceFull],
              ['早退', absenceEarlyLeave, setAbsenceEarlyLeave],
              ['遅刻', absenceLate, setAbsenceLate],
            ].map(([label, value, setter]) => (
              <div key={label as string}>
                <label className="form-label">{label as string}</label>
                <input type="text" list="staff-list" value={value as string} onChange={e => (setter as React.Dispatch<React.SetStateAction<string>>)(e.target.value)} placeholder="氏名を選択または入力" />
              </div>
            ))}
          </div>
        </div>

        {/* ═══ その他情報 ═══ */}
        <div className="card">
          <h2 className="section-title">その他の情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">配達者</label>
              <input type="text" list="staff-list" value={deliveryPerson} onChange={e => setDeliveryPerson(e.target.value)} placeholder="氏名を選択または入力" />
            </div>
            <div>
              <label className="form-label">新商品開発</label>
              <textarea value={newProductDev} onChange={e => setNewProductDev(e.target.value)} placeholder="新商品開発の進捗など" rows={3} />
            </div>
          </div>
        </div>

        {/* ═══ 反省・行動指針・できごと ═══ */}
        <div className="card">
          <h2 className="section-title">本日の振り返り</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">本日の反省（翌日の朝礼で徹底）</label>
              <textarea value={reflection} onChange={e => setReflection(e.target.value)} placeholder="今日の振り返り・改善点" rows={5} />
            </div>
            <div>
              <label className="form-label">7つの行動指針</label>
              <textarea value={actionGuidelines} onChange={e => setActionGuidelines(e.target.value)} placeholder="実践した行動指針を記入" rows={5} />
            </div>
            <div>
              <label className="form-label">本日のできごと</label>
              <textarea value={dailyEvents} onChange={e => setDailyEvents(e.target.value)} placeholder="今日あった出来事・気づきなど" rows={5} />
            </div>
          </div>
        </div>

        {/* 保存ボタン */}
        <div className="flex gap-4 justify-end pb-4">
          <button type="button" onClick={() => router.back()} className="btn-secondary">キャンセル</button>
          <button type="submit" disabled={saving} className="btn-primary text-xl px-10 disabled:opacity-50">
            {saving ? '保存中...' : '日報を保存する'}
          </button>
        </div>
      </form>
    </AppLayout>
  )
}

// ─── ItemTable: トップレベルで定義（毎レンダーで関数参照が変わるのを防ぐ）
interface ItemTableProps {
  section: ItemSection
  items: ReportItemForm[]
  setItems: Dispatch<SetStateAction<ReportItemForm[]>>
  products: Product[]
  handleItemChange: (index: number, field: keyof ReportItemForm, value: string | number) => void
  addItem: (section: ItemSection) => void
  removeItem: (index: number) => void
  loading: boolean
  totalAmountA: number
  totalAmountB: number
}

function ItemTable({
  section, items, setItems, products, handleItemChange, addItem, removeItem, loading, totalAmountA, totalAmountB
}: ItemTableProps) {
  const sectionItems = items.map((item, idx) => ({ item, idx })).filter(({ item }) => item.section === section)
  const isB = section === 'B'

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title mb-0">
          <span className={`inline-block px-3 py-0.5 rounded-full text-white text-sm font-bold mr-2 ${isB ? 'bg-blue-600' : 'bg-green-600'}`}>
            {section}
          </span>
          {isB ? '製造品（小計B）' : '販売品（小計A）'}
        </h2>
        <button type="button" onClick={() => addItem(section)} className={`btn-sm ${isB ? 'btn-primary' : 'bg-green-600 text-white rounded-lg px-3 py-2 text-sm hover:bg-green-700'}`}>
          ＋ 行を追加
        </button>
      </div>

      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full min-w-[680px]">
          <thead>
            <tr className={`text-sm text-gray-600 ${isB ? 'bg-blue-50' : 'bg-green-50'}`}>
              <th className="px-3 py-3 text-left whitespace-nowrap min-w-[180px]">商品名</th>
              <th className="px-3 py-3 text-right w-32 whitespace-nowrap">単価（税込）</th>
              <th className="px-3 py-3 text-right w-24 whitespace-nowrap">数量</th>
              <th className="px-3 py-3 text-right w-32 whitespace-nowrap">金額</th>
              {isB && <>
                <th className="px-3 py-3 text-right w-24 whitespace-nowrap">製造回数</th>
                <th className="px-3 py-3 text-right w-28 whitespace-nowrap">製造人時</th>
                <th className="px-3 py-3 text-right w-28 whitespace-nowrap">包装人時</th>
              </>}
              <th className="px-3 py-3 text-center w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sectionItems.map(({ item, idx }) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-2 py-3 min-w-[200px]">
                  {loading ? <input type="text" placeholder="読み込み中..." disabled /> : (
                    <ProductSearchInput
                      products={products}
                      value={item.product_name}
                      onSelect={product => {
                        setItems(prev => {
                          const next = [...prev]
                          next[idx] = {
                            ...next[idx],
                            product_id: product.id,
                            product_name: product.name,
                            unit_price: product.unit_price,
                            amount: product.unit_price * toNumber(next[idx].quantity),
                          }
                          return next
                        })
                      }}
                      onChange={name => {
                        handleItemChange(idx, 'product_name', name)
                        handleItemChange(idx, 'product_id', '')
                      }}
                    />
                  )}
                </td>
                <td className="px-2 py-2">
                  <input type="number" value={item.unit_price} onChange={e => handleItemChange(idx, 'unit_price', e.target.value)} placeholder="0" min="0" className="text-right" />
                </td>
                <td className="px-2 py-2">
                  <input type="number" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} placeholder="0" min="0" className="text-right" />
                </td>
                <td className="px-2 py-2">
                  <div className="text-right font-semibold text-blue-700 text-lg py-3 px-2 bg-blue-50 rounded-lg">
                    {formatCurrency(toNumber(item.amount))}
                  </div>
                </td>
                {isB && <>
                  <td className="px-2 py-2">
                    <input type="number" value={item.production_count} onChange={e => handleItemChange(idx, 'production_count', e.target.value)} placeholder="0" min="0" className="text-right" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" value={item.manufacturing_hours} onChange={e => handleItemChange(idx, 'manufacturing_hours', e.target.value)} placeholder="0.0" min="0" step="0.5" className="text-right" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" value={item.packaging_hours} onChange={e => handleItemChange(idx, 'packaging_hours', e.target.value)} placeholder="0.0" min="0" step="0.5" className="text-right" />
                  </td>
                </>}
                <td className="px-2 py-2 text-center">
                  <button type="button" onClick={() => removeItem(idx)} disabled={items.length === 1} className="text-red-500 hover:text-red-700 disabled:text-gray-300 text-2xl p-1">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 pt-3 border-t flex justify-end">
        <div className={`rounded-xl px-6 py-3 text-center ${isB ? 'bg-blue-50' : 'bg-green-50'}`}>
          <span className="text-sm text-gray-500">小計{section}</span>
          <span className={`text-xl font-bold ml-3 ${isB ? 'text-blue-700' : 'text-green-700'}`}>
            {formatCurrency(isB ? totalAmountB : totalAmountA)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function NewReportPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewReportPageInner />
    </Suspense>
  )
}
