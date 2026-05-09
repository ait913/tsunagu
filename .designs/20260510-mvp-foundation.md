---
title: Tsunagu MVP — Foundation Design (実装で迷わない詳細設計)
date: 2026-05-10
author: Architect
status: ドラフト (ユーザー承認待ち)
inputs:
  - .designs/_pre/00-foundation.md
  - .designs/_pre/01-screen-flows.md
  - .knowledge/research/*.md (6本)
  - CLAUDE.md (parent + project)
target_repo: /Users/touri/Documents/Creatives/Developments/Muraki/projects/tsunagu/
---

# Tsunagu MVP — Foundation Design

> Reviewer はこの設計書からテストを生成する。Developer はこの設計書から実装する。
> 「実装で迷う余地」を残さないことが本書の責務。

---

## 1. 概要・スコープ

### 1.1 アプリ要約 (3行)
Tsunagu は、目の前で人が倒れた現場で **(a) AED運搬役を半径400m以内に呼び寄せる**、**(b) 医療系学生・医療者を救助者として呼び寄せる**、**(c) 発見者を音声LLMで CPR ガイド** する Expo ネイティブアプリ。
医療判断は提供しない (薬機法 SaMD 非該当)。119 通報を代替せず補完する。
データに基づき「住宅 OHCA で AED が届かない」という最大ボトルネックの解消に focus。

### 1.2 MVP スコープ

#### 含む (P0)
- 認証: 自前 JWT (access 1h / refresh 30d)
- Tier 登録 (書類アップロード→手動審査キュー、メール通知)
- SOS 発火 (3秒キャンセル猶予 + 症状4選択)
- 救助モード (発見者用 RM-F)、CPR 音声 LLM ガイド (OpenAI Realtime API)
- 救助者通知 (NOTI-R) と AED 運搬通知 (NOTI-A) の2系統分離配信
- 半径400m → 1km → 5km 自動拡大配信 (1分後 / 3分後)
- 双方向位置共有 (要請中のみ、終了で破棄)
- AED N@VI データインポート (PostGIS 空間検索)
- 引き継ぎ (HOFF) と終了 (END)
- 三層免責同意ログ + 監査ログ (訴訟自衛資料)
- デモモード (env `EXPO_PUBLIC_DEMO_NUMBER=09039655913` でコール先切替、サーバ側 `?demo=true`)
- iOS/Android (Expo EAS 内部配布)
- バックエンド: Coolify (Appily) Dockerfile デプロイ

#### 含まない (スコープ外)
- 症状トリアージ・病名予測 (薬機法回避、Q助 deep link)
- 自動119発信 (法律で不可)
- 119 指令センター連携
- ライブ映像中継
- 全国一斉運用 (1区密度ファースト)
- 医療従事者の自己申告のみ運用 (書類審査必須)
- AED 自前 DB 構築 (AED N@VI を採用)
- 課金・有料機能
- ライトモード (緊急UIは黒地+白文字+赤アクセントで固定)
- F2/F3/F4 の症状別ガイド差 (MVP は全て RM-F に遷移、コンテンツの差別化は v1.5)

### 1.3 完了条件チェックリスト

- [ ] iOS/Android 両プラットフォームで Expo Dev Client で動作
- [ ] 認証フロー (登録→ログイン→Tier 申請→審査承認 メール通知) が動く
- [ ] HOME→CD→SYM→RM-F→HOFF→END の発見者 E2E 動作
- [ ] NOTI-R→NAV-R→HOFF→RM-R の救助者 E2E 動作
- [ ] NOTI-A→NAV-A→AED-PICK の AED 運搬 E2E 動作
- [ ] 119 コールが `tel:` で起動 (デモ時は 09039655913)
- [ ] CPR 音声ガイドが起動・継続・AED 到着で AED-G に自動遷移
- [ ] AED N@VI データが PostGIS で半径検索でき、地図に表示される
- [ ] 規約三層免責表示 + ConsentLog 永続化
- [ ] AuditLog に各操作 (SOS発火/応答/引継/終了) が記録される
- [ ] 半径自動拡大 (400m→1分後1km→3分後5km) が動作
- [ ] デモモードがサーバ側で別フラグで分離される (本番データ汚染なし)
- [ ] Reviewer 生成シナリオテスト 19 本のうち P0 (主要動線) が GREEN
- [ ] Coolify (Appily) で `tsunagu.appily.run` にデプロイされ、Mobile から疎通

---

## 2. ディレクトリ構造

```
tsunagu/
├─ backend/
│   ├─ src/
│   │   ├─ index.ts                    # Hono エントリ
│   │   ├─ env.ts                      # zod による env validation
│   │   ├─ db/
│   │   │   ├─ client.ts               # Prisma client singleton
│   │   │   └─ migrations/             # prisma/migrations への shim
│   │   ├─ middleware/
│   │   │   ├─ auth.ts                 # JWT verify + ctx に user 注入
│   │   │   ├─ demo.ts                 # ?demo=true 判定 + ctx.demo 注入
│   │   │   ├─ audit.ts                # 各 mutation を AuditLog に書く
│   │   │   └─ error.ts                # AppError → JSON response
│   │   ├─ routes/
│   │   │   ├─ auth.ts                 # /auth/*
│   │   │   ├─ tier.ts                 # /tier/*
│   │   │   ├─ sos.ts                  # /sos/*
│   │   │   ├─ rescue.ts               # /rescue/*
│   │   │   ├─ aed.ts                  # /aed/*
│   │   │   ├─ notification.ts         # /notification/*
│   │   │   └─ admin.ts                # /admin/* (Tier 審査用、後追い)
│   │   ├─ services/
│   │   │   ├─ jwt.ts                  # sign / verify (HS256)
│   │   │   ├─ password.ts             # bcrypt
│   │   │   ├─ s3.ts                   # @aws-sdk/client-s3 (S3 / MinIO 互換)
│   │   │   ├─ push.ts                 # Expo Push (expo-server-sdk)
│   │   │   ├─ mailer.ts               # Resend SDK
│   │   │   ├─ geo.ts                  # PostGIS 経由の半径検索
│   │   │   ├─ dispatch.ts             # 通知配信ロジック (半径自動拡大)
│   │   │   ├─ session.ts              # RescueSession state machine
│   │   │   └─ aedNaviImporter.ts      # CSV→AedDevice
│   │   ├─ ws/
│   │   │   ├─ server.ts               # ws (Hono compatible) サーバ起動
│   │   │   ├─ rooms.ts                # rescueId ごとの room 管理
│   │   │   └─ events.ts               # event 型定義 (発信/受信)
│   │   └─ realtime/
│   │       └─ broker.ts               # in-memory pub/sub (将来 Redis 差替可)
│   ├─ prisma/
│   │   ├─ schema.prisma
│   │   └─ seed.ts                     # AED N@VI CSV import + テストユーザー
│   ├─ __tests__/
│   │   ├─ unit/                       # service 単体
│   │   ├─ integration/                # Supertest x route
│   │   └─ scenario/                   # 19 シナリオ E2E (DB はテストコンテナ)
│   ├─ Dockerfile
│   ├─ package.json
│   ├─ tsconfig.json
│   └─ vitest.config.ts
│
├─ mobile/
│   ├─ src/
│   │   ├─ App.tsx
│   │   ├─ navigation/
│   │   │   ├─ RootNavigator.tsx       # Expo Router or React Navigation
│   │   │   └─ types.ts
│   │   ├─ screens/
│   │   │   ├─ home/HomeScreen.tsx
│   │   │   ├─ sos/CountdownScreen.tsx
│   │   │   ├─ sos/SymptomScreen.tsx
│   │   │   ├─ rescue/RescueModeFinderScreen.tsx
│   │   │   ├─ rescue/RescueModeResponderScreen.tsx
│   │   │   ├─ rescue/AedGuideScreen.tsx
│   │   │   ├─ rescue/HandoffScreen.tsx
│   │   │   ├─ rescue/EndScreen.tsx
│   │   │   ├─ responder/NotificationResponderScreen.tsx
│   │   │   ├─ responder/NavResponderScreen.tsx
│   │   │   ├─ responder/AbandonScreen.tsx
│   │   │   ├─ aedCarrier/NotificationAedScreen.tsx
│   │   │   ├─ aedCarrier/NavAedScreen.tsx
│   │   │   ├─ aedCarrier/AedPickScreen.tsx
│   │   │   ├─ profile/ProfileScreen.tsx
│   │   │   ├─ profile/TierRegistrationScreen.tsx
│   │   │   ├─ permission/PermissionScreen.tsx
│   │   │   ├─ onboarding/WelcomeScreen.tsx
│   │   │   ├─ onboarding/AgreeScreen.tsx
│   │   │   └─ onboarding/RoleSelectScreen.tsx
│   │   ├─ components/
│   │   │   ├─ EmergencyButton.tsx
│   │   │   ├─ SymptomIcon.tsx
│   │   │   ├─ TimerDisplay.tsx
│   │   │   ├─ MetronomeView.tsx
│   │   │   ├─ MapWithMarkers.tsx
│   │   │   ├─ ActionSlideButton.tsx
│   │   │   ├─ TierBadge.tsx
│   │   │   └─ DismissibleCard.tsx
│   │   ├─ stores/
│   │   │   ├─ authStore.ts
│   │   │   ├─ sosStore.ts
│   │   │   ├─ rescueStore.ts
│   │   │   ├─ notificationStore.ts
│   │   │   └─ appStore.ts
│   │   ├─ services/
│   │   │   ├─ api/
│   │   │   │   ├─ client.ts           # fetch wrapper + JWT auto-refresh
│   │   │   │   ├─ auth.ts
│   │   │   │   ├─ sos.ts
│   │   │   │   ├─ rescue.ts
│   │   │   │   ├─ tier.ts
│   │   │   │   └─ aed.ts
│   │   │   ├─ ws/
│   │   │   │   └─ rescueSocket.ts     # WebSocket client
│   │   │   ├─ notifications/
│   │   │   │   ├─ register.ts         # Expo Push token 取得
│   │   │   │   └─ handler.ts          # 通知タップ→画面遷移 router
│   │   │   ├─ audio/
│   │   │   │   ├─ cprGuide.ts         # OpenAI Realtime API client
│   │   │   │   ├─ metronome.ts        # expo-av で 100bpm tick 再生
│   │   │   │   └─ fallback.ts         # オフライン時の録音済 mp3 再生
│   │   │   └─ location/
│   │   │       └─ tracker.ts          # expo-location 監視+送信
│   │   ├─ hooks/
│   │   │   ├─ useAuth.ts
│   │   │   ├─ useRescueSocket.ts
│   │   │   └─ useCprGuide.ts
│   │   ├─ theme/
│   │   │   ├─ colors.ts
│   │   │   ├─ typography.ts
│   │   │   └─ spacing.ts
│   │   └─ utils/
│   │       ├─ haptics.ts
│   │       ├─ a11y.ts
│   │       └─ formatTime.ts
│   ├─ assets/
│   │   ├─ audio/                      # CPR 音声フォールバック (.mp3)
│   │   ├─ icons/
│   │   └─ animations/                 # Lottie or Reanimated
│   ├─ __tests__/
│   │   ├─ unit/
│   │   ├─ integration/
│   │   └─ e2e/                        # Maestro flows (.yaml)
│   ├─ app.json
│   ├─ eas.json
│   ├─ package.json
│   ├─ tsconfig.json
│   └─ vitest.config.ts
│
├─ docker-compose.yaml                 # ローカル: postgres+postgis, minio, mailhog
├─ .env.example
├─ CLAUDE.md
└─ README.md
```

---

## 3. データモデル (Prisma schema 完全版)

`backend/prisma/schema.prisma`

```prisma
// ──────────────────────────────────────────────────────────────────
// generator / datasource
// ──────────────────────────────────────────────────────────────────

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [postgis]
}

// ──────────────────────────────────────────────────────────────────
// enums
// ──────────────────────────────────────────────────────────────────

enum Tier {
  TIER1   // 医療従事者
  TIER2   // 医療系学生
  TIER3   // AED運搬役
}

enum TierAppStatus {
  PENDING
  REVIEWING
  APPROVED
  REJECTED
}

enum Symptom {
  NO_BREATHING
  NO_CONSCIOUSNESS
  BLEEDING
  OTHER
}

enum SosStatus {
  ACTIVE       // 発火中
  CANCELLED    // 3秒猶予内 or 発見者キャンセル
  ENDED        // 救急隊引継 or タイムアウト
}

enum RescueRole {
  RESPONDER     // Tier1/Tier2 (現場到着+CPR交代)
  AED_CARRIER   // Tier3 (AED 運搬)
}

enum ResponderStatus {
  ASSIGNED      // 通知配信済
  ACCEPTED      // 「向かう」回答
  ENROUTE       // 移動中 (位置共有開始)
  ARRIVED       // 現場到着
  HANDED_OFF    // 引き継ぎ完了
  CANCELLED     // 「無理」or 諦めた
}

enum HandoffKind {
  RESPONDER_TO_RESPONDER  // 発見者→医療者
  AED_DELIVERED           // AED 運搬役→現場
  TO_EMS                  // 救助者→救急隊
}

enum AuditAction {
  USER_REGISTERED
  USER_LOGGED_IN
  TIER_APPLIED
  TIER_APPROVED
  TIER_REJECTED
  SOS_FIRED
  SOS_CANCELLED
  RESPONDER_NOTIFIED
  RESPONDER_ACCEPTED
  RESPONDER_DECLINED
  RESPONDER_ARRIVED
  HANDOFF_RECORDED
  RESCUE_ENDED
  CONSENT_RECORDED
}

// ──────────────────────────────────────────────────────────────────
// User
// ──────────────────────────────────────────────────────────────────

model User {
  id              String   @id @default(cuid())
  email           String   @unique
  passwordHash    String
  displayName     String
  phone           String?

  /// null: 未申請 or 申請中
  /// 値あり: 直近に承認された Tier (TierApplication.APPROVED と整合)
  currentTier     Tier?

  /// 平常時の通知受信可否 (PROFILE 画面で ON/OFF)
  notificationOptIn Boolean @default(true)

  /// 通知半径 (m)。デフォルト 400。選択肢: 400, 1000, 5000
  notificationRadiusM Int   @default(400)

  /// Expo Push token (デバイス1台想定。複数なら Devices テーブルに分離)
  expoPushToken   String?

  /// 規約同意の最新版バージョン番号 (ConsentLog で履歴管理)
  agreedTermsVersion Int? 

  /// MVP は単一デバイス想定だが、ロール分離のため
  /// "発見者だけで使う" のフラグを別途持つ
  finderOnlyMode  Boolean  @default(false)

  /// デモモード使用フラグ (UI 表示制御)
  demoEnabled     Boolean  @default(false)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  applications    TierApplication[]
  sosFired        Sos[]                 @relation("FinderSos")
  responses       Responder[]
  handoffsFrom    HandoffEvent[]        @relation("HandoffFrom")
  handoffsTo      HandoffEvent[]        @relation("HandoffTo")
  consents        ConsentLog[]
  auditLogs       AuditLog[]

  @@index([currentTier])
  @@index([notificationOptIn])
}

// ──────────────────────────────────────────────────────────────────
// TierApplication (書類アップロード+審査ログ)
// ──────────────────────────────────────────────────────────────────

model TierApplication {
  id          String         @id @default(cuid())
  userId      String
  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  requestedTier Tier
  status        TierAppStatus @default(PENDING)

  /// S3 (or MinIO) に保存した書類画像のオブジェクトキー (1枚以上)
  documentKeys  String[]

  /// 申請時の自由記述 (例: 所属大学, 役職)
  note          String?

  /// 審査者 (運営側、admin user の id)。MVP は手動運用
  reviewedBy    String?
  reviewedAt    DateTime?
  reviewerNote  String?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([userId])
  @@index([status])
}

// ──────────────────────────────────────────────────────────────────
// Sos (SOS 発火イベント)
// ──────────────────────────────────────────────────────────────────

model Sos {
  id          String     @id @default(cuid())
  finderId    String
  finder      User       @relation("FinderSos", fields: [finderId], references: [id])

  symptom     Symptom

  /// 自由記述 (現場プロファイル: マンション3F, 戸建て玄関 など)
  locationLabel String?

  /// PostGIS Point (lng, lat) SRID 4326
  /// Prisma は @db.Geography or Unsupported 経由で扱う
  geom        Unsupported("geography(Point, 4326)")

  /// 端末側で測位した精度 (m)
  accuracyM   Float?

  status      SosStatus  @default(ACTIVE)

  /// デモモードで発火した場合 true。集計から除外し別バケットへ
  isDemo      Boolean    @default(false)

  createdAt   DateTime   @default(now())
  cancelledAt DateTime?
  endedAt     DateTime?

  rescueSession RescueSession?

  @@index([status])
  @@index([finderId])
  @@index([createdAt])
  // PostGIS 空間 index は raw SQL マイグレーションで CREATE INDEX USING GIST(geom)
}

// ──────────────────────────────────────────────────────────────────
// RescueSession (1回の救助イベントの集約ルート)
// ──────────────────────────────────────────────────────────────────

model RescueSession {
  id            String       @id @default(cuid())
  sosId         String       @unique
  sos           Sos          @relation(fields: [sosId], references: [id], onDelete: Cascade)

  /// 採用された AED (運搬完了時に確定)
  aedDeviceId   String?
  aedDevice     AedDevice?   @relation(fields: [aedDeviceId], references: [id])

  /// 配信ラウンド (0=400m, 1=1km, 2=5km) — dispatch service が更新
  dispatchRound Int          @default(0)

  /// 状態スナップショット (state machine)
  /// "PENDING" | "RESPONDER_ACCEPTED" | "RESPONDER_ARRIVED" | "AED_ARRIVED" | "HANDED_OFF" | "ENDED"
  state         String       @default("PENDING")

  isDemo        Boolean      @default(false)

  createdAt     DateTime     @default(now())
  endedAt       DateTime?

  responders    Responder[]
  handoffs      HandoffEvent[]

  @@index([state])
  @@index([sosId])
}

// ──────────────────────────────────────────────────────────────────
// Responder (救助者 / AED 運搬役の応答ログ)
// ──────────────────────────────────────────────────────────────────

model Responder {
  id            String          @id @default(cuid())
  sessionId     String
  session       RescueSession   @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  userId        String
  user          User            @relation(fields: [userId], references: [id])

  role          RescueRole       // RESPONDER or AED_CARRIER
  status        ResponderStatus  @default(ASSIGNED)

  /// 通知時点でのユーザー位置 (距離計算用、要請中のみ保存、終了で NULL 化)
  notifiedGeom  Unsupported("geography(Point, 4326)")?

  /// 直近の現在位置 (要請中のみ保存、終了で NULL 化)
  currentGeom   Unsupported("geography(Point, 4326)")?

  /// 最後に位置更新を受信した時刻
  lastPingedAt  DateTime?

  /// ETA (秒)。Maps API 経由 or ハバーサイン+徒歩4km/h 概算
  etaSec        Int?

  notifiedAt    DateTime         @default(now())
  acceptedAt    DateTime?
  arrivedAt     DateTime?
  cancelledAt   DateTime?

  @@index([sessionId, role])
  @@index([userId])
  @@index([status])
  @@unique([sessionId, userId, role])
}

// ──────────────────────────────────────────────────────────────────
// AedDevice (AED N@VI からインポート)
// ──────────────────────────────────────────────────────────────────

model AedDevice {
  id            String   @id @default(cuid())
  /// AED N@VI 固有 ID (CSV の primary)
  externalId    String   @unique

  name          String
  manufacturer  String?
  model         String?
  installedAt   String?  // 設置場所のラベル
  address       String?
  hours         String?  // 利用可能時間 (例: "24時間" "平日9-17時")
  indoor        Boolean? @default(true)

  /// PostGIS Point (lng, lat) SRID 4326
  geom          Unsupported("geography(Point, 4326)")

  /// CC BY 3.0 (商用OK) 由来表記。レンダリング時に必ず attribution 表示
  sourceLicense String   @default("AED N@VI / CC BY 3.0")

  importedAt    DateTime @default(now())
  updatedAt     DateTime @updatedAt

  rescues       RescueSession[]

  @@index([externalId])
  // 空間 index: raw SQL で CREATE INDEX aed_geom_idx ON "AedDevice" USING GIST(geom)
}

// ──────────────────────────────────────────────────────────────────
// HandoffEvent (引き継ぎ記録)
// ──────────────────────────────────────────────────────────────────

model HandoffEvent {
  id          String         @id @default(cuid())
  sessionId   String
  session     RescueSession  @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  kind        HandoffKind
  fromUserId  String?
  toUserId    String?
  fromUser    User?          @relation("HandoffFrom", fields: [fromUserId], references: [id])
  toUser      User?          @relation("HandoffTo",   fields: [toUserId],   references: [id])

  /// AED_DELIVERED の時、運搬された AedDevice
  aedDeviceId String?

  note        String?        // 「救急隊到着」「医学生に交代」など free text

  occurredAt  DateTime       @default(now())

  @@index([sessionId])
  @@index([occurredAt])
}

// ──────────────────────────────────────────────────────────────────
// ConsentLog (規約同意ログ)
// ──────────────────────────────────────────────────────────────────

model ConsentLog {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  /// 三層の何層目を同意したか
  /// "STORE_PAGE" | "ONBOARDING" | "IN_APP_HELP"
  layer         String

  termsVersion  Int

  /// 同意時の IP (善意救護の自衛資料)
  ipAddress     String?
  userAgent     String?

  agreedAt      DateTime @default(now())

  @@index([userId])
  @@index([termsVersion])
}

// ──────────────────────────────────────────────────────────────────
// AuditLog (操作ログ、訴訟自衛資料)
// ──────────────────────────────────────────────────────────────────

model AuditLog {
  id          String       @id @default(cuid())
  userId      String?
  user        User?        @relation(fields: [userId], references: [id], onDelete: SetNull)

  action      AuditAction
  /// 関連リソース ID (sos / rescueSession / responder / tierApp 等)
  resourceId  String?
  resourceType String?

  /// 自由形式 JSON (リクエスト要約・差分など)
  payload     Json?

  ipAddress   String?
  userAgent   String?

  createdAt   DateTime     @default(now())

  @@index([userId])
  @@index([action])
  @@index([createdAt])
  @@index([resourceId])
}
```

### 3.1 PostGIS 空間インデックス (raw SQL マイグレーション)

`prisma/migrations/<ts>_postgis/migration.sql`

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE INDEX sos_geom_gist        ON "Sos"        USING GIST (geom);
CREATE INDEX aed_geom_gist        ON "AedDevice"  USING GIST (geom);
CREATE INDEX responder_curr_gist  ON "Responder"  USING GIST (currentGeom);
CREATE INDEX responder_notif_gist ON "Responder"  USING GIST (notifiedGeom);
```

---

## 4. API 仕様 (REST + WebSocket)

すべて `Content-Type: application/json` 。エラーは `{ error: { code, message, details? } }` 形式。

### 4.1 認証関連

#### `POST /auth/register`

```ts
// Request
type RegisterReq = {
  email: string;        // RFC5322
  password: string;     // 8文字以上、英数字混在
  displayName: string;  // 1〜50文字
  phone?: string;       // E.164 (省略可)
  agreedTermsVersion: number;  // 同意した規約バージョン
};

// Response 201
type RegisterRes = {
  user: { id: string; email: string; displayName: string; currentTier: null };
  accessToken: string;     // 1h
  refreshToken: string;    // 30d
};

// Errors
// 400 VALIDATION   入力エラー
// 409 EMAIL_TAKEN  既存メール
```

#### `POST /auth/login`

```ts
type LoginReq  = { email: string; password: string };
type LoginRes  = { user: UserSummary; accessToken: string; refreshToken: string };
// 401 INVALID_CREDENTIALS
```

#### `POST /auth/refresh`

```ts
type RefreshReq = { refreshToken: string };
type RefreshRes = { accessToken: string; refreshToken: string };
// 401 INVALID_REFRESH
```

#### `POST /auth/logout`

```ts
// 認証要 (Bearer)
// 200 OK { ok: true }
// (refreshToken は server 側 deny list には載せない MVP 簡略実装。期限切れで自然失効)
```

### 4.2 Tier 関連

#### `POST /tier/apply`

```ts
// Request: multipart/form-data
//   requestedTier: "TIER1" | "TIER2" | "TIER3"
//   note?: string
//   documents[]: File (1〜5枚, 各5MB以下, jpg/png/pdf)

// Response 201
type TierApplyRes = {
  application: {
    id: string;
    requestedTier: Tier;
    status: "PENDING";
    documentKeys: string[];   // S3 オブジェクトキー
    createdAt: string;
  };
};

// Errors
// 400 VALIDATION
// 400 FILE_TOO_LARGE
// 415 UNSUPPORTED_MEDIA
// 409 ALREADY_PENDING  // 同 Tier の申請が既に進行中
```

#### `GET /tier/status`

```ts
// Response
type TierStatusRes = {
  currentTier: Tier | null;
  pendingApplication: {
    id: string;
    requestedTier: Tier;
    status: TierAppStatus;
    createdAt: string;
    reviewerNote?: string;
  } | null;
  history: Array<{ requestedTier: Tier; status: TierAppStatus; reviewedAt: string | null }>;
};
```

#### `GET /tier/document/:key` (署名付き短期 URL リダイレクト)

- 認証要 (本人 or admin)
- 302 Redirect to signed URL (有効5分)

#### `POST /admin/tier/:applicationId/decision`

- admin 権限要 (env `ADMIN_EMAILS` に列挙したメール)

```ts
type DecisionReq = { decision: "APPROVED" | "REJECTED"; reviewerNote?: string };
// 副作用:
//   APPROVED → User.currentTier 更新 + AuditLog (TIER_APPROVED)
//             + Resend で承認メール送信
//   REJECTED → AuditLog (TIER_REJECTED) + Resend で却下メール送信
```

### 4.3 SOS 関連

#### `POST /sos`

```ts
// Auth 不要 (緊急時の登録前ユーザーも発火可能、ただし通知は受け取れない)
// が、MVP は **登録ユーザー必須** で実装 (Tier=null も発火可能)
// クエリ: ?demo=true でデモ扱い

type SosReq = {
  symptom: Symptom;             // "NO_BREATHING" 等
  lat: number;                  // -90..90
  lng: number;                  // -180..180
  accuracyM?: number;
  locationLabel?: string;       // "マンション3F" 等
};

type SosRes = {
  sos: {
    id: string;
    status: "ACTIVE";
    createdAt: string;
  };
  rescueSession: { id: string; state: "PENDING" };
  // 即時に dispatch service が走り、別プロセスで通知配信
};

// Errors
// 400 VALIDATION
// 429 TOO_MANY_REQUESTS  // 同一 user で過去60秒内に既に ACTIVE な SOS あり (二重発火防止)
```

#### `POST /sos/:id/cancel`

```ts
// 発見者本人のみ
// 200 { sos: { id, status: "CANCELLED" } }
// 409 NOT_ACTIVE  // 既に終了
```

#### `GET /sos/:id`

```ts
type SosDetailRes = {
  sos: {
    id: string;
    finderId: string;
    symptom: Symptom;
    lat: number;
    lng: number;
    locationLabel: string | null;
    status: SosStatus;
    isDemo: boolean;
    createdAt: string;
  };
  session: {
    id: string;
    state: string;
    dispatchRound: number;
    aedDevice: AedDeviceSummary | null;
    responders: ResponderSummary[];
  };
};
```

### 4.4 救助 (Rescue) 関連

#### `POST /rescue/:sessionId/respond`

通知タップ時に呼ぶ。`role` は通知種別と同じ (RESPONDER / AED_CARRIER)。

```ts
type RespondReq = {
  role: RescueRole;
  decision: "ACCEPT_WITH_AED" | "ACCEPT_BAREHAND" | "DECLINE";
  // ACCEPT_WITH_AED: NAV-A or NAV-R + AED 経由 (Tier3 のみ)
  // ACCEPT_BAREHAND: NAV-R 直行 (Tier1/2 や AED なし向かう)
  // DECLINE       : R2 罪悪感ゼロ画面へ
  lat?: number;          // 受諾時のみ必須 (位置共有開始)
  lng?: number;
};

type RespondRes = {
  responder: {
    id: string;
    status: ResponderStatus;
    role: RescueRole;
  };
  /// ACCEPT 時のみ: 表示用 navigation payload
  navigation?: {
    targetLat: number;
    targetLng: number;
    aed?: AedDeviceSummary;  // ACCEPT_WITH_AED 時に近接 AED 1件
    locationLabel?: string;
  };
};

// Errors
// 403 FORBIDDEN          // 通知対象外ユーザー
// 409 SESSION_ENDED      // 既に HANDED_OFF / ENDED
// 409 ALREADY_RESPONDED  // 同 user/role で既に応答済 (status を更新したいなら別 endpoint)
```

#### `PATCH /rescue/:sessionId/responder/:responderId/location`

位置共有 (HTTP fallback。本筋は WS で送る)

```ts
type LocReq = { lat: number; lng: number; etaSec?: number };
type LocRes = { ok: true };
// 副作用: WS 経由で発見者と他 responder に broadcast
```

#### `POST /rescue/:sessionId/handoff`

```ts
type HandoffReq = {
  kind: HandoffKind;
  toUserId?: string;   // RESPONDER_TO_RESPONDER の時必須
  note?: string;
};
type HandoffRes = { handoff: { id: string; occurredAt: string } };

// 副作用:
//   RESPONDER_TO_RESPONDER  → from の responder.status=HANDED_OFF, to=ARRIVED
//   AED_DELIVERED           → session.aedDeviceId 確定, session.state="AED_ARRIVED"
//                             + 発見者画面 AED-G に WS push
//   TO_EMS                  → session.state="HANDED_OFF" → 終了画面誘導
```

#### `POST /rescue/:sessionId/end`

```ts
type EndReq = { reason: "EMS_HANDED" | "FINDER_ENDED" | "TIMEOUT" };
type EndRes = { session: { id: string; state: "ENDED"; endedAt: string } };

// 副作用:
//   - session.state="ENDED", endedAt=now()
//   - 全 responder.currentGeom / notifiedGeom を NULL
//   - WS room を 5 分後にクローズ (位置情報破棄期限)
//   - 統計は集計テーブルに退避 (本実装は v1.5 でも可、MVP は AuditLog に最小記録)
```

### 4.5 マップ・AED 関連

#### `GET /aed/nearby?lat=..&lng=..&radiusM=400&limit=10`

```ts
type AedNearbyRes = {
  aeds: Array<{
    id: string;
    externalId: string;
    name: string;
    lat: number;
    lng: number;
    distanceM: number;     // ST_Distance 結果
    address: string | null;
    hours: string | null;
    indoor: boolean;
  }>;
  attribution: "AED N@VI / CC BY 3.0";
};

// PostGIS 検索:
// SELECT *, ST_Distance(geom, ST_MakePoint($lng,$lat)::geography) AS distance_m
// FROM "AedDevice"
// WHERE ST_DWithin(geom, ST_MakePoint($lng,$lat)::geography, $radiusM)
// ORDER BY geom <-> ST_MakePoint($lng,$lat)::geography
// LIMIT $limit;
```

### 4.6 通知 (Push token 登録)

#### `POST /notification/register`

```ts
type RegisterPushReq = { expoPushToken: string; platform: "ios" | "android" };
type RegisterPushRes = { ok: true };
// 副作用: User.expoPushToken を更新
```

#### `POST /notification/test` (デバッグ用、デモ環境のみ)

```ts
// 200 { ok: true }
// User.expoPushToken に「テスト通知」を送る
```

### 4.7 WebSocket: `WS /ws/rescue/:sessionId`

#### 接続

- `?token=<JWT>` クエリで認証
- 接続権限: 発見者本人 + 採用された responder + admin
- 401 で reject

#### サーバ→クライアントイベント

```ts
type RescueEvent =
  | { type: "responder_assigned"; data: { responderId: string; userId: string; role: RescueRole; tier: Tier; displayName: string } }
  | { type: "responder_accepted"; data: { responderId: string; etaSec: number } }
  | { type: "responder_location_update"; data: { responderId: string; lat: number; lng: number; etaSec: number } }
  | { type: "responder_arrived"; data: { responderId: string } }
  | { type: "responder_cancelled"; data: { responderId: string } }
  | { type: "aed_carrier_assigned"; data: { responderId: string; userId: string; aed: AedDeviceSummary; etaSec: number } }
  | { type: "aed_arrived"; data: { aed: AedDeviceSummary } }
  | { type: "session_state"; data: { state: string } }
  | { type: "dispatch_round_expanded"; data: { round: number; radiusM: number } }
  | { type: "ping"; data: { ts: number } };
```

#### クライアント→サーバイベント

```ts
type ClientEvent =
  | { type: "location"; data: { responderId: string; lat: number; lng: number; etaSec?: number } }
  | { type: "pong";     data: { ts: number } }
  | { type: "subscribe"; data: { sessionId: string } };  // 接続確立後 1 回送る
```

- ハートビート: サーバが 25s ごとに `ping` → クライアント `pong`。120s 沈黙で切断
- 切断時はクライアントが指数バックオフ再接続 (1s, 2s, 4s, 8s ... 最大30s)

### 4.8 共通エラーコード

| HTTP | code | 意味 |
|---|---|---|
| 400 | VALIDATION | 入力検証失敗 (zod 詳細を details に) |
| 401 | UNAUTHENTICATED | JWT なし or 不正 |
| 401 | INVALID_CREDENTIALS | login で email/pass 不一致 |
| 401 | INVALID_REFRESH | refresh 不正/期限切れ |
| 403 | FORBIDDEN | 権限なし |
| 404 | NOT_FOUND | リソース不在 |
| 409 | EMAIL_TAKEN | 登録時メール衝突 |
| 409 | ALREADY_PENDING | Tier 申請が進行中 |
| 409 | NOT_ACTIVE | SOS が ACTIVE ではない |
| 409 | SESSION_ENDED | 終了後の操作 |
| 409 | ALREADY_RESPONDED | 同 user 二重応答 |
| 415 | UNSUPPORTED_MEDIA | アップロード形式不正 |
| 429 | TOO_MANY_REQUESTS | 二重発火防止 / レート制限 |
| 500 | INTERNAL | 想定外 |

---

## 5. 画面詳細仕様

各画面の ASCII ワイヤーは `_pre/01-screen-flows.md` を参照 (再掲しない)。
ここでは ファイル/Props/State/接続ストア/遷移発火条件/異常状態 を確定する。

凡例: `→` は遷移、`store↑` はストア更新、`API` は呼ぶエンドポイント、`WS` はソケットイベント。

### 5.1 OB-WEL `mobile/src/screens/onboarding/WelcomeScreen.tsx`
- props: なし
- state: なし
- store: `appStore`(初回起動判定)
- 遷移: 「はじめる」→ `OB-AGREE`
- 異常: なし

### 5.2 OB-AGREE `onboarding/AgreeScreen.tsx`
- state: `agreed: boolean` (チェックボックス)
- store: `authStore.agreedTermsVersion`
- 遷移: 「同意して次へ」(チェック必須) → `OB-ROLE`
- API: なし (ConsentLog は登録時に layer="ONBOARDING" で永続化)
- 異常: チェック未済時はボタン disabled

### 5.3 OB-ROLE `onboarding/RoleSelectScreen.tsx`
- state: `selected: "FINDER_ONLY" | "RESPONDER_TOO" | null`
- store: `authStore.finderOnlyMode`
- 遷移:
  - `FINDER_ONLY` → 認証 (簡易登録) → `PERM` → `HOME`
  - `RESPONDER_TOO` → 認証 → `TIER-REG` → `PERM` → `HOME`
- 認証は OB 内で email+password 登録 sub-screen を提示 (本書では別画面分離せず、OB-ROLE 内 modal)

### 5.4 PERM `permission/PermissionScreen.tsx`
- state: `locStatus`, `notifStatus` (`expo-permissions`)
- store: `notificationStore`, `appStore`
- 遷移: 「許可する」→ OS dialog → 結果保存 → `HOME`
        「スキップ」→ `finderOnlyMode=true` で `HOME` (確認 modal: 「救助者モードは使えませんが OK?」)
- 異常: 拒否されたら設定アプリ誘導の hint 表示

### 5.5 TIER-REG `profile/TierRegistrationScreen.tsx`
- state: `requestedTier`, `documents: ImagePickerAsset[]`, `note`, `submitting`
- store: `authStore`
- API: `POST /tier/apply` (multipart)
- 遷移: 成功 → 「審査中です」screen → `HOME`
- ローディング: submit 中はボタン spinner
- 異常: ファイルサイズ超過は picker 段階で弾く、API 失敗は banner

### 5.6 HOME `home/HomeScreen.tsx`
- state: なし (純表示)
- store: `appStore.demoEnabled`, `notificationStore.permissions`, `authStore`
- コンポーネント: `EmergencyButton`
- 遷移: SOS タップ → `CD`
        設定アイコン → `PROFILE`
        「最寄AEDマップ」→ `AedMapScreen` (P1)
- 異常:
  - 位置情報未許可 → SOS タップ時 `PERM` に誘導
  - オフライン → ボタン下に「オフライン: 119コールのみ可能」
- デモモード: `demoEnabled=true` 時 SOS 色 `#F59E0B`、ラベル「デモ用」

### 5.7 CD `sos/CountdownScreen.tsx`
- state: `count: 3 | 2 | 1`、`pressing: boolean`
- store: `sosStore`
- behavior: 1秒ごとにカウントダウン、長押し2秒で `HOME` に戻る (pressing 状態を haptics で feedback)
- 0 で → `SYM`
- a11y: VoiceOver は「3秒後にヘルプを呼びます。長押しで取消」読み上げ

### 5.8 SYM `sos/SymptomScreen.tsx`
- state: `selected: Symptom | null`、`firing: boolean`
- store: `sosStore`
- 動作: アイコンタップ → 即 `POST /sos` → 応答受領 → `RM-F`
        スワイプエリア完了 → `Linking.openURL('tel:' + (demo ? '09039655913' : '119'))`
        スワイプは独立 (症状未選択でも 119 コール可能)
- API: `POST /sos`
- store↑: `sosStore.currentSosId`、`sosStore.symptom`
- 異常:
  - 位置情報取得失敗 → 「住所を入力」 modal にフォールバック (テキスト入力 + 緯度経度なしで送信、サーバは accuracyM=null・locationLabel のみで受け付ける)
  - 429 TOO_MANY_REQUESTS → 既存 SOS の `RM-F` へ自動遷移

### 5.9 RM-F `rescue/RescueModeFinderScreen.tsx`
- props: `route.params.sosId`
- state: `aedEtaSec`、`responderEtaSec`、`responders[]`、`aedCarrier`、`isOnline`
- store: `rescueStore`、`sosStore`
- WS: `WS /ws/rescue/:sessionId` で全イベント購読
- 副作用:
  - mount 時に `cprGuide.start()` (OpenAI Realtime セッション開始)
  - `metronome.play(100bpm)` 開始
  - WS `aed_arrived` 受信 → `AED-G` に自動遷移
  - WS `responder_arrived` 受信 (Tier1/2) → `HOFF` を modal 提示
- a11y: 主要素は VoiceOver で「胸骨圧迫を続けてください」を 30 秒ごとに repeat (announce)
- 119 再コール: 下部ボタンで `tel:` を再起動可能 (制限なし)
- 異常:
  - WS 切断 → 上部 banner「オフライン中。CPR を続けて」、CPR 音声はローカル fallback (録音済 mp3 ループ)
  - 救助者ゼロ (3分後 dispatch_round=2 でも応答なし) → 「119で救急隊を待ちましょう」表示
  - AED 運搬役ゼロ → AED 残り時間表示を非表示、代わりに「AED なし、CPR を続けて」

### 5.10 AED-G `rescue/AedGuideScreen.tsx`
- props: `route.params.sessionId`
- state: `step: 1|2|3|4`
- 表示: AED N@VI から取得した `aedDevice.model` で機種別画像が出せる場合は出す、出せない場合は汎用画像
- 動作:
  - 各ステップ「次へ」ボタン or 自動 (タイマー 8秒)
  - cprGuide は AED 装着中もメトロノームを 1/4 ボリュームで継続
  - 4 ステップ完了 → 自動で `RM-F` (or `RM-R`) に戻る
- 注意: 「AED の音声に従ってください」を恒常表示

### 5.11 HOFF `rescue/HandoffScreen.tsx`
- props: `route.params.toUserId`、`route.params.kind`
- state: `confirming: boolean`
- API: `POST /rescue/:id/handoff`
- 動作:
  - 「引き継ぐ」→ `RESPONDER_TO_RESPONDER` 送信 → 発見者は `RM-F` でサポート役モードに切替、救助者は `RM-R`
  - 「続ける」→ 何もせず modal close

### 5.12 END `rescue/EndScreen.tsx`
- props: `route.params.sessionId`
- API: `POST /rescue/:id/end` (まだ呼んでなければ)
- 表示: お礼メッセージ、ログ要約 (経過時間/到着 Tier)
- 遷移: 「履歴を見る」→ 履歴画面 (P1) / 「フィードバック」→ Web フォーム deep link

### 5.13 NOTI-R `responder/NotificationResponderScreen.tsx`
これは「通知タップ後に開くアプリ内画面」(OS 通知本体は通知サービス管轄)。
- props: `route.params.sessionId`、`route.params.distanceM`、`route.params.symptom`、`route.params.locationLabel`
- 動作: 3 ボタン (向かう / 手ぶら / 無理) → `POST /rescue/:id/respond`
  - 向かう → `NAV-R` (ACCEPT_WITH_AED)
  - 手ぶら → `NAV-R` (ACCEPT_BAREHAND)
  - 無理 → `R2` 罪悪感ゼロ → `HOME`

### 5.14 NAV-R `responder/NavResponderScreen.tsx`
- props: `sessionId`, `targetLat`, `targetLng`, `aed?`
- state: `currentLocation`, `etaSec`, `peers: ResponderSummary[]`
- WS: 自分の位置を 5 秒ごとに送信、他 peer の位置を購読
- 動作:
  - 「諦める」(長押し2秒) → `POST /rescue/:id/respond { decision: "DECLINE" }` → `R2` → `HOME`
  - 現場到着判定: 現在地と target の距離が 30m 以内 + 5秒留まる → `arrivedAt` を送信 → 発見者画面に `responder_arrived` push

### 5.15 RM-R `rescue/RescueModeResponderScreen.tsx`
- props: `sessionId`
- 表示: RM-F と同レイアウトだが、上部「救急隊あと N 秒」、下部「AED装着済」「経過 N 分」
- 動作: 救急隊到着 → `HOFF (TO_EMS)` → `END`

### 5.16 NOTI-A `aedCarrier/NotificationAedScreen.tsx`
- 2 択 (AED持って向かう / 無理)
- 「向かう」→ `respond { decision: "ACCEPT_WITH_AED" }` → `NAV-A`

### 5.17 NAV-A `aedCarrier/NavAedScreen.tsx`
- state: `phase: "TO_AED" | "TO_SCENE"`、`currentLocation`
- 動作:
  - `TO_AED` で AED 半径 20m 到達 → 「AED を取得しました」ボタン表示 → タップで `phase="TO_SCENE"`
  - `TO_SCENE` で現場 30m 到達 → `AED-PICK` へ自動遷移

### 5.18 AED-PICK `aedCarrier/AedPickScreen.tsx`
- 「渡しました」→ `POST /rescue/:id/handoff { kind: "AED_DELIVERED" }`
  - 副作用: 発見者画面で `aed_arrived` 受信 → `AED-G`
- 「残る」→ `RM-R` (補助モード) / 「離れる」→ `END`

### 5.19 PROFILE `profile/ProfileScreen.tsx`
- state: 設定変更フォーム
- API: `GET /tier/status`、設定変更は `PATCH /me` (本書では `PATCH /me` 仕様省略、`POST /notification/register` と同じ pattern)
- 遷移: 「Tier 登録」→ `TIER-REG`、ログアウト → 認証クリア → `OB-WEL`

### 5.20 R2 罪悪感ゼロ画面 `responder/AbandonScreen.tsx`
- props: `route.params.peerCount`
- 表示: お疲れ様 + 「他の救助者が向かっています(N人)」+ 「閉じる」→ `HOME`
- 動作: 通知履歴・ホーム表示には残さない (再表示しない)

### 5.21 DEMO `appStore` 切替
- 専用画面ではなく `PROFILE` 内トグル + HOME のボタン色で表現
- 詳細は 11 章 (デモモード)

---

## 6. 状態管理 (Zustand store)

`mobile/src/stores/`

### 6.1 `authStore.ts`

```ts
type AuthState = {
  user: { id: string; email: string; displayName: string; currentTier: Tier | null } | null;
  accessToken: string | null;
  refreshToken: string | null;
  agreedTermsVersion: number | null;
  finderOnlyMode: boolean;
  isAuthenticated: () => boolean;

  setAuth: (payload: AuthPayload) => void;
  clearAuth: () => void;
  setTier: (tier: Tier | null) => void;
};
```
- persist: AsyncStorage に `accessToken / refreshToken / user` を保存
- middleware: zustand `persist` (秘匿情報含むため `expo-secure-store` を adapter として使う)

### 6.2 `sosStore.ts`

```ts
type SosState = {
  currentSosId: string | null;
  currentSessionId: string | null;
  status: SosStatus | null;
  symptom: Symptom | null;
  location: { lat: number; lng: number; accuracyM?: number; label?: string } | null;

  startSos: (input: SosReq) => Promise<void>;       // POST /sos
  cancelSos: () => Promise<void>;
  endSos: () => void;                               // sessionId クリア
  setLocation: (loc) => void;
};
```
- persist: しない (要請中の揮発状態)

### 6.3 `rescueStore.ts`

```ts
type RescueState = {
  sessionId: string | null;
  state: string;
  responders: ResponderSummary[];     // Tier1/2
  aedCarrier: ResponderSummary | null;
  aedDevice: AedDeviceSummary | null;
  responderEtaSec: number | null;
  aedEtaSec: number | null;
  isOnline: boolean;

  hydrateFromServer: (data: SosDetailRes) => void;
  applyEvent: (ev: RescueEvent) => void;            // WS 受信を集約
  reset: () => void;
};
```

### 6.4 `notificationStore.ts`

```ts
type NotificationState = {
  permissions: { notification: PermissionStatus; location: PermissionStatus };
  pushToken: string | null;

  ensurePermissions: () => Promise<void>;
  registerPushToken: () => Promise<void>;          // POST /notification/register
  setPermission: (k, v) => void;
};
```

### 6.5 `appStore.ts`

```ts
type AppState = {
  demoMode: boolean;
  isOnline: boolean;
  hasOnboarded: boolean;
  theme: "dark";       // 固定 (MVP は dark のみ)

  toggleDemoMode: (v: boolean) => void;
  setOnline: (v: boolean) => void;
  completeOnboarding: () => void;
};
```
- persist: `demoMode / hasOnboarded` のみ AsyncStorage

### 6.6 selectors (例)

```ts
const selectIsRescueActive = (s: RescueState) =>
  s.sessionId !== null && s.state !== "ENDED";

const selectAedEtaText = (s: RescueState) =>
  s.aedEtaSec === null ? "—" : formatTime(s.aedEtaSec);
```

---

## 7. 通知配信ロジック (アルゴリズム明示)

`backend/src/services/dispatch.ts`

### 7.1 配信タイミング

```
SOS 発火 (t=0)
  └─ Round 0: 半径 400m に通知配信
     (Tier3 = NOTI-A、Tier1+Tier2 = NOTI-R を別ペイロードで)
t=60s 経過時、いずれの role でも ACCEPTED が 0 件なら:
  └─ Round 1: 半径 1000m に追加配信 (既配信ユーザーは除外)
t=180s (Round 0 から) でも ACCEPTED が 0 件なら:
  └─ Round 2: 半径 5000m に追加配信
それ以降は拡大しない (5km で打ち止め)
```

実装: `setTimeout` でなく BullMQ-lite 風のキューを **MVP では setTimeout で簡略化** (1 ノード前提)。
将来 Coolify 上で水平スケールする時は Redis + BullMQ に置換。

### 7.2 対象ユーザー抽出 (PostGIS クエリ)

```sql
-- Tier1+Tier2 (RESPONDER) の場合
SELECT id, expoPushToken, currentTier
FROM "User" u
WHERE u.notificationOptIn = true
  AND u.expoPushToken IS NOT NULL
  AND u.currentTier IN ('TIER1','TIER2')
  AND u.id != $finderId
  -- 直近の位置 (Responder.currentGeom or User.lastKnownGeom) を使うのは v1.5
  -- MVP は登録時の通知配信は **位置共有してない人にも届く** ので
  -- Tier3 同様に「アプリ起動時に最後に取得した位置」を別カラム lastKnownGeom に保持
  AND ST_DWithin(u.lastKnownGeom, ST_MakePoint($lng,$lat)::geography, $radiusM);

-- ただし MVP は "lastKnownGeom" を導入せず、簡略化として
--   「全 OPT_IN ユーザーに通知 → クライアント側で受信時に距離フィルタ」
-- に逃げてもよい (運用初期は人数少ないので可)
```

**MVP 採用案**: `User.lastKnownGeom Unsupported("geography(Point, 4326)")?` を schema に追加。
クライアントはアプリ起動時 + 1時間ごとに `PATCH /me/location` で更新。サーバ側は半径フィルタを GIST で行う。

> schema 修正反映: 上記 schema の `User` モデルに `lastKnownGeom` を追加する (本書 12 章 「変更点」参照)。

### 7.3 Tier 優先度

通知ペイロードには優先度ヒント (`priority: 1|2|3`) を含めるが、配信順序は同時ファンアウト。
クライアント側で表示優先度として使用 (例: 通知音の差別化、リスト並び)。

### 7.4 二重発火防止

```
POST /sos のレートリミッタ:
  user_id をキーに 60 秒ウィンドウ。既存 ACTIVE な Sos があれば 429 を返し、
  クライアントは即 RM-F に画面遷移 (新規発火扱いしない)。
```

### 7.5 役割分離 (NOTI-R vs NOTI-A)

Expo Push の `data.kind` で分岐:
```ts
// Tier3 への AED 運搬通知
{
  to: "ExponentPushToken[...]",
  title: "Tsunagu — AED運搬要請",
  body: `AED必要・${distanceM}m先で心停止`,
  data: {
    kind: "AED_CARRY",
    sessionId, distanceM, symptom,
    targetLat, targetLng,
    aedHint: { id, name, lat, lng, distanceFromYouM }
  },
  channelId: "tsunagu-aed-carry",  // Android: 別チャネル
  priority: "high",
  sound: "aed-alert.wav",          // 専用音
}

// Tier1/2 への救助通知
{
  title: "Tsunagu — 緊急ヘルプ要請",
  body: `${distanceM}m 先・${symptomLabel}`,
  data: { kind: "RESPONSE", sessionId, distanceM, symptom, targetLat, targetLng },
  channelId: "tsunagu-response",
  priority: "high",
  sound: "responder-alert.wav",
}
```

### 7.6 配信失敗時のフォールバック

- Expo Push API が 4xx (DeviceNotRegistered) → `User.expoPushToken=null` に更新、ログ
- 5xx → 5 秒後に 1 回だけリトライ
- 完全失敗時はサーバ AuditLog に `RESPONDER_NOTIFIED { delivered: false, error }` を残す
- クライアント側: アプリ前面起動中なら WS の `responder_assigned` で代替表示も可能 (将来)

---

## 8. 音声 LLM ガイドの仕様

`mobile/src/services/audio/cprGuide.ts`

### 8.1 使用 API
- **OpenAI Realtime API** (WebRTC ベース、音声入出力)
- model: `gpt-4o-realtime-preview` (または当時最新の音声対応モデル)
- 認証: 短命の ephemeral session トークンを **バックエンド経由** で発行
  - mobile が `POST /ai/realtime/session` を叩き、API キーを直接持たない
  - バックエンド `services/openai.ts` で `POST https://api.openai.com/v1/realtime/sessions` を呼び session secret を返す

### 8.2 システムプロンプト (全文・固定)

```
あなたは Tsunagu のCPR音声アシスタントです。
日本蘇生協議会 (JRC) の最新の一次救命処置 (BLS) ガイドラインに従って、
発見者を励まし、胸骨圧迫を支援します。以下を厳守:

【絶対に行わないこと】
- 病名の予測・診断
- 「これは心臓発作です」など医学的判断
- 「救急車を呼ぶ必要はありません」など 119 を否定する助言
- 薬剤の投与に関する助言
- 「死んでいる」「もう手遅れ」など希望を奪う言葉

【話し方】
- 短く、明瞭に、優しく、励ます調子
- 1 文 12 文字以下を目安、敬語は最小限 (「押して」「いいよ」「続けて」)
- 30 秒に 1 回は励ましの声かけ
- 1 分に 1 回 「強く、速く、深く 5cm 押して」

【メトロノーム】
- アプリ側が 100-120 BPM のクリック音を出します。あなたは音声でリズムを補強せず、
  励ましとガイドに専念してください。

【状態別の応答】
- 開始時: 「胸の真ん中を、リズムに合わせて押して。両手で、肘を伸ばして。」
- 継続時 (30秒毎): 「いいよ、続けて」「あなたが命を救ってる」「もう少し」
- 1 分毎: 「強く、速く、深く 5cm。同じリズムで。」
- AED 到着通知 (アプリから event): 「AED が来ました。電源を入れて。パッドを胸に貼って。
  AED の音声に従って。」
- 救助者到着通知: 「救助者が来ました。続けるか、交代するか、画面を見て。」
- 救急隊到着通知: 「救急隊が来ました。手を止めて、離れて。」

【医療判断回避フレーズ】
- 状況の判断を求められたら「画面の指示に従ってください」と返す
- 質問されても「119 のオペレーターか救急隊員に確認してください」

応答言語は常に日本語。話速は通常より 10% 遅め。
```

### 8.3 状態別の応答パターン (アプリ側 event 注入)

```ts
// アプリ→Realtime: input_text として状態 event を流す
type CprEvent =
  | { kind: "session.start"; symptom: Symptom }
  | { kind: "tick.30s" }
  | { kind: "tick.60s" }
  | { kind: "aed.arrived"; deviceModel?: string }
  | { kind: "responder.arrived"; tier: Tier; displayName: string }
  | { kind: "ems.arrived" }
  | { kind: "session.end" };
```

これらを Realtime セッションに送り、上記システムプロンプトに従ってモデルが音声を返す。

### 8.4 メトロノーム (100-120 BPM)

`mobile/src/services/audio/metronome.ts`
- 実装: `expo-av` で `assets/audio/click.wav` を 600ms 間隔 (= 100bpm) でループ再生
- 100bpm 固定 (JRC ガイドラインの中心値) → BPM 可変は P1
- 再生開始/停止 API:
```ts
metronome.start({ bpm: 100 });
metronome.stop();
metronome.setVolume(0..1);
```

### 8.5 オフライン時のフォールバック

- ネット接続失敗時 → `services/audio/fallback.ts` に切替
- 録音済み音声ファイル `assets/audio/ja/cpr-loop.mp3` (約 60 秒、励まし声 + 説明 を内包したループ) を再生
- メトロノームは独立で継続 (音声合成不要)
- バックエンド復旧時に Realtime に切戻し可能なら自動切替、ただし MVP は **手動切替なし** (一度 fallback に落ちたら終了まで fallback)

### 8.6 応答時間 SLA

- セッション初回応答: ユーザー画面遷移 (RM-F mount) から 1 秒以内に音声開始
  - 達成のため: アプリ `mount` 時に並列で
    - Realtime ephemeral session 取得 (バックエンド呼出)
    - WebRTC 接続確立
    - 接続完了前に metronome は即時開始
- 接続失敗 5 秒で fallback に切替

### 8.7 「医療判断」を避ける応答制約

- システムプロンプトに明記 (8.2)
- バックエンド側で Realtime session の `tools` に「医療判断ツール」を**与えない**
- 録音済み fallback も「励まし + 圧迫指示のみ」に厳格に絞る (病名・薬剤に触れない script)

---

## 9. 異常系・エッジケース

| ケース | 仕様 |
|---|---|
| GPS 取得失敗 | SYM 画面で「住所を入力」modal にフォールバック。lat/lng なしの SOS は通知配信されないため、サーバは lat/lng 必須 を 400 で返し、クライアントは住所入力後に geocode(端末側 expo-location.geocodeAsync) して再送信。geocode も失敗したら「119 のみコール」モードで RM-F を表示 (CPR 音声ガイドだけ動く) |
| ネット切断 | RM-F: 上部 banner、CPR ガイドは fallback に自動切替。WS 再接続まで位置共有は止まる。サーバ復旧時は最後の状態を `GET /sos/:id` で取り直し再 hydrate |
| 救助者ゼロ (3分後 dispatch_round=2 でも 0 件) | RM-F に「119 で救急隊を待ちましょう」表示、CPR 音声ガイドは継続、AED 時間表示は隠す |
| AED 運搬役ゼロ | AED ETA 表示を非表示、「AED なし、CPR 続行」を表示 |
| 通知許可なし | OB-ROLE で「救助者も」を選んでも PERM 後に拒否されたら `finderOnlyMode=true` に変更し、PROFILE で再申請可能。救助者通知は配信されない |
| 同時 SOS 2 件以上を救助者が受け取る | クライアントは通知を受信順に独立 push、画面では 1 件ずつ NOTI-R 表示 (積まれた他通知は OS 通知センターに残る) |
| セッション タイムアウト | サーバが SOS 発火から 60 分経っても `state != "ENDED"` のセッションを cron (5 分間隔) でチェックし、`endRescue(reason="TIMEOUT")` を実行 |
| アプリ強制終了→復帰 | 起動時に `GET /me/active-rescue` (新設、なくても `GET /sos?finderId=me&status=ACTIVE` でも可) を叩き、ACTIVE な session があれば自動で `RM-F` (発見者) or `NAV-R` (救助者として ACCEPTED 状態) に遷移 |
| 二重発火 | `POST /sos` 429 → クライアントは body に `existingSosId` を含めて返す → 既存 RM-F に遷移 |
| 救助者の二重応答 | `POST /respond` 409 → 既存 NAV-R に遷移 |
| 引き継ぎ中の発見者離脱 | 発見者が画面を閉じても session は ACTIVE のまま、救助者は RM-R を継続。発見者が再起動したら復帰 |
| 規約バージョン更新 | サーバが `currentTermsVersion` を返す。クライアント側で `user.agreedTermsVersion < currentTermsVersion` なら HOME mount 時に同意 modal を強制表示 |
| デモモード中に本物の通知が届く | デモは「自分の SOS のみ」シミュレート、他人の通知は通常通り受信 (本物は本物として扱う) |
| Tier 申請却下 | メール通知 + アプリ起動時に banner、再申請可能 |
| 位置情報の終了後破棄 | END API 呼出時にサーバは Responder の `currentGeom`/`notifiedGeom` を NULL に。Sos.geom は 7 日後に NULL 化する cron (個情法配慮、統計用ハッシュは別保持の余地ありだが MVP は単純破棄) |

---

## 10. テスト基盤

### 10.1 Backend

- **フレームワーク**: Vitest + Supertest
- **配置**: `backend/__tests__/{unit,integration,scenario}/`
- **DB**: `testcontainers` で PostgreSQL+PostGIS を spawn (`postgis/postgis:16-3.4`)
  - 各テスト前に `prisma migrate deploy` 実行
  - シナリオ間は `TRUNCATE` で初期化
- **時刻**: `vi.useFakeTimers()` で dispatch round 拡大の時間進行を制御
- **Push**: `expo-server-sdk` を `vi.mock` で stub、配信記録だけ assert
- **OpenAI Realtime**: 完全 mock (バックエンド endpoint `POST /ai/realtime/session` を返す stub)
- **WebSocket**: `ws` クライアントでテスト接続、event をキャプチャ
- **S3**: MinIO container or `aws-sdk-client-mock`

### 10.2 Mobile

- **単体・コンポーネント**: Vitest (Jest 互換) + React Native Testing Library
  - `vitest.config.ts` で `@testing-library/react-native` を preset
- **E2E**: **Maestro** (Detox より YAML で軽量、CI 統合容易)
  - `__tests__/e2e/*.yaml` に flow 定義
  - 19 シナリオは Maestro flow で覆う
- **モック**:
  - API: MSW for React Native (handler を共通化)
  - 通知: `expo-notifications` を `__mocks__/`
  - 音声: `expo-av` を mock、再生指令だけ assert
- **位置**: `expo-location` を mock、固定座標を返す

### 10.3 カバレッジ目標
- 主要動線 (F1, R1, A1 系): 70%+
- 異常系 (オフライン/権限拒否/タイムアウト): 50%+
- ユーティリティ (formatTime, geo, jwt): 90%+

### 10.4 Reviewer のテスト生成方針 (シナリオ 19 本)

`_pre/01-screen-flows.md` のシナリオ番号に準拠:
1. F1 発見者 呼吸なし → AED 到着 → 救助者到着 → 救急隊引継 → END
2. F2 発見者 意識なし → 簡易ガイド → END
3. F3 発見者 出血 → 簡易ガイド → END
4. F4 発見者 その他 → Q助 deep link → END
5. R1 救助者 通知受信 →「向かう」→ 到着 → 引継
6. R2 救助者 「無理」→ 罪悪感ゼロ → HOME
7. R3 救助者 NAV 中「諦める」→ 罪悪感ゼロ
8. R4 救助者 引継後 RM-R → 救急隊引継
9. R5 救助者 AED 装着担当
10. R6 救助者 救急隊引継 → END
11. A1 AED 運搬 通知受信 →「向かう」
12. A2 AED 運搬 NAV 2 段
13. A3 AED 運搬 現場到着 → AED-PICK →「残る」/ 「離れる」
14. S1 オンボーディング 発見者のみ
15. S2 オンボーディング 救助者も + Tier 申請
16. S3 PROFILE で Tier 変更/通知 ON-OFF
17. D1 デモモード ON → SOS → 09039655913 コール
18. D2 デモモード 通知シミュレート (実配信なし)
19. ERR エッジ: GPS 失敗 / オフライン / 二重発火 / タイムアウト

各シナリオは backend の scenario テスト + mobile の Maestro flow の **2 系統で被覆**。

---

## 11. デモモードの実装方針

### 11.1 切替方法
- **環境変数**: `EXPO_PUBLIC_DEMO_NUMBER=09039655913` (固定、本番ビルドにも入れる)
- **アプリ内トグル**: `PROFILE > デモモード [ON/OFF]`、状態は `appStore.demoMode` (persist あり)
- HOME の SOS ボタン色が `demoMode=true` で `#F59E0B` (amber)、ラベル「デモ用」

### 11.2 サーバ側

- すべての mutation 系 endpoint で `?demo=true` を受ける
- `Sos.isDemo`, `RescueSession.isDemo` を `true` で永続化
- 通知配信: `isDemo=true` の場合、本物の Expo Push は配信せず、**自分自身の expoPushToken にのみ「これはデモ通知です」を送る** (テスト目的)
- 集計クエリは常に `WHERE isDemo = false` で本番のみカウント

### 11.3 デモデータの扱い
- 別テーブルに分離はしない (`isDemo` フラグで論理分離、DB が単純)
- 7日後に cron で `DELETE FROM "Sos" WHERE isDemo=true AND createdAt < NOW() - INTERVAL '7 days'`

### 11.4 119 コール先
- mobile `services/api/sos.ts`:
```ts
const phoneNumber = appStore.demoMode
  ? process.env.EXPO_PUBLIC_DEMO_NUMBER ?? "09039655913"
  : "119";
Linking.openURL(`tel:${phoneNumber}`);
```

### 11.5 終了画面で明示
- END 画面で `session.isDemo === true` の場合、上部に大きなバッジ「これはデモでした」を表示
- ConsentLog や AuditLog にも `payload.isDemo: true` を記録

---

## 12. 認証フロー

### 12.1 JWT 仕様
- アルゴリズム: **HS256** (env `JWT_SECRET` 32バイト以上)
- access: 1 時間 (`exp = now + 3600`)
- refresh: 30 日 (`exp = now + 30*86400`)
- claims: `{ sub: userId, type: "access"|"refresh", iat, exp }`
- 保存: mobile は `expo-secure-store` (Keychain/Keystore)
- 自動リフレッシュ: API client が 401 受信時に `refreshToken` で1回だけリトライ → 失敗で `clearAuth()` → `OB-WEL` に遷移

### 12.2 書類アップロード
- `multipart/form-data` で `POST /tier/apply`
- バックエンドは `@aws-sdk/client-s3` で S3/MinIO に PUT
- Bucket: env `S3_BUCKET`、prefix: `tier-applications/<userId>/<applicationId>/<filename>`
- 取得は **署名付き URL (有効5分)** のみ。`GET /tier/document/:key` が 302 redirect

### 12.3 審査キュー
- `GET /admin/tier/applications?status=PENDING` で一覧
- `POST /admin/tier/:applicationId/decision` で承認/却下
- 通知: Resend (env `RESEND_API_KEY`) でメール送信
  - From: `noreply@tsunagu.appily.run`
  - Subject (承認): 「Tsunagu — Tier 申請が承認されました」
  - Subject (却下): 「Tsunagu — Tier 申請内容について」+ reviewerNote

### 12.4 審査中ユーザーの扱い
- `User.currentTier === null` かつ `pendingApplication !== null`
- 通知配信対象から除外 (PostGIS クエリで `currentTier IN (...)` にヒットしない)
- 発見者モードは利用可能

---

## 13. UI/UX システム詳細

### 13.1 カラーパレット (`mobile/src/theme/colors.ts`)

```ts
export const colors = {
  // 緊急
  emergencyRed: "#DC2626",
  // 情報
  infoBlue: "#2563EB",
  // 成功
  successGreen: "#16A34A",
  // 警告 / デモモード
  warningAmber: "#F59E0B",
  // 背景・前景
  bgBlack:    "#0A0A0A",
  fgWhite:    "#FAFAFA",
  // 副
  gray700:    "#404040",
  gray500:    "#737373",
} as const;
```

### 13.2 タイポ (`theme/typography.ts`)

```ts
export const typography = {
  h1:    { fontSize: 40, fontWeight: "600" as const, lineHeight: 48 },
  h2:    { fontSize: 28, fontWeight: "600" as const, lineHeight: 36 },
  body:  { fontSize: 24, fontWeight: "400" as const, lineHeight: 32 },
  small: { fontSize: 18, fontWeight: "400" as const, lineHeight: 24 },
};
```

フォント: System default (`-apple-system` / `Roboto`)。可読性優先で外部 font は使わない。

### 13.3 スタイル定義方法
- **NativeWind は使わない** (依存追加を抑える、Reviewer のテスト負荷も減る)
- React Native 標準 `StyleSheet.create` + theme tokens を直接 import

### 13.4 アクセシビリティ
- 全主要素に `accessibilityLabel`, `accessibilityRole`, `accessibilityHint`
- `EmergencyButton`: `accessibilityRole="button"`, `accessibilityLabel="ヘルプを呼ぶ。長押しで取消"`
- `MetronomeView`: `accessibilityLiveRegion="polite"`, 30 秒ごとに「胸骨圧迫を続けてください」を `AccessibilityInfo.announceForAccessibility`
- 動的フォントサイズには **対応しない** (緊急 UI で固定サイズ重要、a11y は別 channel = VoiceOver で補う)
- VoiceOver/TalkBack: 全画面で動作テスト必須

### 13.5 ダークモード前提
- `appStore.theme="dark"` 固定、ライトモードは MVP 非対応
- システムが light でも強制 dark
- 理由: 緊急時の眩しさ低減、コントラスト確保

### 13.6 アニメーション
- ライブラリ: `react-native-reanimated` v3
- 用途:
  - `MetronomeView`: 100bpm で円が脈動 (scale 1.0 → 1.15 → 1.0)
  - `CountdownScreen`: 3→2→1 の数字スケール (0.8 → 1.0)
  - `EmergencyButton`: 待機時にゆっくり呼吸 (scale 1.0 → 1.03、5秒周期、デモモード時は 2 秒周期)

### 13.7 振動・音 (Haptics)
- ライブラリ: `expo-haptics`
- パターン:
  - SOS 押下: `ImpactFeedbackStyle.Heavy`
  - カウントダウン (3,2,1): `ImpactFeedbackStyle.Medium` × 3
  - SOS 発火確定: `NotificationFeedbackType.Success`
  - AED 到着 / 救助者到着: `NotificationFeedbackType.Warning` (注意喚起)
  - 引き継ぎ完了: `NotificationFeedbackType.Success`
  - キャンセル: `ImpactFeedbackStyle.Light`

---

## 14. ポータブル設計の鉄則

### 14.1 使ってはいけないもの (再確認)

| カテゴリ | NG | 採用 |
|---|---|---|
| 認証 | Supabase Auth, Firebase Auth, Auth0, Cognito | 自前 JWT (HS256) |
| DB | Supabase Postgres, Vercel Postgres | 任意の PostgreSQL+PostGIS (DATABASE_URL 1行で切替) |
| Realtime | Supabase Realtime, Pusher, Ably | 自前 `ws` (Hono compatible) |
| Storage | Supabase Storage, Firebase Storage | S3 互換 (MinIO / R2 / AWS S3 / Wasabi) |
| Push | Firebase FCM (直接), APNs (直接) | **Expo Push** (Expo の中継経由で FCM/APNs に流す。Expo は SDK 抽象化されており他環境にも持ち運び可能。token は Expo Push Token 形式) |
| Mail | SendGrid 専用 SDK | Resend (HTTP API、SDK 不要) or 後で Postmark/SES に差替可能な抽象層 |
| KV | Vercel KV, Cloudflare KV | 不採用 (使わない設計) |
| Function | AWS Lambda, Vercel Functions | 自前 Node プロセス (Coolify で長時間 process) |

### 14.2 移植可能性テスト

以下が満たせれば「他環境に移植可能」とみなす:
- env (`.env.example`) の値を差し替えるだけで起動可能
- `prisma migrate deploy` で DB 構築可能
- Dockerfile build で動く

### 14.3 抽象化レイヤ
- S3 アクセスは `services/s3.ts` に集約 (`putObject` / `getSignedUrl` / `deleteObject`)
- Push は `services/push.ts` に集約 (`sendToTokens(tokens, payload)`)
- Mail は `services/mailer.ts` に集約 (`send({ to, subject, html })`)

---

## 15. デプロイ

### 15.1 Backend
- **Coolify (Appily)** で `tsunagu.appily.run` にデプロイ
- `Dockerfile` (multi-stage: `node:20-alpine` build → 同 alpine runtime)
- ヘルスチェック: `GET /healthz` → `{ ok: true, ts }`
- `prisma migrate deploy` を起動時に実行 (entrypoint script)

### 15.2 Mobile
- **Expo EAS Build** で内部配布
- `eas.json` の profile:
  - `development`: dev client + expo-dev-client
  - `preview`: 内部配布 (TestFlight 内部 / Internal Testing)
  - `production`: 後日 (TestFlight / Play Console)
- iOS Critical Alert は MVP では申請しない (通常 Push のみ)。後日 Apple 申請

### 15.3 環境変数 (`.env.example`)

```dotenv
# Backend
NODE_ENV=development
PORT=3000
PUBLIC_BASE_URL=http://localhost:3000

DATABASE_URL=postgresql://tsunagu:tsunagu@localhost:5432/tsunagu

JWT_SECRET=please-change-me-32bytes-or-more

# S3 (MinIO local / R2 / AWS S3)
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minio
S3_SECRET_ACCESS_KEY=minio12345
S3_BUCKET=tsunagu-tier-docs
S3_FORCE_PATH_STYLE=true

# Mail
RESEND_API_KEY=re_xxx
MAIL_FROM=noreply@tsunagu.appily.run

# Push (Expo)
EXPO_ACCESS_TOKEN=optional-for-rate-limit-bypass

# Admin
ADMIN_EMAILS=touri1705@outlook.com

# OpenAI Realtime
OPENAI_API_KEY=sk-...

# AED N@VI
AED_NAVI_CSV_PATH=./data/aed-navi.csv

# Mobile (Expo)
EXPO_PUBLIC_API_BASE=https://tsunagu.appily.run
EXPO_PUBLIC_WS_BASE=wss://tsunagu.appily.run
EXPO_PUBLIC_DEMO_NUMBER=09039655913
EXPO_PUBLIC_SENTRY_DSN=
```

### 15.4 docker-compose (ローカル開発)

```yaml
services:
  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_USER: tsunagu
      POSTGRES_PASSWORD: tsunagu
      POSTGRES_DB: tsunagu
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minio
      MINIO_ROOT_PASSWORD: minio12345
    ports: ["9000:9000", "9001:9001"]
    volumes: ["miniodata:/data"]

  mailhog:
    image: mailhog/mailhog
    ports: ["1025:1025", "8025:8025"]

volumes:
  pgdata:
  miniodata:
```

---

## 16. 不採用案 (再検討ループ防止)

| 不採用 | 検討した理由 | 却下理由 |
|---|---|---|
| Supabase Auth | OSS 移植性・Magic Link 楽 | ベンダーロック、CLAUDE.md の禁止リスト |
| Firebase Cloud Messaging を直接 | iOS/Android 両対応で標準 | Expo Push を経由すれば抽象化される、Expo Notifications で実装簡単 |
| 症状トリアージ機能 | UX 的に魅力 | 薬機法 SaMD 該当リスク、Q助 deep link で代替 |
| 自動 119 発信 | UX 完全自動化 | 法律+OS+消防庁の四重規制で不可能 |
| 完全 Web (PWA) のみ | ストア審査回避 | バックグラウンド位置・即時 Push が弱い、Critical Alert 不可。MVP は Expo Native 確定 |
| Supabase Realtime | WS 自前不要 | ベンダーロック、自前 `ws` で十分 |
| Detox (E2E) | 高機能 | 設定が重い。Maestro で軽量に開始 |
| NativeWind / Tailwind | DX 良好 | 緊急 UI は静的スタイルで十分、依存削減 |
| BPM 可変 (100-120) | JRC 推奨幅 | MVP は 100 固定、可変は P1 |
| iOS Critical Alert | 救命価値高 | Apple 申請に時間。MVP は通常 Push、申請は並行進行 |
| Redis + BullMQ | スケーラブルな配信スケジューラ | MVP は 1 ノード setTimeout で十分、必要になったら差替 |
| ライトモード対応 | アクセシビリティ価値 | 緊急UIは黒地統一が安全 (眩しさ低減・コントラスト保証) |
| FCM 直 + APNs 直 | レイヤ薄い | Expo Push が抽象化、移植性も担保 |
| 別テーブルでデモデータ分離 | データ汚染 0 | `isDemo` フラグで論理分離が単純で十分 |
| Auth.js (NextAuth) | Web のオーセン経験豊富 | Mobile 主体、Hono と相性悪い、自前 JWT で十分 |

---

## 17. Architect 注記 (Developer / Reviewer への申し送り)

1. **schema.prisma の `User.lastKnownGeom` 追加が必須** (本書 7.2 で要求、上記 schema 例にも反映する形で Developer は実装すること)。
2. **OpenAI Realtime の ephemeral session は必ずバックエンド経由** (mobile に API key を埋めない)。
3. **WebSocket の認証は `?token=` クエリ**。Authorization header は WS で扱いにくいため query で運用、token はログに残らないよう backend で mask 推奨。
4. **位置情報は終了 5 分で破棄**。`Responder.currentGeom/notifiedGeom` を NULL 化、`Sos.geom` は 7 日 cron 削除。これは個情法配慮の core 要件。
5. **Tier 審査は手動**。MVP は admin endpoint と Resend メール送信があれば足りる。管理 UI は v1.5。
6. **Maestro flow は シナリオ番号 (F1/R1/A1...) と 1:1 対応** で命名 (`flows/F1-finder-no-breathing.yaml` 等)。
7. **テストの DB は testcontainers**。CI でも spawn できるよう Dockerfile-test を別途用意。
8. **ConsentLog と AuditLog は永続削除しない**。訴訟自衛資料、最低 5 年保持 (実装は MVP では削除なし、ポリシー文書化のみ)。

---

## 18. 主要決定事項サマリ (10 行)

1. Mobile: Expo + React Native + TS、Backend: Hono + Prisma + PostgreSQL+PostGIS、認証: 自前 JWT
2. データモデル: User / TierApplication / Sos / RescueSession / Responder / AedDevice / HandoffEvent / ConsentLog / AuditLog (9 モデル)
3. PostGIS で半径検索、AED N@VI を CSV 取込 (CC BY 3.0 表記必須)
4. 通知は **Expo Push** (FCM/APNs を抽象化)、NOTI-R と NOTI-A は別 channel/sound で配信分離
5. 半径自動拡大: 400m → 60s 後 1km → 180s 後 5km、応答ゼロでも以降は拡大しない
6. CPR 音声ガイドは OpenAI Realtime API、メトロノームは expo-av、オフライン時は録音済み mp3 fallback
7. デモモードは `appStore.demoMode` + サーバ `?demo=true` + `Sos.isDemo` で論理分離、コール先は `EXPO_PUBLIC_DEMO_NUMBER`
8. JWT は HS256、access 1h / refresh 30d、Tier 書類は S3 互換に保存、署名付き URL で取得
9. UI は dark 固定、Reanimated で脈動アニメ、Haptics で触覚 feedback、a11y は VoiceOver/TalkBack
10. テスト: Backend Vitest+Supertest+testcontainers、Mobile Vitest+RNTL+Maestro E2E (19 シナリオ)

