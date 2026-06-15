-- profilesテーブルにlogin_idカラム追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_id TEXT;
