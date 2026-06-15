-- =============================================
-- v2 マイグレーション
-- 店舗・ユーザープロファイル・権限管理
-- ※ Supabase SQL Editor で実行してください
-- =============================================

-- ─────────────────────────────────────────
-- 1. 店舗マスタ
-- ─────────────────────────────────────────
CREATE TABLE stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- サンプル店舗
INSERT INTO stores (name) VALUES ('本店');

-- ─────────────────────────────────────────
-- 2. ユーザープロファイル (auth.users を拡張)
-- ─────────────────────────────────────────
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  store_id UUID REFERENCES stores(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 新規ユーザー登録時にプロファイルを自動作成
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  first_store_id UUID;
BEGIN
  SELECT id INTO first_store_id FROM stores ORDER BY created_at LIMIT 1;
  INSERT INTO profiles (id, full_name, role, store_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff'),
    first_store_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────
-- 3. 既存テーブルに store_id を追加
-- ─────────────────────────────────────────
ALTER TABLE daily_reports ADD COLUMN store_id UUID REFERENCES stores(id);
ALTER TABLE products ADD COLUMN store_id UUID REFERENCES stores(id);

-- 既存データを本店に紐付け
UPDATE daily_reports SET store_id = (SELECT id FROM stores LIMIT 1);
UPDATE products SET store_id = (SELECT id FROM stores LIMIT 1);

-- ─────────────────────────────────────────
-- 4. RLS ポリシーを更新
-- ─────────────────────────────────────────
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- stores: 認証済みユーザーは読み取り可、admin のみ書き込み可
CREATE POLICY "stores_read" ON stores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "stores_admin_write" ON stores
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- profiles: 自分のプロファイルは読み書き可、admin は全員分読み書き可
CREATE POLICY "profiles_own" ON profiles
  FOR ALL TO authenticated
  USING (id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- daily_reports: 同店舗のデータのみ操作可
DROP POLICY IF EXISTS "authenticated_all" ON daily_reports;
CREATE POLICY "daily_reports_store" ON daily_reports
  FOR ALL TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM profiles WHERE id = auth.uid()
    ) OR store_id IS NULL
  )
  WITH CHECK (
    store_id IN (
      SELECT store_id FROM profiles WHERE id = auth.uid()
    ) OR store_id IS NULL
  );

-- products: 同店舗のデータのみ操作可
DROP POLICY IF EXISTS "authenticated_all" ON products;
CREATE POLICY "products_store" ON products
  FOR ALL TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM profiles WHERE id = auth.uid()
    ) OR store_id IS NULL
  )
  WITH CHECK (
    store_id IN (
      SELECT store_id FROM profiles WHERE id = auth.uid()
    ) OR store_id IS NULL
  );

-- ─────────────────────────────────────────
-- 5. 既存ユーザーにプロファイルを作成
--    (既にユーザーが存在する場合のみ必要)
-- ─────────────────────────────────────────
INSERT INTO profiles (id, full_name, role, store_id)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  'admin',  -- 既存ユーザーは管理者にする
  (SELECT id FROM stores LIMIT 1)
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;
