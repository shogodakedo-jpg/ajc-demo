'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { formatCurrency, formatDateJP, todayString } from '@/lib/utils'
import type { DailyReport } from '@/types'

interface DashboardStats {
  monthAmount: number
  monthDays: number
  monthLoss: number
  avgProductivity: number
  recentReports: DailyReport[]
  todayExists: boolean
}

export default function Dashboard() {
  const supabase = createClient()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const today = todayString()
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  useEffect(() => {
    const fetchStats = async () => {
      const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
      const monthEnd = new Date(currentYear, currentMonth, 0)
        .toISOString().split('T')[0]

      const [{ data: reports }, { data: todayReport }] = await Promise.all([
        supabase
          .from('daily_reports')
          .select('*')
          .gte('report_date', monthStart)
          .lte('report_date', monthEnd)
          .order('report_date', { ascending: false }),
        supabase
          .from('daily_reports')
          .select('id')
          .eq('report_date', today)
          .single(),
      ])

      if (reports) {
        const monthAmount = reports.reduce((s, r) => s + (r.total_manufacturing_amount || 0), 0)
        const monthLoss = reports.reduce((s, r) => s + (r.total_loss_amount || 0) + (r.total_return_loss_amount || 0), 0)
        const totalHours = reports.reduce((s, r) => s + (r.total_labor_hours || 0), 0)
        const avgProductivity = totalHours > 0 ? Math.round(monthAmount / totalHours) : 0

        setStats({
          monthAmount,
          monthDays: reports.length,
          monthLoss,
          avgProductivity,
          recentReports: reports.slice(0, 5),
          todayExists: !!todayReport,
        })
      }
      setLoading(false)
    }
    fetchStats()
  }, [])

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">ダッシュボード</h1>
            <p className="text-gray-500 text-base mt-1">
              {currentYear}年{currentMonth}月 — {formatDateJP(today)}
            </p>
          </div>
          {!loading && !stats?.todayExists && (
            <Link href="/reports/new" className="btn-primary">
              ✏️ 本日の日報を入力
            </Link>
          )}
          {!loading && stats?.todayExists && (
            <Link href="/reports" className="btn-success">
              ✅ 本日の日報 入力済み
            </Link>
          )}
        </div>

        {/* 月次サマリーカード */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card animate-pulse h-28 bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="summary-card">
              <div className="text-sm text-gray-500">今月の製造金額</div>
              <div className="value text-2xl">{formatCurrency(stats?.monthAmount || 0)}</div>
              <div className="label">{currentMonth}月累計</div>
            </div>
            <div className="summary-card">
              <div className="text-sm text-gray-500">今月の営業日数</div>
              <div className="value text-2xl">{stats?.monthDays || 0}日</div>
              <div className="label">日報提出日数</div>
            </div>
            <div className="summary-card">
              <div className="text-sm text-gray-500">人時製造額（平均）</div>
              <div className="value text-2xl">{formatCurrency(stats?.avgProductivity || 0)}</div>
              <div className="label">製造金額 ÷ 総労働時間</div>
            </div>
            <div className="summary-card">
              <div className="text-sm text-gray-500">今月の総ロス金額</div>
              <div className="value text-2xl text-red-500">{formatCurrency(stats?.monthLoss || 0)}</div>
              <div className="label">製造ロス + 返品ロス</div>
            </div>
          </div>
        )}

        {/* クイックアクション */}
        <div className="card">
          <h2 className="section-title">クイックアクション</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/reports/new" className="btn-primary flex-col gap-1 py-5">
              <span className="text-3xl">✏️</span>
              <span className="text-base">日報入力</span>
            </Link>
            <Link href="/reports" className="btn-secondary flex-col gap-1 py-5">
              <span className="text-3xl">📋</span>
              <span className="text-base">日報一覧</span>
            </Link>
            <Link href="/monthly" className="btn-secondary flex-col gap-1 py-5">
              <span className="text-3xl">📊</span>
              <span className="text-base">月次集計</span>
            </Link>
            <Link href="/admin/products" className="btn-secondary flex-col gap-1 py-5">
              <span className="text-3xl">🛒</span>
              <span className="text-base">商品マスタ</span>
            </Link>
          </div>
        </div>

        {/* 直近の日報 */}
        <div className="card">
          <h2 className="section-title">直近の日報</h2>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : stats?.recentReports && stats.recentReports.length > 0 ? (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>日付</th>
                    <th>記入者</th>
                    <th>天気</th>
                    <th className="text-right">製造金額</th>
                    <th className="text-right">ロス金額</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentReports.map((r) => (
                    <tr key={r.id}>
                      <td className="font-medium">{formatDateJP(r.report_date)}</td>
                      <td>{r.writer}</td>
                      <td>{r.weather}</td>
                      <td className="text-right font-medium text-blue-600">
                        {formatCurrency(r.total_manufacturing_amount)}
                      </td>
                      <td className="text-right text-red-500">
                        {formatCurrency(r.total_loss_amount + r.total_return_loss_amount)}
                      </td>
                      <td>
                        <Link
                          href={`/reports/${r.id}`}
                          className="btn-secondary btn-sm"
                        >
                          詳細
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-lg">今月の日報はまだありません</p>
              <Link href="/reports/new" className="btn-primary mt-4 inline-flex">
                最初の日報を入力する
              </Link>
            </div>
          )}
          {stats?.recentReports && stats.recentReports.length > 0 && (
            <div className="mt-4 text-right">
              <Link href="/reports" className="text-blue-600 hover:underline text-base">
                すべての日報を見る →
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
