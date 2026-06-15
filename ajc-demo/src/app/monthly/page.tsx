'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppLayout from '@/components/layout/AppLayout'
import { formatCurrency, formatNumber } from '@/lib/utils'
import type { DailyReport, ReportItem } from '@/types'

interface ProductSummary {
  product_name: string
  total_quantity: number
  total_amount: number
  total_production_count: number
  total_manufacturing_hours: number
  total_packaging_hours: number
}

export default function MonthlyPage() {
  const supabase = createClient()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [reports, setReports] = useState<DailyReport[]>([])
  const [productSummaries, setProductSummaries] = useState<ProductSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMonthlyData()
  }, [year, month])

  const fetchMonthlyData = async () => {
    setLoading(true)
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

    const { data: reportData } = await supabase
      .from('daily_reports')
      .select('*')
      .gte('report_date', monthStart)
      .lte('report_date', monthEnd)
      .order('report_date', { ascending: true })

    setReports(reportData || [])

    // 商品別集計
    if (reportData && reportData.length > 0) {
      const reportIds = reportData.map((r: DailyReport) => r.id)
      const { data: itemData } = await supabase
        .from('report_items')
        .select('*')
        .in('report_id', reportIds)

      if (itemData) {
        const summaryMap = new Map<string, ProductSummary>()
        for (const item of itemData as ReportItem[]) {
          const key = item.product_name
          const existing = summaryMap.get(key) || {
            product_name: key,
            total_quantity: 0,
            total_amount: 0,
            total_production_count: 0,
            total_manufacturing_hours: 0,
            total_packaging_hours: 0,
          }
          summaryMap.set(key, {
            ...existing,
            total_quantity: existing.total_quantity + item.quantity,
            total_amount: existing.total_amount + item.amount,
            total_production_count: existing.total_production_count + item.production_count,
            total_manufacturing_hours: existing.total_manufacturing_hours + Number(item.manufacturing_hours),
            total_packaging_hours: existing.total_packaging_hours + Number(item.packaging_hours),
          })
        }
        setProductSummaries(
          Array.from(summaryMap.values()).sort((a, b) => b.total_amount - a.total_amount)
        )
      }
    } else {
      setProductSummaries([])
    }

    setLoading(false)
  }

  // 月次集計値
  const totalAmount = reports.reduce((s, r) => s + r.total_manufacturing_amount, 0)
  const totalLaborHours = reports.reduce((s, r) => s + Number(r.total_labor_hours), 0)
  const avgProductivity = totalLaborHours > 0 ? Math.round(totalAmount / totalLaborHours) : 0
  const totalLoss = reports.reduce((s, r) => s + r.total_loss_amount, 0)
  const totalReturnLoss = reports.reduce((s, r) => s + r.total_return_loss_amount, 0)

  // 月選択
  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

  // CSV出力
  const handleExportCSV = () => {
    const lines: string[] = []

    lines.push(`${year}年${month}月 月次集計レポート`)
    lines.push('')
    lines.push('■ サマリー')
    lines.push(`製造日数,${reports.length}日`)
    lines.push(`製造金額合計,${totalAmount}`)
    lines.push(`総労働時間,${totalLaborHours.toFixed(1)}`)
    lines.push(`平均人時製造額,${avgProductivity}`)
    lines.push(`製造ロス合計,${totalLoss}`)
    lines.push(`返品ロス合計,${totalReturnLoss}`)
    lines.push('')

    lines.push('■ 日別実績')
    lines.push('日付,記入者,天気,製造金額,総労働時間,人時製造額,製造ロス,返品ロス')
    for (const r of reports) {
      lines.push([
        r.report_date, r.writer, r.weather,
        r.total_manufacturing_amount,
        r.total_labor_hours,
        r.labor_productivity,
        r.total_loss_amount,
        r.total_return_loss_amount,
      ].join(','))
    }
    lines.push('')

    lines.push('■ 商品別集計')
    lines.push('商品名,数量合計,金額合計,製造回数,製造人時,包装人時')
    for (const p of productSummaries) {
      lines.push([
        p.product_name,
        p.total_quantity,
        p.total_amount,
        p.total_production_count,
        p.total_manufacturing_hours.toFixed(1),
        p.total_packaging_hours.toFixed(1),
      ].join(','))
    }

    const csv = lines.join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `月次集計_${year}年${month}月.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-800">📊 月次集計</h1>
          <div className="flex items-center gap-3">
            {/* 年月選択 */}
            <div className="flex items-center gap-2">
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="w-28"
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>{y}年</option>
                ))}
              </select>
              <select
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
                className="w-20"
              >
                {monthOptions.map(m => (
                  <option key={m} value={m}>{m}月</option>
                ))}
              </select>
            </div>
            <button onClick={handleExportCSV} className="btn-success">
              📥 CSV出力
            </button>
          </div>
        </div>

        {/* サマリーカード */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card h-28 animate-pulse bg-gray-100" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="summary-card">
                <div className="text-sm text-gray-500">製造日数</div>
                <div className="value">{reports.length}日</div>
                <div className="label">{year}年{month}月</div>
              </div>
              <div className="summary-card">
                <div className="text-sm text-gray-500">製造金額合計</div>
                <div className="value">{formatCurrency(totalAmount)}</div>
              </div>
              <div className="summary-card">
                <div className="text-sm text-gray-500">総労働時間</div>
                <div className="value">{totalLaborHours.toFixed(1)}h</div>
              </div>
              <div className="summary-card">
                <div className="text-sm text-gray-500">平均人時製造額</div>
                <div className="value">{formatCurrency(avgProductivity)}</div>
                <div className="label">製造金額 ÷ 総労働時間</div>
              </div>
              <div className="summary-card">
                <div className="text-sm text-gray-500">製造ロス合計</div>
                <div className="value text-orange-500">{formatCurrency(totalLoss)}</div>
              </div>
              <div className="summary-card">
                <div className="text-sm text-gray-500">返品ロス合計</div>
                <div className="value text-red-500">{formatCurrency(totalReturnLoss)}</div>
              </div>
            </div>

            {reports.length === 0 ? (
              <div className="card text-center py-12 text-gray-400">
                <div className="text-5xl mb-3">📭</div>
                <p className="text-lg">{year}年{month}月の日報データがありません</p>
              </div>
            ) : (
              <>
                {/* 商品別集計 */}
                <div className="card">
                  <h2 className="section-title">商品別集計</h2>
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>商品名</th>
                          <th className="text-right">数量合計</th>
                          <th className="text-right">金額合計</th>
                          <th className="text-right">構成比</th>
                          <th className="text-right">製造回数</th>
                          <th className="text-right">製造人時</th>
                          <th className="text-right">包装人時</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productSummaries.map(p => (
                          <tr key={p.product_name}>
                            <td className="font-medium">{p.product_name}</td>
                            <td className="text-right">{formatNumber(p.total_quantity)}</td>
                            <td className="text-right font-semibold text-blue-600">
                              {formatCurrency(p.total_amount)}
                            </td>
                            <td className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-500 h-2 rounded-full"
                                    style={{ width: `${totalAmount > 0 ? (p.total_amount / totalAmount * 100) : 0}%` }}
                                  />
                                </div>
                                <span>
                                  {totalAmount > 0 ? (p.total_amount / totalAmount * 100).toFixed(1) : 0}%
                                </span>
                              </div>
                            </td>
                            <td className="text-right">{p.total_production_count}回</td>
                            <td className="text-right">{p.total_manufacturing_hours.toFixed(1)}h</td>
                            <td className="text-right">{p.total_packaging_hours.toFixed(1)}h</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-blue-50 font-bold">
                          <td className="px-4 py-3">合計</td>
                          <td className="px-4 py-3 text-right">
                            {formatNumber(productSummaries.reduce((s, p) => s + p.total_quantity, 0))}
                          </td>
                          <td className="px-4 py-3 text-right text-blue-700">
                            {formatCurrency(totalAmount)}
                          </td>
                          <td className="px-4 py-3 text-right">100%</td>
                          <td className="px-4 py-3 text-right">
                            {productSummaries.reduce((s, p) => s + p.total_production_count, 0)}回
                          </td>
                          <td className="px-4 py-3 text-right">
                            {productSummaries.reduce((s, p) => s + p.total_manufacturing_hours, 0).toFixed(1)}h
                          </td>
                          <td className="px-4 py-3 text-right">
                            {productSummaries.reduce((s, p) => s + p.total_packaging_hours, 0).toFixed(1)}h
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* 日別実績 */}
                <div className="card">
                  <h2 className="section-title">日別実績</h2>
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>日付</th>
                          <th>天気</th>
                          <th>記入者</th>
                          <th className="text-right">製造金額</th>
                          <th className="text-right">労働時間</th>
                          <th className="text-right">人時製造額</th>
                          <th className="text-right">ロス</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map(r => (
                          <tr key={r.id}>
                            <td className="whitespace-nowrap">
                              {new Date(r.report_date + 'T00:00:00').toLocaleDateString('ja-JP', {
                                month: 'numeric', day: 'numeric', weekday: 'short'
                              })}
                            </td>
                            <td>{r.weather}</td>
                            <td>{r.writer}</td>
                            <td className="text-right font-medium text-blue-600">
                              {formatCurrency(r.total_manufacturing_amount)}
                            </td>
                            <td className="text-right">{Number(r.total_labor_hours).toFixed(1)}h</td>
                            <td className="text-right">{formatCurrency(r.labor_productivity)}</td>
                            <td className="text-right text-red-500">
                              {formatCurrency(r.total_loss_amount + r.total_return_loss_amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-blue-50 font-bold">
                          <td colSpan={3} className="px-4 py-3 text-right">合計</td>
                          <td className="px-4 py-3 text-right text-blue-700">{formatCurrency(totalAmount)}</td>
                          <td className="px-4 py-3 text-right">{totalLaborHours.toFixed(1)}h</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(avgProductivity)}</td>
                          <td className="px-4 py-3 text-right text-red-600">
                            {formatCurrency(totalLoss + totalReturnLoss)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
