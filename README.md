# AI Agent Consultant Learning Studio

銀行財富管理 AI Agent 顧問 12 章學習平台（Phase 1 跨裝置學習 + Phase 2 視覺互動與記憶引擎）。

- 前端：React 18 + TypeScript（strict）+ Vite + Tailwind CSS，`HashRouter`，PWA
- 後端（選用）：Supabase（Auth + PostgreSQL + Storage）
- **沒有設定 Supabase 也能完整使用**：自動進入「本機訪客模式」，資料存在這個瀏覽器

## 一、本機執行

```bash
npm install
npm run dev        # 開發伺服器
npm run typecheck  # TypeScript 檢查
npm run test       # 單元測試
npm run build      # 建置（輸出 dist/）
```

不需要任何 `.env` 就能啟動。要啟用雲端同步，才需要下面的步驟。

## 二、設定 Supabase（雲端同步，選用）

> 以下步驟不需要寫程式，照著做即可。

### 步驟 1：建立專案
1. 到 <https://supabase.com> 註冊並登入，按 **New project**。
2. 填入專案名稱、資料庫密碼（請自行保存）、選擇離你較近的 Region，按 **Create**。等待約 1–2 分鐘。

### 步驟 2：貼上 SQL（建立資料表、安全規則、圖片空間）
1. 左側選單 **SQL Editor** → **New query**。
2. 打開本專案的 `supabase/schema.sql`，**全選複製**後貼進去，按 **Run**。
3. 看到 `Success` 即完成。這一步會建立 8 張資料表、啟用 Row Level Security（每個人只能存取自己的資料），並建立私有圖片空間 `note-images`（5MB、僅限圖片格式）。
4. 驗證：左側 **Table Editor** 應看到 8 張表；**Storage** 應看到 `note-images`（Private）。

### 步驟 3：取得金鑰
1. **Project URL**：**Project Settings → General**（或 **Data API** 頁面最上方），格式 `https://xxxx.supabase.co`。
2. **金鑰**：**Project Settings → API Keys**。
   - 新版介面：複製 **Publishable key**（`sb_publishable_...` 開頭，名稱為 `default` 那一行右邊的複製圖示）。
   - 舊版介面：複製 **anon public** key（在 *Legacy API keys* 內）。
   - 兩種都可以填進 `VITE_SUPABASE_ANON_KEY`。
3. ⚠ **絕對不要**使用 **Secret keys**（舊版叫 `service_role`），也不要把它貼到任何前端設定或 GitHub。

### 步驟 4：本機設定
複製 `.env.example` 為 `.env`，填入：

```env
VITE_SUPABASE_URL=https://你的專案代號.supabase.co
VITE_SUPABASE_ANON_KEY=你的 anon public key
VITE_BASE_PATH=./
```

`.env` 已在 `.gitignore`，不會被提交。

### 步驟 5：開啟登入方式
左側 **Authentication → Providers**：

- **Email（Magic Link）**：預設可用，不需額外設定。
- **GitHub**：
  1. GitHub → Settings → Developer settings → OAuth Apps → **New OAuth App**。
  2. **Authorization callback URL** 填 Supabase 該 Provider 頁面顯示的 *Callback URL*（形如 `https://xxxx.supabase.co/auth/v1/callback`）。
  3. 建立後把 *Client ID* 與 *Client Secret* 貼回 Supabase 的 GitHub Provider 並啟用。
- **Google**：
  1. <https://console.cloud.google.com> → APIs & Services → Credentials → **Create OAuth client ID**（Web application）。
  2. **Authorized redirect URIs** 填同樣的 Supabase *Callback URL*。
  3. 把 *Client ID* 與 *Client Secret* 貼回 Supabase 的 Google Provider 並啟用。

### 步驟 6：設定允許的網址
**Authentication → URL Configuration**：
- **Site URL**：填你的 GitHub Pages 網址，例如 `https://<帳號>.github.io/<repo名稱>/`
- **Redirect URLs** 加入：上述網址，以及本機開發用 `http://localhost:5173/`

## 三、部署到 GitHub Pages

1. 把專案推到 GitHub（分支 `main`）。
2. GitHub repo → **Settings → Pages** → **Source** 選 **GitHub Actions**。
3. **Settings → Secrets and variables → Actions → New repository secret**，新增兩個：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`（只放 anon public key）
4. 推送到 `main` 後，`.github/workflows/deploy.yml` 會自動 typecheck → test → build → 部署。
5. 網址為 `https://<帳號>.github.io/<repo名稱>/`。

說明：
- 工作流程會自動把 `VITE_BASE_PATH` 設為 `/<repo名稱>/`，資源路徑不會破圖。
- 使用 `HashRouter`（網址含 `#/`），重新整理子頁不會 404。
- 沒設定 Secrets 也能部署，網站會以本機訪客模式運作。

## 四、使用說明

- **狀態徽章**：`本機訪客模式`（點擊登入）／`同步中...`／`雲端已同步 ✓`／`同步失敗（點擊重試）`。
- **從舊版搬家**：設定頁 → 「匯入舊版 JSON」，選 `AI-Agent-learning-progress.json`。格式不符會顯示錯誤，不影響現有資料。
- **訪客 → 雲端**：登入後若偵測到本機紀錄，會提示「合併至雲端」（聯集合併，不覆蓋雲端資料）。注意：訪客模式的截圖存在本機 IndexedDB，**不會自動上傳**，合併後筆記內的本機圖片連結在其他裝置無法顯示，請重新貼上截圖。
- **備份**：設定頁可匯出／匯入完整 JSON（不含截圖檔案）。
- **筆記截圖**：在筆記框直接 `Ctrl+V` 貼上或拖放；自動壓縮（寬 ≤1600px、WebP 0.82）。
- **手機**：瀏覽器選單 →「加入主畫面」即可當 App 使用（PWA）。

## 五、目錄

```
src/data/        課綱、閃卡、測驗、導覽圖熱點、模擬器情境
src/lib/         純函式（sm2、vramCalculator、ragEngine、youtube、legacyImport…）
src/services/    LearningRepository 介面 + Local / Supabase 實作
src/components/  layout、diagrams、simulators、blueprints、media、notes、parking
tests/           Vitest 單元測試
supabase/        schema.sql（資料表 + RLS + Storage）
```

## 六、已知限制（誠實揭露）

- 三張平台導覽圖是**教學用結構化 SVG 示意**，不是實際平台截圖；實際介面依平台版本而異。
- 模擬器的數值（VRAM 係數、RAG 相似度、Release Gate 數據、Token 切分）為**教學示意估計**，非真實測量或任何廠商分詞器。
- YouTube 內嵌需連網並載入 YouTube IFrame API；離線時顯示錯誤訊息，其他功能不受影響。
- 本專案尚未連線真實 Supabase 專案驗證（無金鑰）；雲端路徑已通過型別檢查，但需用你的專案實測登入、RLS 與圖片上傳。
