# CHANGELOG

## [Unreleased]
### Added
- 建立完整文件體系：
  - `AGENTS.md`
  - `docs/README.md`
  - `docs/ARCHITECTURE.md`
  - `docs/DEVELOPMENT.md`
  - `docs/FEATURES.md`
  - `docs/TESTING.md`
  - `docs/CHANGELOG.md`
  - `docs/plans/`
  - `docs/plans/archive/`
- 將目前實作中的後端 API、前端頁面、資料庫 schema、雙模式購物車、訂單交易流程與測試依賴整理成可維護文件
- 串接綠界 AIO 金流，新增付款單建立、`OrderResultURL` 回跳與本機 `QueryTradeInfo` 驗證流程

### Changed
- `docs/FEATURES.md` 補上功能狀態總覽，讓未來維護者可以快速判斷各模組完成度
- `docs/ARCHITECTURE.md` 的金流說明改為已實作流程，不再描述為預留整合
- `docs/DEVELOPMENT.md` 的 ECPay 環境變數說明改為實際用途

### Fixed
- 修正文件中對 ECPay 金流現況的描述，避免與程式碼實作不一致

### Removed
- 移除舊版單段式更新紀錄格式，改用 `Added / Changed / Fixed / Removed` 分類
