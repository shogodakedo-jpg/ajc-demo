-- ================================================================
-- AJC デモ用シードデータ
-- Supabase SQL Editor で実行してください
-- ================================================================

-- ① デモユーザー作成（Supabase Authentication から手動で作成してください）
-- Email: demo@ajc-demo.local
-- Password: demo1234
-- ※ SQL では auth.users に直接挿入できないため、Supabase管理画面 > Authentication > Users > Add user から作成

-- ② stores テーブル（デモ用店舗）
INSERT INTO stores (id, name, code, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001', '山田製作所 本社工場', 'MAIN', true),
  ('00000000-0000-0000-0000-000000000002', '山田製作所 第2工場', 'PLANT2', true)
ON CONFLICT (id) DO NOTHING;

-- ③ products テーブル（汎用製造品）
INSERT INTO products (name, reading, unit_price, category, sort_order, is_active) VALUES
  ('精密部品A', 'せいみつぶひんえー', 2800, '製造品', 1, true),
  ('精密部品B', 'せいみつぶひんびー', 3500, '製造品', 2, true),
  ('組立製品X', 'くみたてせいひんえっくす', 12000, '製造品', 3, true),
  ('組立製品Y', 'くみたてせいひんわい', 18000, '製造品', 4, true),
  ('加工品α', 'かこうひんあるふぁ', 1500, '製造品', 5, true),
  ('加工品β', 'かこうひんべーた', 2200, '製造品', 6, true),
  ('標準セット', 'ひょうじゅんせっと', 8500, '販売品', 7, true),
  ('プレミアムセット', 'ぷれみあむせっと', 15000, '販売品', 8, true),
  ('補修部品キット', 'ほしゅうぶひんきっと', 4800, '販売品', 9, true),
  ('消耗品パック', 'しょうもうひんぱっく', 980, '販売品', 10, true)
ON CONFLICT DO NOTHING;

-- ④ staff_members テーブル
INSERT INTO staff_members (name, is_active, sort_order) VALUES
  ('山田 太郎', true, 1),
  ('鈴木 花子', true, 2),
  ('田中 次郎', true, 3),
  ('佐藤 三郎', true, 4),
  ('渡辺 由美', true, 5)
ON CONFLICT DO NOTHING;

-- ⑤ daily_reports + report_items（3ヶ月分 サンプル）
-- ※ report_items は日報IDが必要なため、以下は1件ずつINSERT WITH RETURNINGの形式
-- 実際のシードは seed_reports.js スクリプトを使用してください（README参照）

SELECT 'シードSQL実行完了。seed_reports.js を実行して日報データを投入してください。' AS message;
