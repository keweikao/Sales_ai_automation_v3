/**
 * Shared Error Handling Tests
 * 測試統一錯誤處理機制
 */

import { describe, expect, it } from "vitest";
import {
  AppError,
  errors,
  formatErrorForLog,
  formatErrorForUser,
  isAppError,
} from "../../packages/shared/src/errors/index.js";

describe("Shared - Error Handling", () => {
  describe("AppError Class", () => {
    it("應該創建基本的 AppError", () => {
      const error = new AppError("UNKNOWN_ERROR", "Test error", 500);

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe("UNKNOWN_ERROR");
      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(500);
    });

    it("應該包含原始錯誤", () => {
      const originalError = new Error("Original error");
      const error = new AppError(
        "DATABASE_ERROR",
        "Database failed",
        500,
        originalError
      );

      expect(error.originalError).toBe(originalError);
    });

    it("應該包含上下文資訊", () => {
      const context = { userId: "123", action: "delete" };
      const error = new AppError(
        "UNAUTHORIZED",
        "Unauthorized action",
        401,
        undefined,
        context
      );

      expect(error.context).toEqual(context);
    });

    it("應該正確轉換為 JSON", () => {
      const error = new AppError("RECORD_NOT_FOUND", "Record not found", 404);
      const json = error.toJSON();

      expect(json.code).toBe("RECORD_NOT_FOUND");
      expect(json.message).toBe("Record not found");
      expect(json.statusCode).toBe(404);
    });
  });

  describe("Error Factories", () => {
    it("AUDIO_TOO_LARGE: 應該創建音檔過大錯誤", () => {
      const fileSize = 100 * 1024 * 1024; // 100MB
      const maxSize = 25; // 25MB
      const error = errors.AUDIO_TOO_LARGE(fileSize, maxSize);

      expect(error.code).toBe("AUDIO_TOO_LARGE");
      expect(error.statusCode).toBe(400);
      expect(error.message).toContain("100.00MB");
      expect(error.message).toContain("25MB");
      expect(error.context?.fileSize).toBe(fileSize);
      expect(error.context?.maxSize).toBe(maxSize);
    });

    it("INVALID_AUDIO_FORMAT: 應該創建不支援格式錯誤", () => {
      const format = "avi";
      const error = errors.INVALID_AUDIO_FORMAT(format);

      expect(error.code).toBe("INVALID_AUDIO_FORMAT");
      expect(error.statusCode).toBe(400);
      expect(error.message).toContain("avi");
      expect(error.message).toContain("mp3, wav, m4a, ogg");
      expect(error.context?.format).toBe(format);
    });

    it("FILE_DOWNLOAD_FAILED: 應該創建下載失敗錯誤", () => {
      const url = "https://example.com/audio.mp3";
      const originalError = new Error("Network error");
      const error = errors.FILE_DOWNLOAD_FAILED(url, originalError);

      expect(error.code).toBe("FILE_DOWNLOAD_FAILED");
      expect(error.statusCode).toBe(500);
      expect(error.originalError).toBe(originalError);
      expect(error.context?.url).toBe(url);
    });

    it("TRANSCRIPTION_FAILED: 應該創建轉錄失敗錯誤", () => {
      const error = errors.TRANSCRIPTION_FAILED();

      expect(error.code).toBe("TRANSCRIPTION_FAILED");
      expect(error.statusCode).toBe(500);
      expect(error.message).toContain("轉錄失敗");
    });

    it("TRANSCRIPTION_TIMEOUT: 應該創建轉錄超時錯誤", () => {
      const duration = 900; // 15 minutes
      const error = errors.TRANSCRIPTION_TIMEOUT(duration);

      expect(error.code).toBe("TRANSCRIPTION_TIMEOUT");
      expect(error.statusCode).toBe(504);
      expect(error.message).toContain("900秒");
      expect(error.context?.duration).toBe(duration);
    });

    it("GROQ_API_ERROR: 應該創建 Groq API 錯誤", () => {
      const error = errors.GROQ_API_ERROR();

      expect(error.code).toBe("GROQ_API_ERROR");
      expect(error.statusCode).toBe(502);
      expect(error.message).toContain("Groq API");
    });

    it("GEMINI_API_ERROR: 應該創建 Gemini API 錯誤", () => {
      const error = errors.GEMINI_API_ERROR();

      expect(error.code).toBe("GEMINI_API_ERROR");
      expect(error.statusCode).toBe(502);
      expect(error.message).toContain("Gemini API");
    });

    it("DATABASE_ERROR: 應該創建資料庫錯誤", () => {
      const operation = "insert conversation";
      const error = errors.DATABASE_ERROR(operation);

      expect(error.code).toBe("DATABASE_ERROR");
      expect(error.statusCode).toBe(500);
      expect(error.message).toContain("insert conversation");
      expect(error.context?.operation).toBe(operation);
    });

    it("RECORD_NOT_FOUND: 應該創建記錄不存在錯誤", () => {
      const recordType = "Conversation";
      const id = "conv_123";
      const error = errors.RECORD_NOT_FOUND(recordType, id);

      expect(error.code).toBe("RECORD_NOT_FOUND");
      expect(error.statusCode).toBe(404);
      expect(error.message).toContain("Conversation");
      expect(error.message).toContain("conv_123");
      expect(error.context?.recordType).toBe(recordType);
      expect(error.context?.id).toBe(id);
    });

    it("OPPORTUNITY_NOT_FOUND: 應該創建商機不存在錯誤", () => {
      const opportunityId = "opp_456";
      const error = errors.OPPORTUNITY_NOT_FOUND(opportunityId);

      expect(error.code).toBe("OPPORTUNITY_NOT_FOUND");
      expect(error.statusCode).toBe(404);
      expect(error.message).toContain("opp_456");
      expect(error.context?.opportunityId).toBe(opportunityId);
    });

    it("UNAUTHORIZED: 應該創建未授權錯誤", () => {
      const reason = "Invalid token";
      const error = errors.UNAUTHORIZED(reason);

      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.statusCode).toBe(401);
      expect(error.context?.reason).toBe(reason);
    });

    it("UNKNOWN_ERROR: 應該創建未知錯誤", () => {
      const originalError = new Error("Something went wrong");
      const error = errors.UNKNOWN_ERROR(originalError);

      expect(error.code).toBe("UNKNOWN_ERROR");
      expect(error.statusCode).toBe(500);
      expect(error.originalError).toBe(originalError);
    });
  });

  describe("Helper Functions", () => {
    it("isAppError: 應該正確識別 AppError", () => {
      const appError = errors.UNKNOWN_ERROR();
      const normalError = new Error("Normal error");

      expect(isAppError(appError)).toBe(true);
      expect(isAppError(normalError)).toBe(false);
      expect(isAppError("string")).toBe(false);
      expect(isAppError(null)).toBe(false);
    });

    it("formatErrorForUser: 應該格式化 AppError 為用戶訊息", () => {
      const error = errors.AUDIO_TOO_LARGE(100 * 1024 * 1024, 25);
      const message = formatErrorForUser(error);

      expect(message).toContain("100.00MB");
      expect(message).not.toContain("stack");
    });

    it("formatErrorForUser: 應該格式化一般 Error", () => {
      const error = new Error("Normal error");
      const message = formatErrorForUser(error);

      expect(message).toBe("Normal error");
    });

    it("formatErrorForUser: 應該格式化未知錯誤", () => {
      const message = formatErrorForUser({ unknown: "error" });

      expect(message).toBe("發生未預期的錯誤,請稍後再試");
    });

    it("formatErrorForLog: 應該格式化 AppError 為日誌", () => {
      const error = errors.DATABASE_ERROR("insert", new Error("SQL error"));
      const log = formatErrorForLog(error);

      expect(log).toContain("DATABASE_ERROR");
      expect(log).toContain("insert");
      expect(log).toContain("SQL error");
    });

    it("formatErrorForLog: 應該格式化一般 Error 為日誌", () => {
      const error = new Error("Test error");
      error.stack = "Error stack trace";
      const log = formatErrorForLog(error);

      expect(log).toContain("Error:");
      expect(log).toContain("Test error");
      expect(log).toContain("Error stack trace");
    });

    it("formatErrorForLog: 應該格式化未知錯誤為日誌", () => {
      const log = formatErrorForLog({ weird: "object" });

      expect(log).toContain("Unknown error:");
      expect(log).toContain('"weird"');
    });
  });
});
