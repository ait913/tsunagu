# Tsunagu

> **「救急車を呼ぶしかできなかった人」を「助けられる人」に変える。**

日本のOHCA (院外心停止) 救命のボトルネックは「現着時間」ではなく「AED使用率4%」。
自宅で倒れたら助からない (生存率2.6%) を、AEDを届けて変えるアプリ。

## なに

- 一般人がSOSを発火 → 119コールしつつ、近隣の医療系学生・医療従事者・AED運搬役にプッシュ通知
- 発見者には音声LLMによるCPRガイド
- AED運搬役 (Tier3) が最寄りAEDを現場に届ける
- 救助者と発見者の双方向位置共有 (要請中のみ)

## 立ち位置

- 119を**邪魔しない**。119コールは確実に押させる
- 症状トリアージはやらない (Q助に deep link)
- 医療行為を提供しない (薬機法SaMD非該当)
- アプリは「人を呼ぶ + 道具を運ぶ + 行動を支える」サービス

## アーキテクチャ

| 層 | 技術 |
|---|---|
| Mobile | Expo + React Native + TypeScript |
| Backend | Hono + Prisma + PostgreSQL (PostGIS拡張) |
| 認証 | 自前JWT (JWT_SECRET env) |
| マップ | react-native-maps + AED N@VI データ |
| 通知 | Expo Push Notifications |
| 音声LLM | OpenAI Realtime API |
| ホスティング | Appily (Coolify) — 全環境変数で他環境にも移植可 |

## ポータブル設計

DB_URL + JWT_SECRET + 各種APIキー の env 差し替えだけで Vercel/Neon/Render/Fly.io/AWS に移植可能。
ベンダー固有SDK (Supabase Auth/Realtime, Firebase, Vercel KV 等) は使わない。

## ディレクトリ

```
tsunagu/
├─ backend/            Hono + Prisma + PostGIS バックエンド
├─ mobile/             Expo (React Native) モバイルアプリ
├─ docs/               LP・ブランド資料・ドキュメント
├─ .designs/           設計書 (Architect が書く)
│   └─ _pre/           設計前の整理ドキュメント
└─ .knowledge/         プロジェクト固有ナレッジ
    └─ research/       事前リサーチ結果 (法律・データ・先行事例)
```

## 開発体制

[Muraki/CLAUDE.md](../../CLAUDE.md) の AI 主導開発体制 (Leader / Researcher / Architect / Developer / Reviewer) で進める。

## ライセンス

未定 (MVP段階)。商用利用は調整中。
