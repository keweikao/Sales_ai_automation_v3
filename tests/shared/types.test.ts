/**
 * Shared Types Tests
 * 測試統一類型定義的正確性
 */

import { describe, expect, it } from "vitest";
import type {
  ConversationStatus,
  ConversationType,
  MeddicScores,
  OpportunityStage,
  QualificationStatus,
  TranscriptSegment,
} from "../../packages/shared/src/types/index.js";

describe("Shared - Type Definitions", () => {
  describe("Conversation Types", () => {
    it("ConversationStatus: 應該接受有效的狀態值", () => {
      const validStatuses: ConversationStatus[] = [
        "pending",
        "transcribing",
        "transcribed",
        "analyzing",
        "completed",
        "failed",
      ];

      validStatuses.forEach((status) => {
        expect(status).toBeDefined();
      });
    });

    it("ConversationType: 應該接受有效的類型值", () => {
      const validTypes: ConversationType[] = [
        "discovery_call",
        "demo",
        "negotiation",
        "follow_up",
        "closing",
        "support",
        "other",
      ];

      validTypes.forEach((type) => {
        expect(type).toBeDefined();
      });
    });
  });

  describe("Transcription Types", () => {
    it("TranscriptSegment: 應該包含必要欄位", () => {
      const segment: TranscriptSegment = {
        speaker: "Sales Rep",
        text: "Hello, how can I help you?",
        start: 0,
        end: 2.5,
        confidence: 0.95,
      };

      expect(segment.speaker).toBe("Sales Rep");
      expect(segment.text).toBe("Hello, how can I help you?");
      expect(segment.start).toBe(0);
      expect(segment.end).toBe(2.5);
      expect(segment.confidence).toBe(0.95);
    });

    it("TranscriptSegment: confidence 應該是可選的", () => {
      const segmentWithoutConfidence: TranscriptSegment = {
        speaker: "Customer",
        text: "I need help with pricing",
        start: 2.5,
        end: 5.0,
      };

      expect(segmentWithoutConfidence.confidence).toBeUndefined();
    });
  });

  describe("MEDDIC Types", () => {
    it("MeddicScores: 應該包含所有六個維度", () => {
      const scores: MeddicScores = {
        metrics: 80,
        economicBuyer: 70,
        decisionCriteria: 85,
        decisionProcess: 75,
        identifyPain: 90,
        champion: 65,
      };

      expect(scores.metrics).toBe(80);
      expect(scores.economicBuyer).toBe(70);
      expect(scores.decisionCriteria).toBe(85);
      expect(scores.decisionProcess).toBe(75);
      expect(scores.identifyPain).toBe(90);
      expect(scores.champion).toBe(65);
    });

    it("MeddicScores: 分數應該在 1-100 範圍內", () => {
      const scores: MeddicScores = {
        metrics: 100,
        economicBuyer: 1,
        decisionCriteria: 50,
        decisionProcess: 75,
        identifyPain: 90,
        champion: 25,
      };

      Object.values(scores).forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(1);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it("QualificationStatus: 應該接受有效的資格狀態", () => {
      const validStatuses: QualificationStatus[] = [
        "qualified",
        "partially-qualified",
        "unqualified",
        "needs-nurturing",
        "Strong",
        "Medium",
        "Weak",
        "At Risk",
      ];

      validStatuses.forEach((status) => {
        expect(status).toBeDefined();
      });
    });
  });

  describe("Opportunity Types", () => {
    it("OpportunityStage: 應該接受有效的階段值", () => {
      const validStages: OpportunityStage[] = [
        "lead",
        "qualified",
        "proposal",
        "negotiation",
        "closed_won",
        "closed_lost",
      ];

      validStages.forEach((stage) => {
        expect(stage).toBeDefined();
      });
    });
  });

  describe("Type Compatibility", () => {
    it("應該支持類型窄化", () => {
      const status: ConversationStatus = "completed";

      if (status === "completed" || status === "failed") {
        expect(["completed", "failed"]).toContain(status);
      }
    });

    it("應該支持聯合類型", () => {
      type ProcessingStatus = "transcribing" | "analyzing";
      const status: ProcessingStatus = "transcribing";

      const isProcessing = (s: ConversationStatus): s is ProcessingStatus => {
        return s === "transcribing" || s === "analyzing";
      };

      expect(isProcessing(status)).toBe(true);
      expect(isProcessing("completed")).toBe(false);
    });
  });
});
