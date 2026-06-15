-- productsテーブルにふりがな（reading）カラム追加
ALTER TABLE products ADD COLUMN IF NOT EXISTS reading TEXT;
