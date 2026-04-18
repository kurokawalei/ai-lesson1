# ARCHITECTURE

## 系統總覽
花漾生活是單一 Node.js 專案，伺服器端同時提供：

- REST API
- EJS 頁面渲染
- 靜態資源服務

整體設計以 `app.js` 作為 Express 組裝核心，`server.js` 負責啟動程序，`src/database.js` 負責資料庫初始化與 seed，`src/routes/*` 負責 API 與頁面路由，`public/js/*` 負責前端互動邏輯。

## 目錄結構
| 路徑 | 用途 |
| --- | --- |
| `app.js` | 建立 Express app、掛載 middleware、路由、404 與 error handler |
| `server.js` | 程序入口，檢查 `JWT_SECRET` 後啟動 HTTP server |
| `src/database.js` | 建立 SQLite 連線、建立 schema、seed 管理員與商品 |
| `src/middleware/authMiddleware.js` | JWT 驗證，將登入使用者資訊寫入 `req.user` |
| `src/middleware/adminMiddleware.js` | 驗證是否為管理員角色 |
| `src/middleware/sessionMiddleware.js` | 將 `X-Session-Id` 放入 `req.sessionId` |
| `src/middleware/errorHandler.js` | 統一錯誤處理與安全訊息輸出 |
| `src/routes/authRoutes.js` | 註冊、登入、個人資料 API |
| `src/routes/productRoutes.js` | 前台商品列表與商品詳情 API |
| `src/routes/cartRoutes.js` | 雙模式購物車 API（JWT / session） |
| `src/routes/orderRoutes.js` | 使用者訂單建立、查詢、綠界付款建立與驗證 API |
| `src/routes/ecpayRoutes.js` | 綠界付款回跳與公開 callback 入口 |
| `src/routes/adminProductRoutes.js` | 管理員商品 CRUD API |
| `src/routes/adminOrderRoutes.js` | 管理員訂單列表與詳情 API |
| `src/utils/ecpay.js` | 綠界簽章、付款參數與查詢驗證工具 |
| `src/routes/pageRoutes.js` | 前台與後台 EJS 頁面入口 |
| `views/layouts/*` | 前台 / 後台版型 |
| `views/pages/*` | 具體頁面模板 |
| `public/js/pages/*` | 每個頁面的 Vue 邏輯 |
| `tests/*` | API 整合測試 |

## 啟動流程
1. `server.js` 載入 `.env` 後引入 `app.js`。
2. `app.js` 先 `require('./src/database')`，因此資料庫會在 app 建立時初始化。
3. `src/database.js` 建立 `database.sqlite` 連線，開啟 WAL 與外鍵，建立所有 tables。
4. 初始化時會 seed：
   - 管理員帳號
   - 商品資料
5. Express 安裝全域 middleware：
   - `cors`
   - `express.json()`
   - `express.urlencoded()`
   - `sessionMiddleware`
6. 掛載 API 與頁面路由。
7. 未命中路由時：
   - API 回傳 JSON 404
   - 頁面回傳 EJS 404 模板
8. 最後交由 `errorHandler` 處理未捕捉錯誤。

## API 路由總覽
| 前綴 | 檔案 | 認證 | 說明 |
| --- | --- | --- | --- |
| `/api/auth` | `src/routes/authRoutes.js` | 無 / `Bearer` | 註冊、登入、個人資料 |
| `/api/products` | `src/routes/productRoutes.js` | 無 | 前台商品列表與詳情 |
| `/api/cart` | `src/routes/cartRoutes.js` | `Bearer` 或 `X-Session-Id` | 雙模式購物車 |
| `/api/orders` | `src/routes/orderRoutes.js` | `Bearer` | 建立訂單、訂單查詢、綠界付款建立與驗證 |
| `/api/ecpay` | `src/routes/ecpayRoutes.js` | 無 | 綠界回跳與公開 callback |
| `/api/admin/products` | `src/routes/adminProductRoutes.js` | `Bearer` + admin | 後台商品管理 |
| `/api/admin/orders` | `src/routes/adminOrderRoutes.js` | `Bearer` + admin | 後台訂單管理 |

## 統一回應格式
所有 API 以同一個 envelope 輸出：

```json
{
  "data": {},
  "error": null,
  "message": "成功"
}
```

常見錯誤格式：

```json
{
  "data": null,
  "error": "UNAUTHORIZED",
  "message": "請先登入"
}
```

### 常用錯誤碼
| 錯誤碼 | 意義 |
| --- | --- |
| `VALIDATION_ERROR` | 參數格式錯誤或必填欄位缺失 |
| `UNAUTHORIZED` | 未登入、token 無效、session 缺失 |
| `FORBIDDEN` | 已登入但權限不足 |
| `NOT_FOUND` | 資源不存在 |
| `CONFLICT` | 資源衝突，例如重複註冊或不可刪除 |
| `STOCK_INSUFFICIENT` | 商品庫存不足 |
| `INVALID_STATUS` | 訂單狀態不允許付款 |
| `CART_EMPTY` | 建單時購物車為空 |

## 認證與授權
### JWT
- `authRoutes` 的登入與註冊會簽發 JWT。
- `authMiddleware` 與 admin 路由都以 `Authorization: Bearer <token>` 驗證。
- `jwt.verify` 使用演算法白名單 `HS256`。
- token payload 包含：
  - `userId`
  - `email`
  - `role`
- 有效期：`7d`
- 若 token 無效、過期、或對應 user 不存在，回應 `401 UNAUTHORIZED`。

### middleware 行為
#### `sessionMiddleware`
- 讀取 `X-Session-Id`
- 若存在則掛到 `req.sessionId`
- 不負責驗證有效性，只負責傳遞識別值

#### `authMiddleware`
- 只接受 `Authorization: Bearer ...`
- 缺 header：`401 請先登入`
- token 無效 / 過期：`401 Token 無效或已過期`
- user 不存在：`401 使用者不存在，請重新登入`
- 成功後寫入 `req.user`

#### `adminMiddleware`
- 檢查 `req.user.role === 'admin'`
- 不符合時回傳 `403 權限不足`

### 雙模式購物車認證
`cartRoutes` 使用自訂 `dualAuth`：

1. 若請求帶 `Authorization: Bearer ...`
   - 優先驗 JWT
   - 驗證成功後使用 `req.user`
   - token 無效直接回 `401`
2. 若沒有 bearer token
   - 檢查 `req.sessionId`
   - 有 session id 就允許進入
3. 兩者皆無
   - 回 `401 請提供有效的登入 Token 或 X-Session-Id`

這個機制讓使用者能在未登入前使用購物車，登入後再用 JWT 延續操作。

## 資料庫 Schema
資料庫檔案位於 `database.sqlite`，初始化時啟用：

- `journal_mode = WAL`
- `foreign_keys = ON`

### `users`
| 欄位 | 型別 | 約束 |
| --- | --- | --- |
| `id` | TEXT | PK |
| `email` | TEXT | UNIQUE, NOT NULL |
| `password_hash` | TEXT | NOT NULL |
| `name` | TEXT | NOT NULL |
| `role` | TEXT | NOT NULL, 預設 `user`, 只允許 `user` / `admin` |
| `created_at` | TEXT | NOT NULL, 預設 `datetime('now')` |

### `products`
| 欄位 | 型別 | 約束 |
| --- | --- | --- |
| `id` | TEXT | PK |
| `name` | TEXT | NOT NULL |
| `description` | TEXT | 可空 |
| `price` | INTEGER | NOT NULL, `> 0` |
| `stock` | INTEGER | NOT NULL, 預設 `0`, `>= 0` |
| `image_url` | TEXT | 可空 |
| `created_at` | TEXT | NOT NULL, 預設 `datetime('now')` |
| `updated_at` | TEXT | NOT NULL, 預設 `datetime('now')` |

### `cart_items`
| 欄位 | 型別 | 約束 |
| --- | --- | --- |
| `id` | TEXT | PK |
| `session_id` | TEXT | 可空 |
| `user_id` | TEXT | 可空, FK -> `users.id` |
| `product_id` | TEXT | NOT NULL, FK -> `products.id` |
| `quantity` | INTEGER | NOT NULL, 預設 `1`, `> 0` |

補充：
- 資料庫層沒有獨立的唯一鍵防止重複商品項目，邏輯上由 API 先查找既有項目再累加數量。
- guest 購物車透過 `session_id` 綁定，登入購物車透過 `user_id` 綁定。

### `orders`
| 欄位 | 型別 | 約束 |
| --- | --- | --- |
| `id` | TEXT | PK |
| `order_no` | TEXT | UNIQUE, NOT NULL |
| `user_id` | TEXT | NOT NULL, FK -> `users.id` |
| `recipient_name` | TEXT | NOT NULL |
| `recipient_email` | TEXT | NOT NULL |
| `recipient_address` | TEXT | NOT NULL |
| `total_amount` | INTEGER | NOT NULL |
| `status` | TEXT | NOT NULL, 預設 `pending`, 只允許 `pending` / `paid` / `failed` |
| `created_at` | TEXT | NOT NULL, 預設 `datetime('now')` |

### `order_items`
| 欄位 | 型別 | 約束 |
| --- | --- | --- |
| `id` | TEXT | PK |
| `order_id` | TEXT | NOT NULL, FK -> `orders.id` |
| `product_id` | TEXT | NOT NULL |
| `product_name` | TEXT | NOT NULL |
| `product_price` | INTEGER | NOT NULL |
| `quantity` | INTEGER | NOT NULL |

補充：
- `order_items` 保存下單當下的商品名稱與單價快照，不依賴後續商品資料。
- 這讓商品被修改或刪除後，既有訂單仍能保留歷史內容。

## 資料流
### 商品瀏覽
1. 前端透過 `/api/products` 取得商品列表。
2. 商品卡片或詳情頁再呼叫 `/api/products/:id` 取得單一商品。
3. 前台與後台都直接從同一個 `products` 表讀資料，但後台會有更多管理操作。

### 購物車
1. 前端 `Auth.getAuthHeaders()` 永遠送出 `X-Session-Id`。
2. 若已登入，同時送出 `Authorization`。
3. `cartRoutes` 根據模式決定以 `user_id` 或 `session_id` 綁定。
4. 加入購物車時若商品已存在於該擁有者的購物車，會累加數量而不是新增第二筆。
5. 更新與刪除時都以擁有者條件過濾，避免跨帳號操作。

### 下單
1. 只允許登入使用者建立訂單。
2. 從 `user_id` 對應的購物車撈出項目與商品資料。
3. 驗證收件人欄位與 email 格式。
4. 若購物車為空，回 `CART_EMPTY`。
5. 若任一項目數量超過庫存，回 `STOCK_INSUFFICIENT`。
6. 用 transaction 同時完成：
   - 建立 `orders`
   - 建立 `order_items`
   - 扣減 `products.stock`
   - 清空該使用者購物車
7. transaction 完成後回傳訂單摘要與明細。

### 綠界付款
1. 前端在訂單詳情頁呼叫 `/api/orders/:id/ecpay/checkout` 取得 AIO 付款參數。
2. 瀏覽器以自動送出的 HTML form 前往綠界付款頁。
3. 綠界付款完成後，瀏覽器會被導回本機的 `OrderResultURL`。
4. 本機頁面再主動呼叫 `/api/orders/:id/ecpay/verify`。
5. 驗證端點使用 `QueryTradeInfo/V5` 重新查詢綠界交易狀態，確認 `TradeStatus=1` 與金額一致後，才把 `orders.status` 更新為 `paid`。
6. `ReturnURL` 仍保留為標準 AIO 參數，但本專案不依賴綠界的伺服器回呼完成付款確認。

## 第三方整合現況
目前程式碼中的 `ECPay_*` 環境變數已用於 AIO 建單與 QueryTradeInfo 查詢。

現階段流程只有：

- 前台建立訂單
- 訂單詳情頁取得綠界付款參數並導向 AIO 付款頁
- 瀏覽器回到本機後主動呼叫查詢 API 驗證付款結果
- 以 `orders.status` 反映最終付款結果

因此文件中若提及金流，應將它視為「未完成的整合預留欄位」，不是已上線的付款流程。
