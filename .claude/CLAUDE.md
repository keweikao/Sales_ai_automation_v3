# Sales AI Automation V3 - Project Guidelines

所有回覆都請用繁體中文回覆

## Quick Reference

- **Format code**: `bun x ultracite fix`
- **Check for issues**: `bun x ultracite check`

---

## Documentation Management

### File Organization Rules

- **All `.md` files (except `CLAUDE.md`) must be placed in the `.doc/` directory**
- **All files MUST start with date prefix in `YYYYMMDD_` format**
- Use descriptive names in Traditional Chinese

**Good:** `.doc/20260115_Queue_Worker_Bug修復報告.md`
**Bad:** `BUG_FIX.md` (not in .doc, no date)

---

## Project Conventions

### ID 格式規範

- **案件編號格式**：`YYYYMM-IC###`（如：`202601-IC046`）
- **客戶編號格式**：`YYYYMM-######`（如：`201700-000001`）

---

## Guardrails

- **永遠不要** 在有未提交變更時部署到 production
- 部署前務必執行測試，並先部署到 staging 環境

---

## Deployment Checklist

### Web 前端部署 (apps/web)

**⚠️ 重要：確保 `.env.production` 存在且正確！**

```bash
# apps/web/.env.production 必須包含：
VITE_SERVER_URL=https://sales-ai-server.salesaiautomationv3.workers.dev
```

如果缺少此檔案，build 時會使用 `.env` 的 `localhost:3000`，導致 production 前端連接到錯誤的後端。

**部署命令：**
```bash
cd apps/web
bun run build
bunx wrangler pages deploy dist --project-name=sales-ai-web --branch=main
```

### Server 部署 (apps/server)

```bash
cd apps/server
bunx wrangler deploy
```

### Slack Bot 部署 (apps/slack-bot)

```bash
cd apps/slack-bot
bunx wrangler deploy
```

### Queue Worker 部署 (apps/queue-worker)

```bash
cd apps/queue-worker
bunx wrangler deploy
```

---

## Business Logic Principles

### 業務教練輸出原則

- **行動優先**：不要給報告，給具體行動
- **具體話術**：不要說「建議跟進」，給出「打電話說：王老闆，昨天...」

---

## 🤖 自動化 Skills 指引

Claude 會根據情境**自動判斷並調用**以下 skills，無需手動觸發：

### 程式碼品質類（開發中自動執行）

| Skill | 自動觸發時機 | 功能 |
|-------|-------------|------|
| `code-review` | 完成功能開發、修復 bug、重構後 | 程式碼審查、簡化建議、品質評分 |
| `typescript-quality` | 編輯 .ts/.tsx 檔案後 | 型別檢查、lint、最佳實踐 |
| `tdd-guard` | 修改程式碼時 | 確保有對應的測試變更 |

### 安全類（涉及敏感資料時自動執行）

| Skill | 自動觸發時機 | 功能 |
|-------|-------------|------|
| `secret-scanner` | 準備 commit、編輯設定檔時 | 掃描 API keys、密碼等敏感資訊 |
| `security-audit` | 處理用戶輸入、資料庫操作、API 端點時 | OWASP Top 10 漏洞檢測 |

### Git 流程類（版本控制時自動執行）

| Skill | 自動觸發時機 | 功能 |
|-------|-------------|------|
| `commit` | 用戶說「commit」、功能完成準備提交時 | 分析變更、產生 Conventional Commit |
| `pr-review` | 用戶說「建立 PR」、準備 merge 時 | PR 審查、風險標記、測試確認 |
| `changelog` | 發布版本、里程碑完成時 | 自動產生變更日誌 |

### 執行優先順序

當多個 skills 可能適用時，按以下優先順序執行：

```
1. secret-scanner  （安全優先，阻止敏感資訊洩漏）
2. typescript-quality  （確保程式碼可編譯）
3. tdd-guard  （確保測試覆蓋）
4. code-review  （程式碼品質審查）
5. security-audit  （深度安全檢查，視情況）
```

### 自動執行規則

1. **完成功能開發後**：自動執行 `code-review` + `typescript-quality`
2. **準備 commit 前**：自動執行 `secret-scanner` + `tdd-guard`
3. **建立 PR 前**：自動執行 `pr-review`（包含上述所有檢查）
4. **涉及用戶輸入/資料庫**：自動執行 `security-audit`

### 手動觸發

如需手動觸發，可使用 `/skill-name` 格式：

```
/code-review          # 手動執行程式碼審查
/secret-scanner       # 手動掃描敏感資訊
/security-audit       # 手動安全審計
/pr-review            # 手動 PR 審查
```

---

## 📋 完整 Skills 列表

### 開發輔助
- `/test` - 執行測試（單元、整合、E2E）
- `/code-review` - 程式碼審查與簡化
- `/typescript-quality` - TypeScript 品質檢查
- `/tdd-guard` - TDD 守護

### 安全
- `/secret-scanner` - 敏感資訊掃描
- `/security-audit` - 深度安全審計

### Git 流程
- `/commit` - 智能提交
- `/pr-review` - PR 審查
- `/changelog` - 變更日誌產生

### 部署運維
- `/smart-deploy` - 智慧部署
- `/diagnose` - 生產問題診斷
- `/worker-logs` - Workers 日誌查詢
- `/report` - 運營報告

### 業務查詢
- `/case` - 案件進度查詢
- `/opportunity` - 機會快速查詢
- `/todo-summary` - 待辦統計總覽

---

## 🧠 計畫模式 (Plan Mode)

### 何時必須進入計畫模式

修改以下類型時，**必須先規劃再執行**：

| 類型 | 原因 | 歷史教訓 |
|-----|------|---------|
| Auth/Cookie 設定 | 影響所有用戶登入 | 曾來回修改 3 次 |
| CI workflow | 影響所有 PR | 曾修復 4 次才穩定 |
| API 權限檢查 | 同樣問題會在多個 router 出現 | 3 個 router 分別修復 |
| 環境變數 | 容易遺漏部分檔案 | 測試檔案漏改 2 次 |
| Dashboard 查詢邏輯 | 需求定義容易有落差 | 曾修復 4 次 |

### 計畫模式標準流程

```
階段一：理解 (Understand)
├── 1. 確認需求範圍
├── 2. 搜尋相關程式碼 (grep 類似實作)
├── 3. 檢查是否有歷史教訓 (查下方「歷史教訓」)
└── 4. 列出所有受影響的檔案

階段二：規劃 (Plan)
├── 5. 列出具體步驟
├── 6. 標記風險點 (🔴 高 / 🟡 中 / 🟢 低)
├── 7. 設計驗證方案 (如何確認修好了)
└── 8. 請用戶確認計畫

階段三：執行 (Execute)
├── 9. 按步驟實作
├── 10. 每步完成後標記 ✅
└── 11. 遇到問題立即回到計畫模式

階段四：驗證 (Verify)
├── 12. 執行驗證方案
├── 13. 確認沒有回歸問題
└── 14. 更新 CLAUDE.md (如果學到新教訓)
```

### 計畫模式檢查清單

- [ ] 用 `grep` 搜尋所有類似程式碼
- [ ] 列出所有需要修改的檔案
- [ ] 檢查「歷史教訓」是否有相關記錄
- [ ] 設計驗證方案（怎麼確認修好了）
- [ ] 請用戶確認計畫

---

## 📜 歷史教訓 (Lessons Learned)

> 每次修正錯誤後，在此記錄以避免重蹈覆轍

### OAuth/Cookie 設定 (2026-02-01)

**正確配置：**
```typescript
// packages/auth/src/index.ts
defaultCookieAttributes: {
  sameSite: "lax",  // ✅ 不要用 "none"
  secure: true,
  httpOnly: true,
  // ❌ 不要加 partitioned: true
}
```

**修改前必須測試：**
1. [ ] 新用戶 Google 註冊
2. [ ] 已有用戶 Google 登入
3. [ ] 登入後重新整理頁面
4. [ ] 關閉瀏覽器後重開
5. [ ] 從 production URL 測試 (sales-ai-web.pages.dev)
6. [ ] 從 localhost 測試

**歷史錯誤：**
- `sameSite: "none"` → state_mismatch 錯誤
- `partitioned: true` → 登入後跳回登入頁

---

### API Router 權限檢查 (2026-01-30)

**問題模式：** env 變數在 router 中讀取失敗

**修復時必須檢查所有 router：**
```bash
grep -r "env\." packages/api/src/routers/
```

**已知受影響的 router：**
- `conversation.ts` ✅ 已修復
- `opportunity.ts` ✅ 已修復
- `sales-todo.ts` ✅ 已修復

**新增 router 時：** 參考上述已修復的寫法

---

### CI 測試環境 (2026-01-28)

**正確的 CI 測試設定：**
1. 需要先 build：`bun run build`
2. 需要啟動 server：`bun run dev &`
3. 整合測試需要在 CI 中 skip 或 mock

**修改 `.github/workflows/test.yml` 前：**
- [ ] 本地模擬 CI 環境測試
- [ ] 確認所有測試類型都能通過

---

### Dashboard 查詢邏輯 (2026-01-29)

**「分析總數」定義：** 查詢「已完成」的對話數，不是全部對話

**修改 Dashboard 相關邏輯前：**
- [ ] 確認需求定義（與 PM 確認）
- [ ] 加入對應的單元測試

---

### 測試環境變數 (2026-01-28)

**問題模式：** 環境變數名稱在不同檔案中不一致

**修改環境變數時：**
```bash
# 搜尋所有使用該變數的檔案
grep -r "VARIABLE_NAME" tests/ apps/ packages/
```

---

## 🔧 Bug 修復 SOP

### 修復前

1. **全局搜尋類似問題**
   ```bash
   # 搜尋類似的程式碼模式
   grep -r "問題關鍵字" packages/ apps/
   ```

2. **檢查歷史教訓**
   - 查看上方「歷史教訓」區塊
   - 查看 git log 是否有類似修復：`git log --oneline | grep -i "關鍵字"`

3. **列出所有需要修改的檔案**

### 修復後

1. **驗證修復**
   - 執行相關測試
   - 手動測試受影響的功能

2. **回歸測試**
   - 確認沒有破壞其他功能

3. **更新歷史教訓**
   - 如果是新類型的問題，加入「歷史教訓」區塊
   - 如果是重複問題，更新現有記錄並反思為何再次發生
