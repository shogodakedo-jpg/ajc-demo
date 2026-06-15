// ================================================================
// AJC デモ用 日報サンプルデータ投入スクリプト
// 使い方: node supabase/seed_reports.js
// 事前に .env.local の SUPABASE_SERVICE_ROLE_KEY が必要
// ================================================================
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const products = [
  { name: '精密部品A', unit_price: 2800, section: 'B' },
  { name: '精密部品B', unit_price: 3500, section: 'B' },
  { name: '組立製品X', unit_price: 12000, section: 'B' },
  { name: '組立製品Y', unit_price: 18000, section: 'B' },
  { name: '加工品α',   unit_price: 1500,  section: 'B' },
  { name: '標準セット', unit_price: 8500, section: 'A' },
  { name: 'プレミアムセット', unit_price: 15000, section: 'A' },
  { name: '補修部品キット', unit_price: 4800, section: 'A' },
]

const writers = ['山田 太郎', '鈴木 花子', '田中 次郎', '佐藤 三郎']
const weathers = ['晴れ', '晴れ', '晴れ', '曇り', '曇り', '雨']
const events = ['', '', '', '設備点検', '新人研修', '得意先訪問', '', '棚卸', '']

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatDate(d) { return d.toISOString().split('T')[0] }

async function seed() {
  console.log('🌱 サンプルデータ投入開始...')

  // 過去90日分（土日除く）
  const today = new Date()
  let current = addDays(today, -90)
  let count = 0

  while (current <= today) {
    const dow = current.getDay()
    if (dow === 0 || dow === 6) { current = addDays(current, 1); continue }

    const date = formatDate(current)

    // 日報作成
    const totalLaborHours = rand(40, 80) + rand(0, 9) * 0.5
    const totalMfgAmount = rand(300000, 800000)
    const lossAmount = rand(0, 30000)

    const { data: report, error: repErr } = await supabase
      .from('daily_reports')
      .insert({
        report_date: date,
        weather: pick(weathers),
        event: pick(events),
        morning_duty: pick(writers),
        writer: pick(writers),
        notes_preparation: '仕込み完了。材料在庫良好。',
        semi_products: '',
        delivery_person: pick(writers),
        total_manufacturing_amount: totalMfgAmount,
        total_labor_hours: totalLaborHours,
        labor_productivity: Math.round(totalMfgAmount / totalLaborHours),
        total_loss_amount: lossAmount,
        total_return_loss_amount: rand(0, 10000),
        reflection: count % 5 === 0 ? '段取りに時間がかかった。手順の見直しが必要。' : '概ね順調。',
        action_guidelines: '品質第一・安全確認・整理整頓',
        daily_events: count % 3 === 0 ? '設備の動作確認を実施。異常なし。' : '',
        absence_half: rand(0, 1) === 1 ? '1' : '',
        absence_full: '',
        absence_early_leave: '',
        absence_late: '',
      })
      .select()
      .single()

    if (repErr) { console.error(date, repErr.message); current = addDays(current, 1); continue }

    // 製造品アイテム (section B)
    const bProducts = products.filter(p => p.section === 'B').slice(0, rand(2, 4))
    for (const p of bProducts) {
      const qty = rand(5, 50)
      await supabase.from('report_items').insert({
        report_id: report.id,
        product_name: p.name,
        unit_price: p.unit_price,
        quantity: qty,
        amount: p.unit_price * qty,
        production_count: rand(1, 5),
        manufacturing_hours: rand(2, 8) + rand(0, 1) * 0.5,
        packaging_hours: rand(1, 4) + rand(0, 1) * 0.5,
        section: 'B',
        sort_order: 1,
      })
    }

    // 販売品アイテム (section A)
    const aProducts = products.filter(p => p.section === 'A').slice(0, rand(1, 3))
    for (const p of aProducts) {
      const qty = rand(3, 30)
      await supabase.from('report_items').insert({
        report_id: report.id,
        product_name: p.name,
        unit_price: p.unit_price,
        quantity: qty,
        amount: p.unit_price * qty,
        production_count: 0,
        manufacturing_hours: 0,
        packaging_hours: 0,
        section: 'A',
        sort_order: 2,
      })
    }

    // ロス記録（たまに）
    if (rand(0, 3) === 0) {
      await supabase.from('report_losses').insert({
        report_id: report.id,
        product_name: pick(['精密部品A', '加工品α', '組立製品X']),
        manufacturing_loss_amount: rand(1000, 15000),
        return_loss_amount: rand(0, 5000),
        notes: pick(['寸法不良', '表面傷', '動作不良', '返品対応']),
      })
    }

    count++
    if (count % 10 === 0) process.stdout.write(`  ${count}件完了...\r`)
    current = addDays(current, 1)
  }

  console.log(`\n✅ 完了！ ${count}件の日報を投入しました`)
}

seed().catch(console.error)
