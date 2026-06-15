// =============================================
// ユーティリティ関数
// =============================================

/** 金額をカンマ区切り表示 */
export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`
}

/** 数値をカンマ区切り表示 */
export function formatNumber(n: number): string {
  return n.toLocaleString('ja-JP')
}

/** 日付を日本語表示 (例: 2024年1月15日(月)) */
export function formatDateJP(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const dayNames = ['日', '月', '火', '水', '木', '金', '土']
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const dow = dayNames[date.getDay()]
  return `${y}年${m}月${d}日(${dow})`
}

/** 今日の日付を YYYY-MM-DD 形式で返す */
export function todayString(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** YYYY-MM-DD を YYYY年MM月DD日 に変換 */
export function formatDateSimple(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${y}年${parseInt(m)}月${parseInt(d)}日`
}

/** 小数点以下を適切に表示（.0は省略）*/
export function formatHours(hours: number): string {
  return hours % 1 === 0 ? `${hours}時間` : `${hours}時間`
}

/** CSVエスケープ */
export function csvEscape(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/** 数値変換（空文字・NaN は 0 に）*/
export function toNumber(val: string | number | undefined | null): number {
  if (val === '' || val === null || val === undefined) return 0
  const n = Number(val)
  return isNaN(n) ? 0 : n
}
