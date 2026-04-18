# FEATURES

## 功能總覽
下列功能皆以目前 repository 的實作為準。若文件與程式碼未來不同步，應優先以程式碼驗證，再更新文件。

---

## 1. 帳號系統
### 功能說明
帳號系統提供註冊、登入與個人資料查詢。前端登入成功後，token 與 user 資訊會被存入 `localStorage`，讓後續 API 請求可以自動帶上 `Authorization` header。

### 註冊
#### 行為描述
- 使用者以 email、密碼、姓名註冊新帳號。
- 系統會先做基本欄位檢查，再檢查 email 是否重複。
- 密碼會用 bcrypt 雜湊後寫入資料庫。
- 成功後會直接簽發 JWT，等同於註冊即登入。

#### request body
| 欄位 | 必填 | 說明 |
| --- | --- | --- |
| `email` | 是 | 必須符合 email 格式 |
| `password` | 是 | 長度至少 6 |
| `name` | 是 | 使用者姓名 |

#### 查詢參數
無。

#### 業務邏輯
- 檢查 `email`、`password`、`name` 是否存在
- `email` 必須符合基本 regex
- `password.length < 6` 直接拒絕
- 若 `users.email` 已存在，回 `409`
- 建立 `users` 資料時角色固定為 `user`
- JWT payload 會包含 `userId`、`email`、`role`
- token 有效期為 `7d`

#### 錯誤情境
- `400 VALIDATION_ERROR`：缺欄位、email 格式錯誤、密碼太短
- `409 CONFLICT`：email 已被註冊

### 登入
#### 行為描述
- 使用 email 與密碼登入。
- 系統比對 bcrypt hash，成功後簽發 JWT。
- 前端成功後會將 token 與 user 存入 localStorage。

#### request body
| 欄位 | 必填 | 說明 |
| --- | --- | --- |
| `email` | 是 | 登入帳號 |
| `password` | 是 | 明文密碼 |

#### 業務邏輯
- 先檢查欄位是否存在
- 透過 email 找 user
- 用 bcrypt compare 驗證密碼
- 成功後回傳 user 精簡資料與 token

#### 錯誤情境
- `400 VALIDATION_ERROR`：缺 email 或 password
- `401 UNAUTHORIZED`：帳號不存在或密碼錯誤

### 個人資料
#### 行為描述
- 透過 JWT 查詢目前登入者的基本資料。
- 只回傳安全欄位，不包含 `password_hash`。

#### 認證
- 需要 `Bearer` token

#### 錯誤情境
- `401 UNAUTHORIZED`：未登入或 token 無效
- `404 NOT_FOUND`：token 解析成功，但對應使用者不存在

---

## 2. 商品瀏覽
### 功能說明
前台商品列表與商品詳情都來自同一份 `products` 資料表。商品頁主要負責展示與加入購物車，不做權限限制。

### 商品列表
#### 行為描述
- 支援分頁查詢
- 依 `created_at DESC` 排序
- 回傳商品陣列與 pagination 資訊

#### 查詢參數
| 參數 | 預設值 | 說明 |
| --- | --- | --- |
| `page` | `1` | 頁碼，最小值為 1 |
| `limit` | `10` | 每頁筆數，範圍限制為 1 到 100 |

#### 錯誤情境
此 endpoint 目前沒有專門的 4xx/5xx 業務錯誤，正常情況永遠回 200。

### 商品詳情
#### 行為描述
- 以商品 ID 取得單筆商品
- 找不到商品時回 404
- 前端詳情頁會依據庫存控制數量增減

#### 路徑參數
| 參數 | 必填 | 說明 |
| --- | --- | --- |
| `id` | 是 | 商品 ID |

#### 錯誤情境
- `404 NOT_FOUND`：商品不存在

---

## 3. 購物車
### 功能說明
購物車是本專案最重要的雙模式模組。未登入使用者可用 `X-Session-Id` 持有購物車；登入使用者可用 JWT 持有購物車。前端會兩者都送，後端決定使用哪一種識別。

### 查看購物車
#### 行為描述
- 回傳該擁有者所有 cart items
- 每個 item 都包含 product 快照資料：名稱、單價、庫存、圖片
- `total` 是所有項目 `price * quantity` 的加總

#### 認證方式
- `Bearer` JWT
- 或 `X-Session-Id`

#### 業務邏輯
- 後端根據 `req.user` 或 `req.sessionId` 決定 owner
- guest 與登入狀態使用不同欄位查詢
- 回傳時會把 DB join 後的欄位整理成 `item.product`

### 加入商品
#### 行為描述
- 加入購物車時會先檢查商品是否存在
- 若同一 owner 已經有該商品，則累加數量
- 不會直接建立第二筆相同商品的 cart item
- 數量不能超過商品庫存

#### request body
| 欄位 | 必填 | 預設值 | 說明 |
| --- | --- | --- | --- |
| `productId` | 是 | 無 | 商品 ID |
| `quantity` | 否 | `1` | 必須為正整數 |

#### 業務邏輯
- `quantity` 會先 `parseInt`
- `qty < 1` 拒絕
- 商品不存在回 404
- 若新數量大於庫存回 `STOCK_INSUFFICIENT`
- 成功後回傳 item id、product_id、quantity

#### 錯誤情境
- `400 VALIDATION_ERROR`：缺 productId、quantity 不合法
- `404 NOT_FOUND`：商品不存在
- `400 STOCK_INSUFFICIENT`：加購後超過庫存

### 修改數量
#### 行為描述
- 只能修改自己 owner 名下的 cart item
- 數量必須為正整數
- 不能超過庫存

#### request body
| 欄位 | 必填 | 說明 |
| --- | --- | --- |
| `quantity` | 是 | 正整數 |

#### 錯誤情境
- `400 VALIDATION_ERROR`：quantity 不合法
- `404 NOT_FOUND`：項目不存在或不屬於自己
- `400 STOCK_INSUFFICIENT`：超出庫存

### 移除商品
#### 行為描述
- 只能刪除自己 owner 名下的 cart item
- 成功後回傳空 data

#### 錯誤情境
- `404 NOT_FOUND`：項目不存在或不屬於自己

### 非標準機制
購物車的雙模式認證是本專案的特殊設計。前端統一透過 `Auth.getAuthHeaders()` 帶出：

- `Authorization`：登入後存在
- `X-Session-Id`：永遠存在，未登入時作為 guest 身份

後端則以 JWT 優先，session 為 fallback。

---

## 4. 訂單
### 功能說明
訂單功能包含建立、列表、詳情與綠界付款驗證。建立訂單時會同步處理庫存與購物車清空，因此它是唯一具有明確 transaction 的業務流程。

### 建立訂單
#### 行為描述
- 只允許已登入使用者建立訂單
- 訂單來源固定是該使用者的購物車
- 收件資訊必須完整且 email 格式正確
- 建單時會先驗證購物車是否為空
- 只要有任何商品庫存不足，整筆訂單就會被拒絕
- 成功時使用 transaction 同時完成訂單建立、明細寫入、扣庫存、清空購物車

#### request body
| 欄位 | 必填 | 說明 |
| --- | --- | --- |
| `recipientName` | 是 | 收件人姓名 |
| `recipientEmail` | 是 | 收件人 email |
| `recipientAddress` | 是 | 收件地址 |

#### 業務邏輯
- 先抓出該 user 的 `cart_items`
- 若沒有任何 item，回 `CART_EMPTY`
- 若任一 item 的 quantity 大於目前 product stock，回 `STOCK_INSUFFICIENT`
- `total_amount` 是所有項目單價乘數量的加總
- `order_no` 由日期加隨機字串組成，格式為 `ORD-YYYYMMDD-XXXXX`
- `order_items` 會保存商品名稱與單價快照

#### 錯誤情境
- `400 VALIDATION_ERROR`：收件資訊缺失或 email 格式錯誤
- `400 CART_EMPTY`：購物車為空
- `400 STOCK_INSUFFICIENT`：庫存不足

### 訂單列表
#### 行為描述
- 只看自己的訂單
- 依建立時間倒序
- 回傳訂單摘要，不包含每一筆商品明細

#### 錯誤情境
通常為 200；若未登入則由 middleware 擋下。

### 訂單詳情
#### 行為描述
- 只看自己的訂單
- 回傳完整 order 與 items

#### 錯誤情境
- `404 NOT_FOUND`：訂單不存在或非自己訂單

### 綠界付款
#### 行為描述
- 訂單詳情頁提供「前往綠界付款」與「確認付款狀態」兩個動作
- `checkout` 端點會產生 AIO 付款表單參數，前端以自動 submit form 導向綠界
- 本專案不依賴綠界的伺服器回呼來確認付款，真正的付款確認由本機主動呼叫 QueryTradeInfo 取得
- 使用者從綠界付款完成後，瀏覽器會回到本機的 `OrderResultURL`，再由本機頁面自動觸發查詢
- `verify` 端點會比對 `MerchantTradeNo` 與訂單金額，只有查詢結果 `TradeStatus=1` 才會把訂單標記成 `paid`

#### request body
無，兩個端點都不需要額外 body。

#### 業務邏輯
- `checkout` 只接受 `pending` 訂單
- 付款表單參數包含 `MerchantTradeNo`、`TotalAmount`、`ItemName`、`ReturnURL`、`OrderResultURL`
- `OrderResultURL` 只負責把瀏覽器導回本機，不是付款結果的最終依據
- `verify` 會主動呼叫綠界 `QueryTradeInfo/V5`
- `verify` 若查到 `TradeStatus=1`，且金額相符，就把 `orders.status` 更新為 `paid`
- `verify` 若尚未付款，則維持 `pending`

#### 錯誤情境
- `400 INVALID_STATUS`：訂單已付款，無法重新建立付款單
- `400 ECPAY_TRADE_NO_MISMATCH`：查詢回傳的 `MerchantTradeNo` 與本機訂單不一致
- `400 ECPAY_AMOUNT_MISMATCH`：查詢回傳金額與本機訂單總額不同
- `400 ECPAY_QUERY_INVALID`：查詢回應檢查碼失敗
- `400 ECPAY_QUERY_EMPTY`：查詢回應為空
- `404 NOT_FOUND`：訂單不存在

#### 非標準機制
- AIO 的 `ReturnURL` 仍存在於建立付款參數中，但本機部署情境下不依賴它完成確認
- `OrderResultURL` 是瀏覽器回跳，並不是最終驗證依據
- 真正的付款確認採「本機主動查詢」模式，這是本專案最重要的付款流程差異

---

## 5. 後台商品管理
### 功能說明
後台商品管理提供商品列表、新增、編輯與刪除。所有路由都必須先登入，且角色必須是 admin。

### 共通行為
- 全部路由都套用 `authMiddleware + adminMiddleware`
- 未登入回 `401`
- 登入但非 admin 回 `403`

### 商品列表
#### 行為描述
- 與前台相同的分頁規則
- 後台可查看完整商品資料

### 新增商品
#### request body
| 欄位 | 必填 | 說明 |
| --- | --- | --- |
| `name` | 是 | 商品名稱 |
| `description` | 否 | 商品描述 |
| `price` | 是 | 正整數且大於 0 |
| `stock` | 是 | 非負整數 |
| `image_url` | 否 | 圖片網址 |

#### 錯誤情境
- `400 VALIDATION_ERROR`：缺 name、price 非正整數、stock 非法

### 編輯商品
#### 行為描述
- 可部分更新
- 未提供欄位會沿用舊值
- 若名稱有傳但為空字串，會視為錯誤
- 更新時會同步寫入 `updated_at`

#### 錯誤情境
- `404 NOT_FOUND`：商品不存在
- `400 VALIDATION_ERROR`：欄位格式不合法

### 刪除商品
#### 行為描述
- 若商品仍存在於任何 `pending` 訂單中，禁止刪除
- 這個規則避免前台尚未完成的訂單找不到對應商品資訊

#### 錯誤情境
- `404 NOT_FOUND`：商品不存在
- `409 CONFLICT`：商品存在未完成訂單，無法刪除

---

## 6. 後台訂單管理
### 功能說明
後台訂單管理提供訂單列表與訂單詳情，供管理員查看所有使用者訂單。

### 訂單列表
#### 行為描述
- 支援分頁
- 可用 `status` 篩選
- 狀態合法值只有 `pending`、`paid`、`failed`
- 若 `status` 無效，會忽略篩選，視同查全部

#### 查詢參數
| 參數 | 預設值 | 說明 |
| --- | --- | --- |
| `page` | `1` | 頁碼 |
| `limit` | `10` | 每頁筆數 |
| `status` | 空 | 可選狀態篩選 |

### 訂單詳情
#### 行為描述
- 回傳 order、order_items 與 user 資訊
- 對於管理員而言可查看完整收件與客戶資訊

#### 錯誤情境
- `404 NOT_FOUND`：訂單不存在

---

## 7. 前台 / 後台頁面
### 功能說明
頁面層使用 EJS 產生 HTML，再由 Vue 3 於瀏覽器端掛載。頁面腳本與 API 相互配合，但頁面本身不直接操作資料庫。

### 前台頁面
- `/`：商品首頁
- `/products/:id`：商品詳情
- `/cart`：購物車
- `/checkout`：結帳頁
- `/login`：登入 / 註冊
- `/orders`：我的訂單
- `/orders/:id`：訂單詳情與綠界付款驗證

### 後台頁面
- `/admin/products`：商品管理
- `/admin/orders`：訂單管理

### 非標準機制
- 前台 header 會依登入狀態切換導覽項目
- 後台 layout 透過前端 `Auth.requireAdmin()` 做第一層導頁保護
- 前端若遇到 API `401`，會自動清除登入資訊並導回 `/login`
