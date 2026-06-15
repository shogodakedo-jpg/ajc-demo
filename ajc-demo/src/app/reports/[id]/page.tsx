'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { formatCurrency, formatDateJP, formatNumber } from '@/lib/utils'
import type { DailyReport, ReportItem, ReportLoss } from '@/types'

interface FullReport extends DailyReport {
  report_items: ReportItem[]
  report_losses: ReportLoss[]
}

export default function ReportDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [report, setReport] = useState<FullReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('daily_reports')
        .select(`
          *,
          report_items(*),
          report_losses(*)
        `)
        .eq('id', id)
        .single()
      setReport(data)
      setLoading(false)
    }
    if (id) fetch()
  }, [id])

  const handleDelete = async () => {
    if (!confirm('この日報を削除しますか？この操作は元に戻せません。')) return
    setDeleting(true)
    await supabase.from('daily_reports').delete().eq('id', id)
    router.push('/reports')
  }

  // CSV出力（この日報1件分）
  const handleExportCSV = () => {
    if (!report) return
    const lines: string[] = []

    lines.push('■ 基本情報')
    lines.push(`日付,${report.report_date}`)
    lines.push(`天気,${report.weather}`)
    lines.push(`行事,${report.event}`)
    lines.push(`朝礼当番,${report.morning_duty}`)
    lines.push(`記入者,${report.writer}`)
    lines.push('')
    lines.push('■ 商品別製造実績')
    lines.push('商品名,単価,数量,金額,製造回数,製造人時,包装人時')
    for (const item of report.report_items || []) {
      lines.push(`${item.product_name},${item.unit_price},${item.quantity},${item.amount},${item.production_count},${item.manufacturing_hours},${item.packaging_hours}`)
    }
    lines.push(`,,合計,${report.total_manufacturing_amount}`)
    lines.push('')
    lines.push('■ ロス記録')
    lines.push('商品名,製造ロス,返品ロス,備考')
    for (const loss of report.report_losses || []) {
      lines.push(`${loss.product_name},${loss.manufacturing_loss_amount},${loss.return_loss_amount},${loss.notes}`)
    }
    lines.push('')
    lines.push('■ 集計')
    lines.push(`製造金額,${report.total_manufacturing_amount}`)
    lines.push(`総労働時間,${report.total_labor_hours}`)
    lines.push(`人時製造額,${report.labor_productivity}`)
    lines.push(`製造ロス,${report.total_loss_amount}`)
    lines.push(`返品ロス,${report.total_return_loss_amount}`)

    const csv = lines.join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `日報_${report.report_date}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-400">🔄 読み込み中...</div>
      </div>
    </AppLayout>
  )

  if (!report) return (
    <AppLayout>
      <div className="text-center py-20 text-gray-400">
        <div className="text-5xl mb-4">❌</div>
        <p className="text-xl">日報が見つかりません</p>
        <Link href="/reports" className="btn-primary mt-4 inline-flex">一覧に戻る</Link>
      </div>
    </AppLayout>
  )

  const totalLaborHours = Number(report.total_labor_hours)
  const totalLoss = report.total_loss_amount + report.total_return_loss_amount

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/reports" className="text-blue-600 hover:underline text-base">
              ← 日報一覧
            </Link>
            <h1 className="text-2xl font-bold text-gray-800 mt-1">
              {formatDateJP(report.report_date)} の日報
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleExportCSV} className="btn-secondary btn-sm">
              📥 CSV
            </button>
            <Link href={`/reports/new?from=${id}`} className="btn-success btn-sm">
              📋 この日報をコピー
            </Link>
            <Link href={`/reports/${id}/edit`} className="btn-primary btn-sm">
              ✏️ 編集
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn-danger btn-sm"
            >
              🗑️ 削除
            </button>
          </div>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="summary-card">
            <div className="text-sm text-gray-500">製造金額</div>
            <div className="value">{formatCurrency(report.total_manufacturing_amount)}</div>
          </div>
          <div className="summary-card">
            <div className="text-sm text-gray-500">総労働時間</div>
            <div className="value">{totalLaborHours.toFixed(1)}h</div>
          </div>
          <div className="summary-card">
            <div className="text-sm text-gray-500">人時製造額</div>
            <div className="value">{formatCurrency(report.labor_productivity)}</div>
          </div>
          <div className="summary-card">
            <div className="text-sm text-gray-500">ロス金額</div>
            <div className="value text-red-500">{formatCurrency(totalLoss)}</div>
          </div>
        </div>

        {/* 基本情報 */}
        <div className="card">
          <h2 className="section-title">基本情報</h2>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 text-base">
            {[
              ['日付', formatDateJP(report.report_date)],
              ['天気', report.weather],
              ['行事', report.event || '—'],
              ['朝礼当番', report.morning_duty || '—'],
              ['記入者', report.writer],
              ['配達者', report.delivery_person || '—'],
              ['欠勤・公休', report.absences || '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-gray-500 text-sm">{label}</dt>
                <dd className="font-medium text-gray-800 mt-0.5">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* 商品別製造実績 */}
        <div className="card">
          <h2 className="section-title">商品別製造実績</h2>
          {report.report_items && report.report_items.length > 0 ? (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>商品名</th>
                    <th className="text-right">単価</th>
                    <th className="text-right">数量</th>
                    <th className="text-right">金額</th>
                    <th className="text-right">製造回数</th>
                    <th className="text-right">製造人時</th>
                    <th className="text-right">包装人時</th>
                  </tr>
                </thead>
                <tbody>
                  {report.report_items
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map(item => (
                      <tr key={item.id}>
                        <td className="font-medium">{item.product_name}</td>
                        <td className="text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="text-right">{formatNumber(item.quantity)}</td>
                        <td className="text-right font-semibold text-blue-600">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="text-right">{item.production_count}回</td>
                        <td className="text-right">{item.manufacturing_hours}h</td>
                        <td className="text-right">{item.packaging_hours}h</td>
                      </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50 font-bold">
                    <td colSpan={3} className="px-4 py-3 text-right">合計</td>
                    <td className="px-4 py-3 text-right text-blue-700">
                      {formatCurrency(report.total_manufacturing_amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {report.report_items.reduce((s, i) => s + i.production_count, 0)}回
                    </td>
                    <td className="px-4 py-3 text-right">
                      {report.report_items.reduce((s, i) => s + Number(i.manufacturing_hours), 0).toFixed(1)}h
                    </td>
                    <td className="px-4 py-3 text-right">
                      {report.report_items.reduce((s, i) => s + Number(i.packaging_hours), 0).toFixed(1)}h
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-gray-400">商品データなし</p>
          )}
        </div>

        {/* ロス記録 */}
        {report.report_losses && report.report_losses.length > 0 && (
          <div className="card">
            <h2 className="section-title">ロス記録</h2>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>商品名</th>
                    <th className="text-right">製造ロス</th>
                    <th className="text-right">返品ロス</th>
                    <th>備考</th>
                  </tr>
                </thead>
                <tbody>
                  {report.report_losses.map(loss => (
                    <tr key={loss.id}>
                      <td>{loss.product_name || '—'}</td>
                      <td className="text-right text-orange-600">
                        {formatCurrency(loss.manufacturing_loss_amount)}
                      </td>
                      <td className="text-right text-red-600">
                        {formatCurrency(loss.return_loss_amount)}
                      </td>
                      <td>{loss.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-red-50 font-bold">
                    <td className="px-4 py-3 text-right">合計</td>
                    <td className="px-4 py-3 text-right text-orange-600">
                      {formatCurrency(report.total_loss_amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      {formatCurrency(report.total_return_loss_amount)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* テキスト情報 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            ['仕込み内容', report.notes_preparation],
            ['半製品', report.semi_products],
            ['新商品開発', report.new_product_dev],
            ['本日の反省', report.reflection],
            ['7つの行動指針', report.action_guidelines],
            ['本日のできごと', report.daily_events],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label} className="card">
              <h3 className="text-base font-semibold text-gray-600 mb-2">{label}</h3>
              <p className="text-gray-800 whitespace-pre-wrap">{value || '—'}</p>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
