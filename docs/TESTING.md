# TESTING

## 測試規範
目前測試屬於 API 整合測試，使用 Vitest + Supertest 對 `app.js` 進行請求。測試設計帶有明顯狀態依賴，因此執行順序與資料共享是必須被維持的。

## 執行指令
```bash
npm test
```

注意：
- 本專案的正確執行方式是 `npm test`
- `vitest` 目前不接受 `--runInBand`，加上該參數會直接報錯

## 測試檔案表
| 檔案 | 範圍 | 依賴 |
| --- | --- | --- |
| `tests/auth.test.js` | 註冊、登入、profile | `tests/setup.js` |
| `tests/products.test.js` | 前台商品列表與詳情 | `tests/setup.js` |
| `tests/cart.test.js` | guest / auth 購物車 | `tests/setup.js`，商品資料 |
| `tests/orders.test.js` | 訂單建立、列表、詳情、舊版付款相容 | `tests/setup.js`，購物車狀態 |
| `tests/ecpay.test.js` | 綠界付款單建立、回跳與查詢驗證 | `tests/setup.js`，`src/utils/ecpay.js`，mock `fetch` |
| `tests/adminProducts.test.js` | 管理員商品 CRUD | `tests/setup.js`，admin token |
| `tests/adminOrders.test.js` | 管理員訂單列表與詳情 | `tests/setup.js`，前置訂單資料 |

## 執行順序與依賴關係
`vitest.config.js` 已固定檔案順序，且 `fileParallelism: false`，原因是測試彼此共用同一個 SQLite 資料庫與 seed 資料。

固定順序如下：
1. `tests/auth.test.js`
2. `tests/products.test.js`
3. `tests/cart.test.js`
4. `tests/orders.test.js`
5. `tests/ecpay.test.js`
6. `tests/adminProducts.test.js`
7. `tests/adminOrders.test.js`

### 為什麼要固定順序
- `auth.test.js` 會產生新使用者與 token，後續測試會再次使用 helper 建立登入狀態
- `cart.test.js` 需要先從商品列表取得 product id
- `orders.test.js` 會先建立購物車，再依賴該購物車建立訂單
- `ecpay.test.js` 會先建立訂單，再 mock `fetch` 驗證 QueryTradeInfo / 回跳流程
- `adminOrders.test.js` 需要先有一筆真實訂單，才能測後台詳情

## `tests/setup.js` 輔助函式
### `app`
- 匯入 `../app`
- 讓各測試直接對同一個 Express app 發送請求

### `request`
- 來自 `supertest`
- 用來建立 HTTP 測試請求

### `getAdminToken()`
- 以預設 seed 管理員登入
- 回傳 JWT token
- 測試中多用於 admin 路由驗證

### `registerUser(overrides = {})`
- 自動建立唯一 email
- 回傳 `{ token, user }`
- 方便在測試中快速取得一般使用者身分

## 撰寫新測試的步驟
1. 先確認新功能會影響哪些現有測試資料。
2. 優先放進對應主題測試檔，避免新增不必要的檔案。
3. 若需要身份，直接使用 `getAdminToken()` 或 `registerUser()`。
4. 測試資料若會影響後續案例，請維持既有順序或新增獨立 setup。
5. 明確檢查：
   - status code
   - `data`
   - `error`
   - 關鍵業務欄位
6. 若新增 API 或錯誤碼，補 OpenAPI 註解與 `docs/FEATURES.md`。

### 新測試範例
```js
const { app, request } = require('./setup');

it('should return product list', async () => {
  const res = await request(app).get('/api/products');

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('data');
  expect(res.body).toHaveProperty('error', null);
  expect(Array.isArray(res.body.data.products)).toBe(true);
});
```

## 常見陷阱
### 1. 資料庫是共享狀態
所有測試共用同一個 `database.sqlite`。如果某個測試刪掉或改寫 seed 資料，後面測試可能會失敗。

### 2. 購物車與訂單高度依賴前置流程
訂單測試不是單純打 API 而已，它先要：
- 建立使用者
- 找商品 id
- 先加入購物車
- 再建立訂單

### 3. guest 與登入購物車是兩條路
購物車測試同時涵蓋：
- `X-Session-Id`
- `Authorization`

如果少帶其中一種 header，結果會變成不同 owner。

### 4. 登入 token 不能省略
`apiFetch()` 在前端與測試共通的概念都是：遇到 401 代表身份失效，需要重新登入。

### 5. 測試執行參數不要硬套其他 runner
`npm test` 是 Vitest 的正確入口；像 Jest 的 `--runInBand` 在這裡無效。

## 驗證重點
新增功能後，至少要確認：
- 路由有測到 200 / 201 / 400 / 401 / 403 / 404 / 409 等對應情境
- 回應格式仍維持統一 envelope
- 會寫入資料庫的流程沒有破壞既有 seed
- 付款或訂單流程仍保有 transaction 與狀態限制
