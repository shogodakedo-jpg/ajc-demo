-- =============================================
-- 製造日報システム - Supabase スキーマ
-- =============================================

-- 商品マスタ
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  unit_price INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT '一般',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 日報ヘッダー
CREATE TABLE daily_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL,
  weather TEXT DEFAULT '',
  event TEXT DEFAULT '',
  morning_duty TEXT DEFAULT '',          -- 朝礼当番
  writer TEXT NOT NULL DEFAULT '',       -- 記入者
  notes_preparation TEXT DEFAULT '',    -- 仕込み内容
  semi_products TEXT DEFAULT '',        -- 半製品
  delivery_person TEXT DEFAULT '',      -- 配達者
  new_product_dev TEXT DEFAULT '',      -- 新商品開発
  absences TEXT DEFAULT '',             -- 欠勤・公休
  reflection TEXT DEFAULT '',           -- 本日の反省
  action_guidelines TEXT DEFAULT '',    -- 7つの行動指針
  daily_events TEXT DEFAULT '',         -- 本日のできごと
  -- 自動計算項目
  total_manufacturing_amount INTEGER NOT NULL DEFAULT 0,  -- 本日の製造金額
  total_labor_hours NUMERIC(6,2) NOT NULL DEFAULT 0,      -- 総労働時間
  labor_productivity NUMERIC(10,2) NOT NULL DEFAULT 0,    -- 人時製造額
  total_loss_amount INTEGER NOT NULL DEFAULT 0,           -- ロス金額
  total_return_loss_amount INTEGER NOT NULL DEFAULT 0,    -- 返品ロス金額
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_date)
);

-- 商品別入力行
CREATE TABLE report_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  unit_price INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  amount INTEGER NOT NULL DEFAULT 0,          -- 自動計算: unit_price × quantity
  production_count INTEGER NOT NULL DEFAULT 0, -- 製造回数
  manufacturing_hours NUMERIC(5,2) NOT NULL DEFAULT 0, -- 製造人時
  packaging_hours NUMERIC(5,2) NOT NULL DEFAULT 0,     -- 包装人時
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ロス記録
CREATE TABLE report_losses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL DEFAULT '',
  manufacturing_loss_amount INTEGER NOT NULL DEFAULT 0, -- 製造ロス
  return_loss_amount INTEGER NOT NULL DEFAULT 0,        -- 返品ロス
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- インデックス
-- =============================================
CREATE INDEX idx_daily_reports_date ON daily_reports(report_date DESC);
CREATE INDEX idx_daily_reports_writer ON daily_reports(writer);
CREATE INDEX idx_report_items_report_id ON report_items(report_id);
CREATE INDEX idx_report_items_product_name ON report_items(product_name);
CREATE INDEX idx_report_losses_report_id ON report_losses(report_id);
CREATE INDEX idx_products_sort_order ON products(sort_order);
CREATE INDEX idx_products_active ON products(is_active);

-- =============================================
-- updated_at 自動更新トリガー
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER daily_reports_updated_at
  BEFORE UPDATE ON daily_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- Row Level Security (RLS)
-- =============================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_losses ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは全データを読み書きできる
CREATE POLICY "authenticated_all" ON products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON daily_reports
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON report_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON report_losses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- サンプル商品データ
-- =============================================
INSERT INTO products (name, unit_price, category, sort_order) VALUES
  ('食パン', 280, 'パン', 1),
  ('クロワッサン', 180, 'パン', 2),
  ('あんパン', 150, 'パン', 3),
  ('メロンパン', 180, 'パン', 4),
  ('ショートケーキ', 450, 'ケーキ', 5),
  ('チョコケーキ', 420, 'ケーキ', 6),
  ('シュークリーム', 200, '洋菓子', 7),
  ('プリン', 180, '洋菓子', 8),
  ('どら焼き', 200, '和菓子', 9),
  ('大福', 150, '和菓子', 10);
