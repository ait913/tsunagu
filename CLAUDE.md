# Tsunagu — プロジェクト固有メモ

親規約: [Muraki/CLAUDE.md](../../CLAUDE.md)

## プロジェクト要約

「救急車を呼ぶしかできなかった人」を「助けられる人」に変えるアプリ。AEDを届ける機能が最重要。

## 主要ドキュメント

- 基礎要件: `.designs/_pre/00-foundation.md`
- 画面遷移詳細: `.designs/_pre/01-screen-flows.md` (作成予定)
- 設計書: `.designs/<YYYYMMDD>-<feature-slug>.md` (Architect が作成)
- リサーチ結果: `.knowledge/research/` (法律・先行事例・救急データ全6本)

## 技術スタック (確定)

- Mobile: Expo (RN + TS)
- Backend: Hono + Prisma + PostgreSQL+PostGIS
- 認証: 自前JWT
- ホスティング: Appily (Coolify)
- 画像生成: Codex (Images-2/gpt-image-1) — Geminiより優位
- リサーチ: Gemini優先 (画像理解・PDF読み取り)

## ポータブル設計の鉄則

ベンダー固有SDKを使わない。DB_URL + JWT_SECRET + 環境変数の差し替えだけで他環境に移植可能。

NG: Supabase Auth/Realtime/Storage, Firebase Auth/Firestore, Vercel KV/Postgres, Cloudflare Workers KV, AWS Lambda/Cognito

## やらないこと (再掲、設計時に逸脱しない)

- 症状トリアージ (薬機法SaMD回避、Q助に deep link)
- 自動119発信 (法律+OS+消防庁の四重規制で不可)
- 病名予測・診断
- 全国一斉運用 (Coaido119の失敗パターン)
- 医療従事者の自己申告のみ運用 (民法709条リスク)

## デモ

119の代わりにデモ番号 `09039655913` にコールする (実装で `tel:` URLスキーム経由)。

## Appily

URL: `tsunagu.appily.run` (予定)
Coolify上でデプロイ。`appily` skill が使える。
