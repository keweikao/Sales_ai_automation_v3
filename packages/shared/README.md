# @sales_ai_automation_v3/shared

共享類型、錯誤處理和 Schema 定義

## 版本

當前版本: **0.1.0-alpha.0**

## 安裝

此 package 為 workspace 內部使用,已自動連結。

## 使用

### 錯誤處理

```typescript
import { errors, AppError, isAppError } from '@sales_ai_automation_v3/shared/errors';

// 使用預定義錯誤
throw errors.AUDIO_TOO_LARGE(fileSizeInBytes, maxSizeInMB);

// 檢查錯誤類型
try {
  // ...
} catch (error) {
  if (isAppError(error)) {
    console.error(error.code, error.statusCode);
  }
}
```

### 類型定義

```typescript
import type { TranscriptionMessage, ConversationStatus } from '@sales_ai_automation_v3/shared/types';

const message: TranscriptionMessage = {
  conversationId: '123',
  opportunityId: '456',
  audioUrl: 'https://...',
  metadata: {
    fileName: 'call.mp3',
    fileSize: 1024000,
    format: 'mp3',
  },
};
```

## 開發

```bash
# 類型檢查
bun run typecheck

# Lint
bun run lint
```
