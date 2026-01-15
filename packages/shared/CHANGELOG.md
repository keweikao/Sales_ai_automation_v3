# Changelog

所有重要的變更都會記錄在此文件中。

## [0.1.0-alpha.0] - 2026-01-15

### Added

- 初始版本發布
- `AppError` 錯誤處理類別,支援 11 種錯誤類型
- 錯誤工廠函數 `errors.*`
- 工具函數: `isAppError`, `formatErrorForUser`, `formatErrorForLog`
- 核心類型定義:
  - `TranscriptionMessage` - Queue 訊息類型
  - `ConversationStatus` - 對話狀態
  - `ConversationType` - 對話類型
  - `TranscriptSegment` - 轉錄片段
  - `Transcript` - 轉錄結果
  - `ConversationBase` - 對話基本結構
- TypeScript 嚴格模式配置
- 符合 Ultracite 編碼標準

### 支援的錯誤類型

- `AUDIO_TOO_LARGE` - 音檔過大
- `INVALID_AUDIO_FORMAT` - 無效的音檔格式
- `FILE_DOWNLOAD_FAILED` - 檔案下載失敗
- `TRANSCRIPTION_FAILED` - 轉錄失敗
- `TRANSCRIPTION_TIMEOUT` - 轉錄超時
- `GROQ_API_ERROR` - Groq API 錯誤
- `GEMINI_API_ERROR` - Gemini API 錯誤
- `DATABASE_ERROR` - 資料庫錯誤
- `RECORD_NOT_FOUND` - 記錄不存在
- `OPPORTUNITY_NOT_FOUND` - 商機不存在
- `UNAUTHORIZED` - 未授權

### 待完成 (Week 1 Day 3)

- 完整的 `Conversation` 類型
- MEDDIC 分析相關類型
- 更多工具模組類型定義

### 待完成 (Week 2 Day 2-3)

- Zod Schema 驗證
- 完整的 Schema 定義
