# DEVELOPMENT

## 開發規範
本專案採用「先讀結構，再改行為」的方式維護。新增功能前，先確認它會影響哪些層：

- API 合約
- 資料庫 schema
- 前端頁面腳本
- 測試順序
- 文件同步更新

只要一個改動會讓其他模組需要配合修改，就必須同時更新 `docs/FEATURES.md`、`docs/ARCHITECTURE.md` 或 `docs/CHANGELOG.md` 中對應段落。

## 模組系統說明
### 後端
- 後端程式以 CommonJS 為主
- 檔案使用 `require(...)` 與 `module.exports`
- 主要範圍：
  - `app.js`
  - `server.js`
  - `src/**/*.js`
  - `tests/**/*.js`

### 測試設定
- `vitest.config.js` 使用 ESM
- 測試檔以 CommonJS `require` 引入應用程式
- `tests/setup.js` 集中封裝測試 helper

### 前端
- 前台 / 後台頁面都透過 EJS 插入 `public/js/pages/*.js`
- Vue 3 以 CDN 載入，頁面腳本在瀏覽器端直接執行

## 命名規則對照表
| 類型 | 命名規則 | 範例 |
| --- | --- | --- |
| API 路由檔 | `*Routes.js` | `authRoutes.js`, `cartRoutes.js` |
| middleware | `*Middleware.js` | `authMiddleware.js`, `errorHandler.js` |
| 頁面腳本 | `kebab-case.js` | `admin-products.js`, `order-detail.js` |
| EJS 頁面 | `kebab-case` 與巢狀資料夾並存 | `product-detail.ejs`, `admin/orders.ejs` |
| 測試檔 | `*.test.js` | `auth.test.js`, `adminOrders.test.js` |
| 資料表 | 複數名詞 | `users`, `products`, `orders` |
| 資料欄位 | `snake_case` | `created_at`, `order_no`, `recipient_email` |
| 前端 JS 變數 | `camelCase` | `cartItemId`, `orderId`, `statusFilter` |
| 前端 Vue data | `camelCase` | `detailVisible`, `paymentResult` |

補充：
- 資料庫欄位與 API 輸出多為 `snake_case`
- 前端邏輯與 JS 內部變數維持 `camelCase`
- 新增程式碼時，優先沿用既有命名，不要在同一模組內混用兩套風格

## 新增 API 的步驟
1. 先確認資源屬於公開、登入、還是管理員範圍。
2. 在對應 `src/routes/*.js` 新增 endpoint。
3. 若需要驗證，選擇：
   - `authMiddleware`
   - `adminMiddleware`
   - `cartRoutes` 的 `dualAuth` 模式
4. 定義 request validation 與錯誤碼。
5. 確定 response 繼續遵守 `{ data, error, message }`。
6. 更新 `swagger` 註解，讓 `npm run openapi` 可以產出正確規格。
7. 若 API 會被前端頁面使用，更新對應 `public/js/pages/*.js`。
8. 新增或調整 `tests/*.test.js`。
9. 把行為寫進 `docs/FEATURES.md` 與必要的架構段落。

## 新增 middleware 的步驟
1. 放入 `src/middleware/`
2. 保持單一職責
3. 定義它是：
   - 請求前置驗證
   - 角色授權
   - 資料注入
   - 錯誤處理
4. 若 middleware 會寫入 `req`，必須在文件明確標示寫入欄位
5. 若 middleware 回傳錯誤，請列出所有可能的 HTTP 狀態與 `error` code
6. 在路由層標明掛載順序，因為 middleware 順序會影響 `req.user` / `req.sessionId`

## 新增 DB / schema 的步驟
1. 先修改 `src/database.js` 的建表 SQL。
2. 若欄位會被前端或 API 使用，確認輸出格式與既有欄位命名一致。
3. 若新增欄位需要 seed，更新 `seedProducts()` 或對應 seed 函式。
4. 若加入新關聯，確認 `foreign_keys` 與 transaction 行為。
5. 若 schema 變更會影響測試資料，更新 `tests/setup.js` 與相關測試案例。

## JSDoc / OpenAPI 格式
目前路由檔使用 `@openapi` 註解區塊描述 endpoint。撰寫原則如下：

- 一個 endpoint 一段註解
- 明確列出 path、query、requestBody、responses
- `security` 要標出需要 bearer 或 session 的情況
- 回應範例需與實際 API 一致
- 若 endpoint 有特殊行為，例如雙模式認證、交易式扣庫存、付款模擬，註解也要寫明

### 範例
```js
/**
 * @openapi
 * /api/products/{id}:
 *   get:
 *     summary: 取得商品詳情
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 */
```

## 環境變數表
| 變數 | 用途 | 必要性 | 預設值 |
| --- | --- | --- | --- |
| `JWT_SECRET` | 簽發與驗證 JWT | 必要，`server.js` 啟動時檢查 | 無 |
| `PORT` | HTTP 伺服器埠號 | 選填 | `3001` |
| `BASE_URL` | 專案基底網址 | 選填 | `http://localhost:3001` |
| `FRONTEND_URL` | CORS 允許來源 | 選填 | `http://localhost:5173` |
| `ADMIN_EMAIL` | seed 管理員帳號 | 選填 | `admin@hexschool.com` |
| `ADMIN_PASSWORD` | seed 管理員密碼 | 選填 | `12345678` |
| `ECPAY_MERCHANT_ID` | ECPay 商店代號預留 | 目前未使用 | `3002607` |
| `ECPAY_HASH_KEY` | ECPay hash key 預留 | 目前未使用 | `pwFHCqoQZGmho4w6` |
| `ECPAY_HASH_IV` | ECPay hash iv 預留 | 目前未使用 | `EkRm7iFT261dpevs` |
| `ECPAY_ENV` | 金流環境預留 | 目前未使用 | `staging` |

注意：
- `BASE_URL` 會被綠界付款參數組裝使用，作為本機回跳與導流基底
- `ECPAY_*` 目前已用於 AIO 建單與 QueryTradeInfo 查詢，變更前要一併確認金流流程

## 計畫歸檔流程
1. 計畫檔案命名格式：`YYYY-MM-DD-<feature-name>.md`
2. 計畫文件結構：User Story → Spec → Tasks
3. 功能完成後：移至 `docs/plans/archive/`
4. 更新 `docs/FEATURES.md` 和 `docs/CHANGELOG.md`

## 開發習慣
- 新功能先寫計畫，再寫程式，再補文件
- 會動到購物車或訂單的改動，先檢查測試是否依賴固定順序
- 如果變更會影響 OpenAPI，優先同步 `@openapi` 註解
- 任何新增 API 都要考慮前端 `apiFetch()` 的 401 跳轉行為
