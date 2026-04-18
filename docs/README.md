# README

## 項目介紹
花漾生活是一個以花卉商品為核心的電商示範專案，結合前台商品瀏覽、購物車、結帳、訂單查詢，以及後台商品與訂單管理。系統採用 Node.js 與 Express 提供 API 與伺服器端頁面渲染，資料持久化使用 SQLite，前端互動則由 Vue 3 與少量原生 JavaScript 完成。

這個專案的重點不是單純展示頁面，而是示範一個完整的電商資料流：

- 前台訪客可不登入先使用 session 購物車
- 登入後可切換為 JWT 驗證，繼續操作購物車與訂單
- 訂單建立時會檢查購物車、庫存與收件資訊
- 訂單付款採綠界 AIO 金流，付款結果由本機主動呼叫查詢 API 驗證
- 後台管理者可管理商品與查看訂單

## 技術棧
- 後端：Node.js、Express、CommonJS
- 資料庫：SQLite、better-sqlite3
- 認證：JSON Web Token、`X-Session-Id`
- 模板：EJS
- 前端：Vue 3、原生 JavaScript
- 樣式：Tailwind CSS 4
- 文件：Swagger / OpenAPI、Markdown
- 測試：Vitest、Supertest

## 快速開始
```bash
npm install
cp .env .env.local  # 或直接編輯現有 .env
npm run css:build
npm start
```

啟動後：
- 前台：http://localhost:3001
- API 基底：`http://localhost:3001/api`
- 預設管理員：`admin@hexschool.com` / `12345678`

## 常用指令
| 指令 | 說明 |
| --- | --- |
| `npm start` | 建置 CSS 後啟動網站 |
| `npm run dev:server` | 直接啟動伺服器 |
| `npm run dev:css` | 監看 Tailwind 輸入檔並即時輸出 CSS |
| `npm run css:build` | 產生正式版 CSS |
| `npm run openapi` | 產生 `openapi.json` |
| `npm test` | 執行全部測試 |

## 文件索引
| 文件 | 內容 |
| --- | --- |
| [AGENTS.md](/mnt/d/AI-lesson/homework_1/AGENTS.md) | 專案概述、常用指令、關鍵規則 |
| [docs/ARCHITECTURE.md](/mnt/d/AI-lesson/homework_1/docs/ARCHITECTURE.md) | 架構、路由、schema、資料流 |
| [docs/DEVELOPMENT.md](/mnt/d/AI-lesson/homework_1/docs/DEVELOPMENT.md) | 開發規範、環境變數、命名 |
| [docs/FEATURES.md](/mnt/d/AI-lesson/homework_1/docs/FEATURES.md) | 功能行為與完成狀態 |
| [docs/TESTING.md](/mnt/d/AI-lesson/homework_1/docs/TESTING.md) | 測試規範與執行順序 |
| [docs/CHANGELOG.md](/mnt/d/AI-lesson/homework_1/docs/CHANGELOG.md) | 更新紀錄 |
