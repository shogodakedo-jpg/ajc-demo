'use client'

import Link from 'next/link'

const features = [
  {
    icon: '✏️',
    title: '日報をスマホで入力',
    desc: '紙の日報をデジタル化。スマホ・タブレットからいつでも入力でき、提出漏れを防止。',
  },
  {
    icon: '📊',
    title: 'リアルタイム集計',
    desc: '製造金額・ロス金額・人時生産性が自動計算。月次レポートも1クリック。',
  },
  {
    icon: '🔍',
    title: '商品別・月別の分析',
    desc: '売れ筋商品、ロスが多い工程、生産性の低い日を可視化して改善につなげる。',
  },
  {
    icon: '👥',
    title: '複数拠点・権限管理',
    desc: '本店・支店など複数店舗に対応。管理者とスタッフで表示できる情報を分離。',
  },
  {
    icon: '📱',
    title: 'PWA対応（アプリのように使える）',
    desc: 'ホーム画面に追加すればアプリと同じ感覚で使用可能。インストール不要。',
  },
  {
    icon: '🔒',
    title: 'セキュアなクラウド管理',
    desc: 'データはSupabase（PostgreSQL）で安全に管理。バックアップも自動。',
  },
]

const problems = [
  '紙の日報が山積みで集計に時間がかかる',
  '製造ロスがどこで発生しているか分からない',
  '人時生産性を毎日把握できていない',
  '月次レポートをExcelで手作りしている',
  '日報の提出状況が管理者から見えない',
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ─── ヘッダー ─── */}
      <header className="bg-blue-900 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <div className="font-bold text-xl">AJC 業務管理デモ</div>
          <div className="text-blue-300 text-xs">powered by AJC</div>
        </div>
        <Link href="/login" className="bg-white text-blue-900 font-bold px-5 py-2 rounded-lg text-sm hover:bg-blue-50 transition-colors">
          ログイン
        </Link>
      </header>

      {/* ─── ヒーロー ─── */}
      <section className="bg-gradient-to-br from-blue-900 to-blue-700 text-white py-20 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="text-6xl mb-6">🏭</div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            製造現場の日報を<br />デジタル化して<br className="md:hidden" />生産性を上げる
          </h1>
          <p className="text-blue-100 text-xl mb-10 leading-relaxed">
            紙の日報・Excelから卒業。<br />
            製造金額・ロス・人時生産性をリアルタイムで把握できる<br />
            クラウド業務管理システムです。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login?guest=1"
              className="bg-yellow-400 text-blue-900 font-bold text-xl px-10 py-5 rounded-2xl hover:bg-yellow-300 transition-colors shadow-lg"
            >
              🚀 無料デモを体験する
              <div className="text-sm font-normal mt-1">登録不要・1クリックで入れます</div>
            </Link>
            <Link
              href="/login"
              className="bg-white bg-opacity-20 text-white font-semibold text-lg px-8 py-5 rounded-2xl hover:bg-opacity-30 transition-colors border border-white border-opacity-40"
            >
              ログイン
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 課題提起 ─── */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 text-center mb-10">
            こんなお悩みはありませんか？
          </h2>
          <div className="space-y-4">
            {problems.map((p, i) => (
              <div key={i} className="flex items-start gap-4 bg-white rounded-xl p-5 shadow-sm border border-red-100">
                <span className="text-red-500 text-2xl mt-0.5">😓</span>
                <p className="text-gray-700 text-lg">{p}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <div className="text-4xl font-bold text-blue-700">↓ このシステムで解決できます</div>
          </div>
        </div>
      </section>

      {/* ─── 機能一覧 ─── */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 text-center mb-12">
            主な機能
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-base leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 数字で見る効果 ─── */}
      <section className="py-16 px-6 bg-blue-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-12">導入効果のイメージ</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-5xl font-bold text-yellow-400 mb-2">80%</div>
              <div className="text-blue-200 text-lg">集計作業の削減</div>
              <div className="text-blue-300 text-sm mt-1">月次集計が自動化</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-yellow-400 mb-2">即日</div>
              <div className="text-blue-200 text-lg">ロス原因の把握</div>
              <div className="text-blue-300 text-sm mt-1">翌月待ちが当日に</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-yellow-400 mb-2">100%</div>
              <div className="text-blue-200 text-lg">日報提出率</div>
              <div className="text-blue-300 text-sm mt-1">未提出アラートで管理</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
            まずは実際に触ってみてください
          </h2>
          <p className="text-gray-500 text-lg mb-10">
            サンプルデータ入りのデモ環境をご用意しています。<br />
            登録・インストール不要で、すぐに体験できます。
          </p>
          <Link
            href="/login?guest=1"
            className="inline-block bg-yellow-400 text-blue-900 font-bold text-2xl px-12 py-6 rounded-2xl hover:bg-yellow-300 transition-colors shadow-xl"
          >
            🚀 デモを体験する（無料）
          </Link>
          <p className="text-gray-400 text-sm mt-4">導入・カスタマイズのご相談は AJC まで</p>
        </div>
      </section>

      {/* ─── フッター ─── */}
      <footer className="bg-gray-800 text-gray-400 text-center py-6 text-sm">
        <p>AJC 業務管理デモシステム — このシステムはデモ用サンプルです</p>
        <p className="mt-1">© 2025 AJC. All rights reserved.</p>
      </footer>
    </div>
  )
}
