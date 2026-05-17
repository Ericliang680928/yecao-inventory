# 🌾 野草倉庫盤點系統

基於 Google Sheets 的倉庫盤點管理系統。React 前端 + Node.js/Express 後端，所有資料存入 Google 試算表，**後端同時提供 API 與前端靜態檔案（單一 port 3001）**。

---

## 快速啟動

### 前置條件

- Node.js v18+
- Google Service Account 金鑰已設定於 `server/.env`

### 第一次啟動

```bash
# 1. 安裝後端套件
cd 盤點系統/server
npm install

# 2. 安裝前端套件並 build
cd ..
npm install
npm run build

# 3. 啟動（只需一個視窗）
cd server
node index.js
# → 開啟 http://localhost:3001
```

或直接雙擊 `啟動後端.bat`（會自動終止舊 Node 程序後重啟）。

**首次啟動**若尚未設定 `INVENTORY_SHEET_ID`，會自動建立試算表並輸出 ID：

```
╔══════════════════════════════════════════╗
║  ✅  試算表建立完成！                     ║
║  ID: 1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  ║
╚══════════════════════════════════════════╝
```

將 ID 填入 `server/.env` 的 `INVENTORY_SHEET_ID=`，重啟後端即可。

---

## 日常啟動

雙擊 `啟動後端.bat`，開啟瀏覽器前往 `http://localhost:3001`。

**預設管理員帳號：**

| 帳號 | 密碼 |
|------|------|
| admin | Admin@1234 |

> 可在 `server/.env` 透過 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 修改預設值。

---

## 環境變數（`server/.env`）

| 變數 | 說明 | 必填 |
|------|------|------|
| `PORT` | 伺服器 Port（預設 3001） | 否 |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | 服務帳號 Email | ✅ |
| `GOOGLE_PRIVATE_KEY` | 服務帳號私鑰（含換行符號） | ✅ |
| `SOURCE_SHEET_ID` | 來源產品清單試算表 ID | ✅ |
| `SOURCE_SHEET_NAME` | 來源工作表名稱（預設：產品名單） | ✅ |
| `INVENTORY_SHEET_ID` | 盤點專屬試算表 ID（首次啟動後填入） | ✅ |
| `OWNER_EMAIL` | 試算表自動共用的 Email | 否 |
| `JWT_SECRET` | JWT 簽名金鑰（請更改為強密碼） | ✅ |
| `ADMIN_USERNAME` | 預設管理員帳號（預設：admin） | 否 |
| `ADMIN_PASSWORD` | 預設管理員密碼（預設：Admin@1234） | 否 |

---

## 來源試算表格式

同步功能會從 `SOURCE_SHEET_ID` 試算表的 `SOURCE_SHEET_NAME` 頁籤讀取商品清單：

| 欄位 | 內容 |
|------|------|
| A 欄 | 商品編號（唯一識別碼） |
| B 欄 | 商品名稱 |
| C 欄 | 類別 |

第 1 列為標題列，資料從第 2 列開始。

---

## 頁面說明

| 頁面 | 路徑 | 功能 |
|------|------|------|
| 登入 | `/login` | JWT 帳號登入 |
| 首頁儀表板 | `/` | 今日盤點進度、快速入口 |
| 批次列表 | `/batches` | 所有盤點批次 |
| 建立批次 | `/batches/new` | 選日期、建批次 |
| 盤點作業 | `/batches/:id` | 快速輸入、Enter 跳行、自動儲存 |
| 差異覆核 | `/batches/:id/review` | 填差異原因、覆核確認 |
| 歷史查詢 | `/history` | 已結案批次的明細 |
| 同步管理 | `/sync` | 管理員同步產品清單（僅 admin） |

---

## API 說明

| Method | 路徑 | 說明 | 權限 |
|--------|------|------|------|
| POST | `/api/auth/login` | 登入 | 公開 |
| GET | `/api/auth/me` | 取得目前使用者 | 已登入 |
| GET | `/api/products` | 取得產品列表 | 已登入 |
| POST | `/api/sync` | 同步來源產品 | admin |
| GET | `/api/batches` | 取得所有批次 | 已登入 |
| GET | `/api/batches/dashboard` | 今日儀表板統計 | 已登入 |
| POST | `/api/batches` | 建立盤點批次 | 已登入 |
| GET | `/api/batches/:id/items` | 批次明細 | 已登入 |
| PUT | `/api/batches/:id/items/:pid` | 更新盤點數量 | 已登入 |
| PATCH | `/api/batches/:id/status` | 更新批次狀態 | 已登入 |
| GET | `/api/users` | 使用者列表 | admin |
| POST | `/api/users` | 新增使用者 | admin |
| PATCH | `/api/users/:username` | 更新使用者 | admin |

---

## 權限矩陣

| 功能 | admin | reviewer（覆核員） | counter（盤點員） |
|------|:-----:|:------------------:|:----------------:|
| 登入/檢視 | ✅ | ✅ | ✅ |
| 建立盤點批次 | ✅ | ✅ | ✅ |
| 輸入盤點數量 | ✅ | ✅ | ✅ |
| 差異覆核 | ✅ | ✅ | ❌ |
| 批次結案 | ✅ | ✅ | ❌ |
| 同步產品清單 | ✅ | ❌ | ❌ |
| 管理使用者 | ✅ | ❌ | ❌ |

---

## Google Sheet 結構

系統自動建立「野草盤點系統」試算表，包含 6 個工作表：

1. **使用者** — 帳號 / 密碼(bcrypt) / 角色 / 啟用
2. **產品主檔** — 商品編號 / 名稱 / 類別 / 啟用 / 帳面庫存 / 同步時間
3. **盤點批次** — 批次ID / 日期 / 建立人 / 開始時間 / 完成時間 / 狀態
4. **盤點明細** — 批次ID / 商品 / 帳面 / 實盤 / 差異 / 原因 / 覆核 + 審計欄位
5. **庫存現況** — 目前帳面庫存快照
6. **同步日誌** — 每次同步的結果記錄

---

## 架構說明

```
盤點系統/
├── dist/                # Vite 打包後的前端靜態檔案
├── src/                 # React 前端原始碼（TypeScript）
├── server/
│   ├── index.js         # Express 主程式（同時服務 API 與 dist/）
│   ├── routes/          # API 路由（auth / products / batches / sync / users）
│   ├── services/
│   │   └── sheets.js    # Google Sheets 讀寫服務層
│   ├── middleware/
│   │   └── auth.js      # JWT 驗證中間件
│   └── .env             # 環境變數（不納入版控）
├── 啟動後端.bat          # 一鍵啟動（含自動 kill 舊程序）
└── README.md
```

**單一 port 設計**：`server/index.js` 在 API 路由之後，使用 `express.static` 提供 `dist/`，並設定 SPA fallback（非 `/api` 路徑一律回傳 `index.html`）。只需啟動後端即可存取完整系統。

---

## 並發與一致性

- **樂觀鎖定**：每個盤點項目有 `version` 時間戳，同時更新時回傳 409 衝突提示
- **自動儲存**：失焦或按 Enter 時立即儲存（無需手動點儲存）
- **歷史不可改**：已結案批次的項目無法再編輯（API 層強制執行）
