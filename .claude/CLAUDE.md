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
