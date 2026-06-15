# AJC 業務管理デモ

製造業向け 業務日報・生産管理システムのデモ版です。

## セットアップ手順

### 1. GitHubリポジトリを作成

1. https://github.com/new を開く
2. Repository name: `ajc-demo`
3. Private にチェック → **Create repository**
4. 表示されたコマンドを `C:\\Users\\user\\Desktop\\ajc-demo` で実行:

```bash
git init
git add -A
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/あなたのユーザー名/ajc-demo.git
git push -u origin main
```

### 2. Supabaseプロジェクトを作成（新規）

1. https://supabase.com → New project
2. プロジェクト名: `ajc-demo`
3. パスワードを設定してCreate
4. Settings > API から URL と anon key をコピー

### 3. DBスキーマを適用

Supabase > SQL Editor で `supabase/schema.sql` の内容を貼り付けて実行

### 4. デモユーザーを作成

Supabase > Authentication > Users > **Add user**:
- Email: `demo@ajc-demo.local`
- Password: `demo1234`
- Auto-confirm にチェック

### 5. サンプルデータを投入

```bash
# .env.local を設定
cp .env.local.example .env.local
# （SUPABASE_SERVICE_ROLE_KEY も追加で設定）
# seed.sql を Supabase SQL Editor で実行
# その後:
node supabase/seed_reports.js
```

### 6. Vercelにデプロイ

1. https://vercel.com → Add New Project
2. GitHubの `ajc-demo` リポジトリを選択
3. Environment Variables に以下を追加:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy ボタンをクリック

デプロイ完了後、発行されたURLをお客様に共有するだけです。

## デモの見せ方

1. URLを開く → ランディングページ（価値訴求）が表示される
2. 「🚀 デモを体験する」ボタンをクリック → 自動ログイン
3. ダッシュボード → 日報一覧 → 月次集計 の順に案内
4. スマホでも同じURLを開いてPWA対応をアピール
