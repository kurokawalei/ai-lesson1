# AGENTS.md

## 專案概述
花漾生活（Flower Life） - Node.js / Express / EJS / SQLite 的花卉電商網站，前台以 Vue 3 + 原生 JS 驅動互動，後端以 CommonJS 模組、JWT 驗證與 SQLite 資料庫提供 REST API。

## 常用指令
- `npm start` - 先執行 CSS build，再啟動 `server.js`
- `npm run dev:server` - 直接以 Node 啟動伺服器
- `npm run dev:css` - 監看 Tailwind 輸入檔並輸出 `public/css/output.css`
- `npm run css:build` - 產生 minify 後的 CSS
- `npm run openapi` - 由路由註解產生 `openapi.json`
- `npm test` - 執行 Vitest 測試

## 關鍵規則
- 後端 API 一律回傳 `{ data, error, message }` 的統一格式；`error` 為機器可讀錯誤碼，`data` 成功時承載結果。
- `authMiddleware` 只接受 `Authorization: Bearer <JWT>`；`cartRoutes` 是唯一支援雙模式認證的區塊，需接受 JWT 或 `X-Session-Id`。
- `adminMiddleware` 必須接在 `authMiddleware` 之後使用，否則 `req.user.role` 不會存在。
- 購物車、訂單、商品變更涉及庫存時，必須以現有 transaction / stock 檢查規則為準，不可在文件與實作間拆開描述。
- 功能開發使用 `docs/plans/` 記錄計畫；完成後移至 `docs/plans/archive/`

## 詳細文件
- [./docs/README.md](/mnt/d/AI-lesson/homework_1/docs/README.md) - 項目介紹與快速開始
- [./docs/ARCHITECTURE.md](/mnt/d/AI-lesson/homework_1/docs/ARCHITECTURE.md) - 架構、目錄結構、資料流
- [./docs/DEVELOPMENT.md](/mnt/d/AI-lesson/homework_1/docs/DEVELOPMENT.md) - 開發規範、命名規則
- [./docs/FEATURES.md](/mnt/d/AI-lesson/homework_1/docs/FEATURES.md) - 功能列表與完成狀態
- [./docs/TESTING.md](/mnt/d/AI-lesson/homework_1/docs/TESTING.md) - 測試規範與指南
- [./docs/CHANGELOG.md](/mnt/d/AI-lesson/homework_1/docs/CHANGELOG.md) - 更新日誌

