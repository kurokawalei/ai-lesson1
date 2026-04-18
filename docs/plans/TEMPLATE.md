# 開發計畫範本

> 建議檔名：`YYYY-MM-DD-<feature-name>.md`
>
> 使用方式：複製本檔，依實際功能填寫後放入 `docs/plans/`；功能完成後移至 `docs/plans/archive/`，並同步更新 `docs/FEATURES.md` 與 `docs/CHANGELOG.md`。

## 1. User Story

### 背景
- 目前使用情境：
- 問題描述：
- 需要解決的核心痛點：

### 目標
- 使用者目標：
- 業務目標：
- 成功指標：

### 範圍
- In scope：
- Out of scope：

### 影響模組
- API：
- 前端頁面：
- 資料庫：
- 測試：
- 文件：

## 2. Spec

### 功能摘要
- 功能名稱：
- 功能說明：
- 主要流程：

### API / I/O

#### Endpoint 1
- Method：
- Path：
- 認證需求：
- Request body：
- Query params：
- Response shape：
- 錯誤情境：

#### Endpoint 2
- Method：
- Path：
- 認證需求：
- Request body：
- Query params：
- Response shape：
- 錯誤情境：

### 業務規則
- 規則 1：
- 規則 2：
- 規則 3：

### 資料庫變更
- 新增 table / 欄位：
- 約束條件：
- migration / seed 需求：

### 前端行為
- 頁面互動：
- 狀態管理：
- 錯誤提示：
- 導頁規則：

### 非標準機制
- 特殊認證流程：
- 交易流程：
- 第三方整合：
- 其他特殊限制：

## 3. Tasks

### Implementation
- [ ] API / middleware / DB 實作
- [ ] 前端頁面 / script 實作
- [ ] 錯誤處理與狀態碼整理
- [ ] OpenAPI 註解更新

### Tests
- [ ] 新增或更新整合測試
- [ ] 驗證成功案例
- [ ] 驗證失敗案例
- [ ] 驗證邊界條件

### Docs
- [ ] 更新 `docs/FEATURES.md`
- [ ] 更新 `docs/ARCHITECTURE.md`
- [ ] 更新 `docs/DEVELOPMENT.md`（如有新規則）
- [ ] 更新 `docs/CHANGELOG.md`

## 4. Acceptance Criteria

- [ ] 功能行為與 Spec 一致
- [ ] API 回應格式維持 `{ data, error, message }`
- [ ] 權限與驗證條件符合設計
- [ ] 測試可穩定通過
- [ ] 文件已同步更新

## 5. Notes

### Implementation Notes
- 需要注意的技術決策：
- 已知風險：
- 依賴項：

### Archive Notes
- 完成日期：
- 合併範圍：
- 歸檔後文件位置：`docs/plans/archive/`

