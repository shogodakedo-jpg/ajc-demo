// Basic types
export type Weather = 'sunny' | 'cloudy' | 'rain' | 'snow' | 'sunny_cloudy' | 'cloudy_rain'
export type ItemSection = 'A' | 'B'

export interface Product {
  id: string
  name: string
  reading: string | null  // ふりがな（ひらがな）
  unit_price: number
  category: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LaborHourGroup {
  label: string
  count: string
  actual_hours: string
  names: string
}

export interface LaborDetail {
  shifts: {
    hayade: { end_time: string; overtime: string }
    part: { end_time: string; overtime: string }
    late_shift: { end_time: string; overtime: string }
  }
  hour_groups: LaborHourGroup[]
  management: {
    president: string
    overtime: string
    early_morning: string
    delivery: string
    other: string
  }
}

export interface DailyReport {
  id: string
  report_date: string
  weather: string
  event: string
  morning_duty: string
  writer: string
  notes_preparation: string
  semi_products: string
  delivery_person: string
  new_product_dev: string
  absences: string
  absence_half: string
  absence_full: string
  absence_early_leave: string
  absence_late: string
  reflection: string
  action_guidelines: string
  daily_events: string
  total_manufacturing_amount: number
  total_labor_hours: number
  labor_productivity: number
  total_loss_amount: number
  total_return_loss_amount: number
  labor_detail: LaborDetail | null
  created_by: string | null
  created_at: string
  updated_at: string
  report_items?: ReportItem[]
  report_losses?: ReportLoss[]
}

export interface ReportItem {
  id: string
  report_id: string
  product_id: string | null
  product_name: string
  unit_price: number
  quantity: number
  amount: number
  production_count: number
  manufacturing_hours: number
  packaging_hours: number
  section?: ItemSection
  sort_order: number
  created_at: string
}

export interface ReportLoss {
  id: string
  report_id: string
  product_name: string
  manufacturing_loss_amount: number
  return_loss_amount: number
  notes: string
  created_at: string
}

export interface StaffMember {
  id: string
  name: string
  is_active: boolean
  sort_order: number
  created_at: string
}

// Form types
export interface ReportItemForm {
  section?: ItemSection
  product_id: string | null
  product_name: string
  unit_price: number | string
  quantity: number | string
  amount: number
  production_count: number | string
  manufacturing_hours: number | string
  packaging_hours: number | string
}

export interface ReportLossForm {
  product_name: string
  manufacturing_loss_amount: number | string
  return_loss_amount: number | string
  notes: string
}

export interface DailyReportForm {
  report_date: string
  weather: string
  event: string
  morning_duty: string
  writer: string
  notes_preparation: string
  semi_products: string
  delivery_person: string
  new_product_dev: string
  absences: string
  absence_half: string
  absence_full: string
  absence_early_leave: string
  absence_late: string
  reflection: string
  action_guidelines: string
  daily_events: string
}

// Monthly summary types
export interface MonthlySummary {
  year: number
  month: number
  total_manufacturing_amount: number
  total_labor_hours: number
  avg_labor_productivity: number
  total_loss_amount: number
  report_count: number
  product_summaries: ProductSummary[]
}

export interface ProductSummary {
  product_name: string
  total_quantity: number
  total_amount: number
  total_production_count: number
}
