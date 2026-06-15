'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { formatCurrency, formatDateJP } from '@/lib/utils'
import type { DailyReport } from '@/types'

export default function ReportsListPage() {
  const supabase = createClient()
  const [reports, setReports] = useState<DailyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState({ dateFrom: '', dateTo: '', writer: '', productName: '' })

  const now = new Date()
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async (filters = search) => {
    setLoading(true)
    let query = supabase
      .from('daily_reports')
      .select('*')
      .order('report_date', { ascending: false })
      .limit(200)

    if (filters.dateFrom) query = query.gte('report_date', filters.dateFrom)
    if (filters.dateTo) query = query.lte('report_date', filters.dateTo)
    if (filters.writer) query = query.ilike('writer', `%${filters.writer}%`)

    let { data } = await query

    // 商品名フィルター（report_items経由）
    if (filters.productName && data) {
      const { data: itemData } = await supabase
        .from('report_items')
        .select('report_id')
        .ilike('product_name', `%${filters.productName}%`)
      const ids = new Set((itemData || []).map((i: { report_id: string }) => i.report_id))
      data = data.filter(r => ids.has(r.id))
    }

    setReports(data || [])
    setLoading(false)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchReports(search)
  }

  const handleReset = () => {
    const cleared = { dateFrom: '', dateTo: '', writer: '', productName: '' }
    setSearch(cleared)
    fetchReports(cleared)
  }

  // CSV出力
  const handleExportCSV = () => {
    const headers = ['日付', '天気', '行事', '朝礼当番', '記入者', '製造金額', '総労働時間', '人時製造額', '製造ロス', '返品ロス', '配達者', '欠勤・公休', '本日の反省']
    const rows = reports.map(r => [
      r.report_date,
      r.weather,
      r.event,
      r.morning_duty,
      r.writer,
      r.total_manufacturing_amount,
      r.total_labor_hours,
      r.labor_productivity,
      r.total_loss_amount,
      r.total_return_loss_amount,
      r.delivery_person,
      r.absences,
      `"${r.reflection?.replace(/"/g, '""') || ''}"`,
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `日報一覧_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">📋 日報一覧</h1>
          <div className="flex gap-3">
            <button onClick={handleExportCSV} className="btn-secondary btn-sm">
              📥 CSV出力
            </button>
            <Link href="/reports/new" className="btn-primary">
              ✏️ 新規入力
            </Link>
          </div>
        </div>

        {/* 検索フォーム */}
        <div className="card">
          <h2 className="section-title">絞り込み検索</h2>
          <form onSubmit={handleSearch} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="form-label">日付（開始）</label>
              <input
                type="date"
                value={search.dateFrom}
                onChange={e => setSearch(s => ({ ...s, dateFrom: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">日付（終了）</label>
              <input
                type="date"
                value={search.dateTo}
                onChange={e => setSearch(s => ({ ...s, dateTo: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">記入者</label>
              <input
                type="text"
                value={search.writer}
                onChange={e => setSearch(s => ({ ...s, writer: e.target.value }))}
                placeholder="氏名で検索"
              />
            </div>
            <div>
              <label className="form-label">商品名</label>
              <input
                type="text"
                value={search.productName}
                onChange={e => setSearch(s => ({ ...s, productName: e.target.value }))}
                placeholder="商品名で検索"
              />
            </div>
            <div className="col-span-2 md:col-span-4 flex gap-3 justify-end">
              <button type="button" onClick={handleReset} className="btn-secondary">
                リセット
              </button>
              <button type="submit" className="btn-primary">
                🔍 検索
              </button>
            </div>
          </form>
        </div>

        {/* 件数表示 */}
        <div className="text-base text-gray-500">
          {loading ? '読み込み中...' : `${reports.length}件の日報`}
        </div>

        {/* 日報一覧テーブル */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-lg">🔄 読み込み中...</div>
          ) : reports.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-lg">該当する日報がありません</p>
              <Link href="/reports/new" className="btn-primary mt-4 inline-flex">
                日報を入力する
              </Link>
            </div>
          ) : (
            <div className="table-responsive rounded-none border-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>日付</th>
                    <th>天気</th>
                    <th>記入者</th>
                    <th className="text-right">製造金額</th>
                    <th className="text-right">総労働時間</th>
                    <th className="text-right">人時製造額</th>
                    <th className="text-right">ロス合計</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r.id}>
                      <td className="font-medium whitespace-nowrap">
                        {formatDateJP(r.report_date)}
                      </td>
                      <td>{r.weather}</td>
                      <td>{r.writer}</td>
                      <td className="text-right font-semibold text-blue-600">
                        {formatCurrency(r.total_manufacturing_amount)}
                      </td>
                      <td className="text-right">
                        {Number(r.total_labor_hours).toFixed(1)}h
                      </td>
                      <td className="text-right">
                        {formatCurrency(r.labor_productivity)}
                      </td>
                      <td className="text-right text-red-500">
                        {formatCurrency(r.total_loss_amount + r.total_return_loss_amount)}
                      </td>
                      <td>
                        <Link href={`/reports/${r.id}`} className="btn-secondary btn-sm whitespace-nowrap">
                          詳細 →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* フッター合計行 */}
                <tfoot>
                  <tr className="bg-blue-50 font-bold">
                    <td colSpan={3} className="px-4 py-3 text-right text-gray-600">合計</td>
                    <td className="px-4 py-3 text-right text-blue-700">
                      {formatCurrency(reports.reduce((s, r) => s + r.total_manufacturing_amount, 0))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {reports.reduce((s, r) => s + Number(r.total_labor_hours), 0).toFixed(1)}h
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(() => {
                        const totalAmt = reports.reduce((s, r) => s + r.total_manufacturing_amount, 0)
                        const totalH = reports.reduce((s, r) => s + Number(r.total_labor_hours), 0)
                        return formatCurrency(totalH > 0 ? Math.round(totalAmt / totalH) : 0)
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      {formatCurrency(reports.reduce((s, r) => s + r.total_loss_amount + r.total_return_loss_amount, 0))}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
