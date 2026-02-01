---
name: recurring-issues
description: 自動偵測重複修復的議題模式，分析 git commit 歷史找出曾多次修復的問題，並自動更新 CLAUDE.md 的歷史教訓。適用於：修復 bug 後、每週定期檢查、用戶要求分析重複問題時。
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash(git log*)
  - Bash(git show*)
  - Bash(git diff*)
  - Edit
---

# Recurring Issues - 重複修復議題偵測

## 自動觸發時機

Claude 會在以下情況**自動執行**此 skill：

| 觸發情境 | 說明 |
|---------|------|
| 修復 Bug 後 | 當 commit message 包含 `fix:` 時，檢查是否為重複問題 |
| 用戶要求 | 用戶說「檢查重複修復」、「分析 bug 歷史」、「recurring issues」 |
| 定期檢查 | 可由用戶手動觸發進行全面分析 |
| PR Review 前 | 在 PR Review 時檢查是否有類似歷史問題 |

## 偵測邏輯

### 重複修復的定義

以下情況視為「重複修復」：

1. **相同檔案多次 fix commit**
   - 同一個檔案在短期內（30 天）有 2+ 次 fix commit

2. **相似關鍵字多次出現**
   - 相同關鍵字（如 `權限`、`session`、`cookie`）在 fix commit 中出現 2+ 次

3. **來回修改**
   - 同一個設定/屬性被改回先前的值

4. **同類問題在不同檔案**
   - 相同的問題模式在多個檔案分別修復（如多個 router 的權限問題）

## 執行流程

### 步驟 1: 收集 Fix Commits

```bash
# 取得最近 200 個 fix 類型的 commit
git log --oneline -200 | grep -iE "^[a-f0-9]+ fix"
```

### 步驟 2: 分類分析

對每個 fix commit 進行分類：

```bash
# 查看 commit 影響的檔案
git show --stat [commit-hash] --format=""

# 查看 commit 的詳細內容
git show [commit-hash]
```

### 步驟 3: 識別重複模式

檢查以下模式：

| 模式 | 檢測方法 |
|-----|---------|
| 相同檔案 | 統計每個檔案的 fix commit 次數 |
| 相似關鍵字 | 從 commit message 提取關鍵字，統計出現次數 |
| 來回修改 | 比較同檔案的 diff，檢查是否改回原值 |
| 同類問題 | 分析 commit message 的相似度 |

### 步驟 4: 產生報告

```markdown
## 重複修復議題報告

### 統計摘要
- 分析期間: [日期範圍]
- Fix commits 總數: X
- 識別到的重複模式: Y

### 重複修復議題

#### 1. [議題名稱] (修復 N 次)

| Commit | 日期 | 說明 |
|--------|-----|------|
| abc123 | 2026-01-28 | fix: ... |
| def456 | 2026-01-29 | fix: ... |

**根本原因分析**:
- [原因 1]
- [原因 2]

**建議措施**:
- [措施 1]
- [措施 2]
```

### 步驟 5: 更新 CLAUDE.md

如果發現新的重複模式：

1. 檢查 CLAUDE.md 的「歷史教訓」區塊是否已有記錄
2. 如果沒有，自動新增歷史教訓條目
3. 如果已有，更新修復次數

## 關鍵字分類表

用於識別問題類型：

| 類別 | 關鍵字 |
|-----|-------|
| 認證授權 | auth, login, session, cookie, token, 登入, 權限 |
| 資料查詢 | query, dashboard, 分析, 報告, 統計 |
| CI/CD | ci, test, workflow, build, deploy |
| 環境設定 | env, config, 環境變數, 設定 |
| 前端 | render, component, error, null, undefined |
| API | router, endpoint, api, 500, internal |

## 輸出格式

### 快速摘要（自動觸發時）

```markdown
## 🔄 重複修復偵測

檢測到此次修復可能與以下歷史問題相關：

| 議題 | 歷史修復次數 | 相關 Commits |
|-----|-------------|-------------|
| [議題名稱] | N 次 | abc123, def456 |

### ⚠️ 建議

1. 請查看 CLAUDE.md 的「歷史教訓」區塊
2. 確認是否為根本原因修復
3. 考慮是否需要更新歷史教訓
```

### 完整報告（手動觸發時）

```markdown
## 📊 重複修復議題完整報告

### 總覽

| 指標 | 數值 |
|-----|------|
| 分析 commits | 200 |
| Fix commits | X |
| 重複模式 | Y |
| 影響檔案 | Z |

### 詳細分析

[按照嚴重程度排序的議題列表]

### 建議行動

1. [ ] 優先處理修復次數最多的議題
2. [ ] 更新 CLAUDE.md 歷史教訓
3. [ ] 考慮增加自動化測試
```

## 整合的工具

| 工具 | 用途 |
|------|------|
| `Bash(git log)` | 取得 commit 歷史 |
| `Bash(git show)` | 查看 commit 詳細內容 |
| `Bash(git diff)` | 比較變更內容 |
| `Read` | 讀取 CLAUDE.md |
| `Edit` | 更新 CLAUDE.md |
| `Grep` | 搜尋程式碼模式 |

## 專案特定規則

### 此專案已知的重複問題類型

根據歷史分析，以下類型需要特別注意：

1. **Auth/Cookie 設定** - 曾來回修改 3 次
2. **CI workflow** - 曾修復 4 次才穩定
3. **API 權限檢查** - 3 個 router 分別修復
4. **Dashboard 查詢** - 曾修復 4 次
5. **報告權限** - 多次出現權限不足錯誤
6. **前端 null check** - Internal Error 多次出現

### 自動更新 CLAUDE.md 的條件

當滿足以下條件時，自動更新歷史教訓：

1. 同一類型問題修復 **2 次以上**
2. CLAUDE.md 中**尚未記錄**該類型
3. 可以明確識別**根本原因**

## 相關 Skills

- `/code-review` - 在 review 時檢查是否為重複問題
- `/commit` - 在 commit 時提醒檢查歷史教訓
- `/pr-review` - PR review 時分析是否有重複模式
